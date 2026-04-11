import Phaser from 'phaser'
import { useStaffStore } from '../../stores/modules/staffStore'
import { useShopStore } from '../../stores/modules/shopStore'
import { WORKERS, SPEED_TO_MS } from '../../config/workerData'
import { DEPTH } from '../../config/renderConfigs'
import type MainScene from '../MainScene'

/**
 * StaffManager: Quản lý nhân viên phục vụ trong cửa hàng.
 * Chịu trách nhiệm hiển thị Sprite, di chuyển và thực hiện công việc (Thu ngân/Xếp hàng).
 */
export class StaffManager {
  private staffSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map()
  private staffTimers: Map<string, number> = new Map()
  private scene: MainScene

  /**
   * Khởi tạo StaffManager.
   * @param scene Instance của MainScene (Dependency Injection).
   */
  constructor(scene: MainScene) {
    this.scene = scene
  }

  /**
   * Cập nhật logic nhân viên mỗi frame.
   */
  update(time: number, _delta: number) {
    const staffStore = useStaffStore()
    const shopStore = useShopStore()

    // 1. Đồng bộ số lượng Sprite với hiredWorkers trong store
    this.syncSprites(staffStore.hiredWorkers)

    // 2. Cập nhật vị trí và thực hiện nhiệm vụ
    staffStore.hiredWorkers.forEach(worker => {
      const sprite = this.staffSprites.get(worker.instanceId)
      if (!sprite) return

      const workerData = WORKERS.find(w => w.id === worker.workerId)
      if (!workerData) return

      if (worker.duty === 'CASHIER') {
        const cashier = Object.values(shopStore.placedCashiers)[0] // Lấy cashier đầu tiên
        if (cashier) {
          // Di chuyển đến vị trí làm việc
          const targetX = cashier.x
          const targetY = cashier.y - 40
          this.moveTo(sprite, targetX, targetY)

          // Auto-serve logic
          if (staffStore.waitingCustomers > 0) {
            let lastServe = this.staffTimers.get(worker.instanceId) || 0
            const interval = SPEED_TO_MS[workerData.checkoutSpeed]
            if (time > lastServe + interval) {
              staffStore.serveCustomer()
              this.staffTimers.set(worker.instanceId, time)
            }
          }
        }
      } else if (worker.duty === 'STOCKER') {
        // Tương lai: Tìm kiện hàng và xếp lên kệ
        this.moveTo(sprite, 1200, 1100) // Nghỉ chân tạm thời
      } else {
        // Nghỉ ngơi: Di chuyển ra góc shop
        this.moveTo(sprite, 1300, 1000)
      }
    })
  }

  /**
   * Đồng bộ hóa Sprites nhân viên. Thêm mới nếu chưa có, xóa nếu đã sa thải.
   */
  private syncSprites(hiredWorkers: any[]) {
    // Xóa sprite của nhân viên không còn trong danh sách
    const currentIds = hiredWorkers.map(w => w.instanceId)
    for (const [id, sprite] of this.staffSprites.entries()) {
      if (!currentIds.includes(id)) {
        sprite.destroy()
        this.staffSprites.delete(id)
        this.staffTimers.delete(id)
      }
    }

    // Thêm sprite mới
    hiredWorkers.forEach(worker => {
      if (!this.staffSprites.has(worker.instanceId)) {
        const sprite = this.scene.physics.add.sprite(1100, 1100, 'player')
        if (sprite) {
          sprite.setDepth(DEPTH.NPC)
          sprite.setTint(0x99ff99) // Nhuộm màu xanh lá để phân biệt nhân viên
          this.staffSprites.set(worker.instanceId, sprite)
        }
      }
    })
  }

  /**
   * Di chuyển nhân viên đến một vị trí cụ thể.
   */
  private moveTo(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number) {
    const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, x, y)
    if (dist < 5) {
      sprite.setVelocity(0)
      sprite.anims.stop()
      return
    }

    const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, x, y)
    const speed = 120
    sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)

    // Cập nhật animation hướng di chuyển
    const vx = sprite.body!.velocity.x
    const vy = sprite.body!.velocity.y
    if (Math.abs(vx) > Math.abs(vy)) {
      sprite.play(vx > 0 ? 'player-right' : 'player-left', true)
    } else {
      sprite.play(vy > 0 ? 'player-down' : 'player-up', true)
    }
  }
}
