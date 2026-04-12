import Phaser from 'phaser'
import { DEPTH } from '../../config/renderConfigs'
import { useStaffStore } from '../../stores/modules/staffStore'
import { useGameStore } from '../../stores/gameStore'
import type { WorkerDuty } from '../../types/gameTypes'
import { EnvironmentManager } from './EnvironmentManager'

interface WorkerNPC {
  instanceId: string
  sprite: Phaser.Physics.Arcade.Sprite
  statusText: Phaser.GameObjects.Text
  targetX: number
  targetY: number
  state: WorkerDuty
}

/**
 * StaffManager - Hệ thống quản lý Nhân viên (Staff) trong Phaser.
 * 
 * Chức năng chính:
 * - Đồng bộ hóa danh sách nhân viên từ `staffStore` vào thế giới game.
 * - Quản lý hiển thị Sprite và Label trạng thái của nhân viên.
 * - Điều khiển AI di chuyển dựa trên nhiệm vụ (Duty) được phân công:
 *   + CASHIER: Di chuyển tới quầy thu ngân để phục vụ.
 *   + STOCKER: Đi dạo và kiểm tra kệ hàng trong shop.
 *   + NONE: Nghỉ ngơi tại khu vực vỉa hè phía trước.
 * 
 * Luồng hoạt động:
 * 1. syncWorkers(): Luôn đảm bảo Sprite nhân viên khớp với dữ liệu thuê trong Store.
 * 2. updateWorkerTarget(): Tự động xác định tọa độ đích (X, Y) khi thay đổi nhiệm vụ.
 * 3. update(): Chia làm 2 tầng:
 *    - Cập nhật Visual (Label/Animation) mỗi frame (60fps) để mượt mà.
 *    - Cập nhật AI Logic mỗi 100ms để tiết kiệm hiệu năng.
 */
export class StaffManager {
  private scene: Phaser.Scene
  /** Map lưu trữ instance nhân viên theo instanceId */
  private workers: Map<string, WorkerNPC> = new Map()
  private workerSpeed = 80
  private lastUpdate = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Đồng bộ hóa nhân viên từ Store vào Scene.
   * - Tạo mới Sprite nếu chưa có.
   * - Xóa Sprite nếu nhân viên bị sa thải.
   * - Cập nhật Duty và Dest nếu Store thay đổi.
   */
  public syncWorkers() {
    const staffStore = useStaffStore()
    const hiredIds = new Set(staffStore.hiredWorkers.map(w => w.instanceId))

    // 1. Kiểm tra dọn dẹp: Xóa nhân viên đã bị sa thải khỏi Scene
    for (const [instanceId, worker] of this.workers.entries()) {
      if (!hiredIds.has(instanceId)) {
        worker.sprite.destroy()
        worker.statusText.destroy()
        this.workers.delete(instanceId)
        console.log(`[StaffManager] Removed worker ${instanceId}`)
      }
    }

    // 2. Kiểm tra cập nhật/thêm mới: Đảm bảo mọi nhân viên đã thuê đều có Sprite
    staffStore.hiredWorkers.forEach(w => {
      let worker = this.workers.get(w.instanceId)
      
      if (!worker) {
        // Khởi tạo Nhân viên mới (Mặc định xuất hiện tại vị trí START_X)
        const doorPos = EnvironmentManager.START_X + 200 // Default location
        const sprite = this.scene.physics.add.sprite(doorPos, EnvironmentManager.START_Y + 500, 'npc') // Dùng texture 'npc' cho nhân viên
        sprite.setDepth(DEPTH.NPC).setTint(0xaaaaff) // Màu Tint xanh nhạt để phân biệt với khách hàng

        // Tạo Label trạng thái (Cyan text)
        const statusText = this.scene.add.text(sprite.x, sprite.y - 35, '', {
            fontSize: '10px',
            color: '#00ffff'
        }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT)

        worker = {
          instanceId: w.instanceId,
          sprite,
          statusText,
          targetX: sprite.x,
          targetY: sprite.y,
          state: w.duty
        }
        this.workers.set(w.instanceId, worker)
      }

      // 3. Cập nhật trạng thái và đích đến nếu duty thay đổi (Duty Change)
      if (worker.state !== w.duty) {
        worker.state = w.duty
        this.updateWorkerTarget(worker)
      }
    })
  }

  /**
   * Xác định tọa độ mục tiêu (Target) trong Shop dựa trên Duty của nhân viên.
   */
  private updateWorkerTarget(worker: WorkerNPC) {
    const gameStore = useGameStore()
    const startX = EnvironmentManager.START_X
    const startY = EnvironmentManager.START_Y

    switch (worker.state) {
      case 'CASHIER': {
        // Di chuyển tới sau quầy thu ngân số 1
        const cashiers = Object.values(gameStore.placedCashiers)
        if (cashiers.length > 0) {
          const desk = cashiers[0]
          worker.targetX = desk.x
          worker.targetY = desk.y - 40 // Đứng phía sau quầy (phía trên desk)
        }
        break
      }
      case 'STOCKER': {
        // Di chuyển ngẫu nhiên trong phạm vi Shop
        worker.targetX = startX + 50 + Math.random() * 300
        worker.targetY = startY + 50 + Math.random() * 300
        break
      }
      case 'NONE': {
        // Di chuyển ra khu vực vỉa hè (Resting area)
        worker.targetX = startX + 50 + Math.random() * 100
        worker.targetY = startY + 450 // Phía dưới shop
        break
      }
    }
  }

  /**
   * Cập nhật logic nhân viên mỗi frame.
   * CHÚ Ý: Logic hiển thị (Visuals) phải chạy 60fps, AI Logic có thể chạy chậm hơn.
   */
  public update(time: number) {
    // TỪNG FRAME: Cập nhật vị trí Label theo Sprite để không bị giật (Jittery)
    this.workers.forEach(worker => {
      this.updateVisuals(worker)
    })

    // MỖI 100MS: Tính toán pathfinding và logic AI di chuyển
    if (time > this.lastUpdate + 100) {
      this.lastUpdate = time
      this.workers.forEach(worker => {
        this.handleAI(worker)
      })
    }
  }

  /**
   * Xử lý di chuyển vật lý của nhân viên
   */
  private handleAI(worker: WorkerNPC) {
    const dist = Phaser.Math.Distance.Between(worker.sprite.x, worker.sprite.y, worker.targetX, worker.targetY)
    
    if (dist > 10) {
      this.scene.physics.moveTo(worker.sprite, worker.targetX, worker.targetY, this.workerSpeed)
    } else {
      worker.sprite.body?.velocity.set(0)
      
      // Nếu là Stocker, khi tới đích sẽ tự động chọn một điểm mới để đi tiếp
      if (worker.state === 'STOCKER' && Math.random() < 0.05) {
        this.updateWorkerTarget(worker)
      }
    }
  }

  /**
   * Cập nhật diện mạo nhân viên (Text Label & Hướng Animation)
   */
  private updateVisuals(worker: WorkerNPC) {
    worker.statusText.setPosition(worker.sprite.x, worker.sprite.y - 35)
    
    let label = ''
    switch (worker.state) {
      case 'CASHIER': label = 'Working (Cashier)'; break
      case 'STOCKER': label = 'Working (Shelving)'; break
      case 'NONE': label = 'Resting'; break
    }
    worker.statusText.setText(label)

    // Xác định hướng Animation dựa trên vector vận tốc x, y
    const anims = worker.sprite.anims
    const vx = worker.sprite.body?.velocity.x || 0
    const vy = worker.sprite.body?.velocity.y || 0

    if (Math.abs(vx) > Math.abs(vy)) {
        if (vx < -10) anims.play('npc-left', true)
        else if (vx > 10) anims.play('npc-right', true)
    } else {
        if (vy < -10) anims.play('npc-up', true)
        else if (vy > 10) anims.play('npc-down', true)
    }
    
    // Nếu đứng yên thì dừng animation
    if (Math.abs(vx) < 10 && Math.abs(vy) < 10) {
        anims.stop()
    }
  }
}
