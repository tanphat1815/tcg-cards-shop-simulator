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
 * StaffManager - Quản lý nhân viên (Staff) trong thế giới Phaser.
 * Xử lý việc hiển thị, di chuyển và AI cơ bản của nhân viên.
 */
export class StaffManager {
  private scene: Phaser.Scene
  private workers: Map<string, WorkerNPC> = new Map()
  private workerSpeed = 80
  private lastUpdate = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Đồng bộ hóa nhân viên từ Store vào Scene
   */
  public syncWorkers() {
    const staffStore = useStaffStore()
    const hiredIds = new Set(staffStore.hiredWorkers.map(w => w.instanceId))

    // 1. Xóa nhân viên đã bị sa thải
    for (const [instanceId, worker] of this.workers.entries()) {
      if (!hiredIds.has(instanceId)) {
        worker.sprite.destroy()
        worker.statusText.destroy()
        this.workers.delete(instanceId)
        console.log(`[StaffManager] Removed worker ${instanceId}`)
      }
    }

    // 2. Thêm hoặc cập nhật nhân viên hiện có
    staffStore.hiredWorkers.forEach(w => {
      let worker = this.workers.get(w.instanceId)
      
      if (!worker) {
        // Tạo mới sprite nhân viên
        const doorPos = EnvironmentManager.START_X + 200 // Default location
        const sprite = this.scene.physics.add.sprite(doorPos, EnvironmentManager.START_Y + 500, 'npc') // Dùng texture 'npc' cho nhân viên
        sprite.setDepth(DEPTH.NPC).setTint(0xaaaaff) // Tint màu xanh nhạt để phân biệt với khách

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
        console.log(`[StaffManager] Spawned worker ${w.instanceId}`)
      }

      // Cập nhật trạng thái và đích đến nếu duty thay đổi
      if (worker.state !== w.duty) {
        worker.state = w.duty
        this.updateWorkerTarget(worker)
      }
    })
  }

  /**
   * Cập nhật đích đến của nhân viên dựa trên nhiệm vụ
   */
  private updateWorkerTarget(worker: WorkerNPC) {
    const gameStore = useGameStore()
    const startX = EnvironmentManager.START_X
    const startY = EnvironmentManager.START_Y

    switch (worker.state) {
      case 'CASHIER': {
        const cashiers = Object.values(gameStore.placedCashiers)
        if (cashiers.length > 0) {
          const desk = cashiers[0]
          worker.targetX = desk.x
          worker.targetY = desk.y - 40 // Đứng phía sau quầy (phía trên desk)
        }
        break
      }
      case 'STOCKER': {
        // Đích ngẫu nhiên trong shop
        worker.targetX = startX + 50 + Math.random() * 300
        worker.targetY = startY + 50 + Math.random() * 300
        break
      }
      case 'NONE': {
        // Đứng nghỉ ngoài vỉa hè
        worker.targetX = startX + 50 + Math.random() * 100
        worker.targetY = startY + 450 // Phía dưới shop
        break
      }
    }
  }

  /**
   * Cập nhật logic nhân viên mỗi frame
   */
  public update(time: number) {
    // 1. Cập nhật vị trí chữ và animation mỗi frame (mượt mà)
    this.workers.forEach(worker => {
      this.updateVisuals(worker)
    })

    // 2. Cập nhật AI logic mỗi 100ms (tiết kiệm CPU)
    if (time > this.lastUpdate + 100) {
      this.lastUpdate = time
      this.workers.forEach(worker => {
        this.handleAI(worker)
      })
    }
  }

  /**
   * AI di chuyển và hành vi
   */
  private handleAI(worker: WorkerNPC) {
    const dist = Phaser.Math.Distance.Between(worker.sprite.x, worker.sprite.y, worker.targetX, worker.targetY)
    
    if (dist > 10) {
      this.scene.physics.moveTo(worker.sprite, worker.targetX, worker.targetY, this.workerSpeed)
    } else {
      worker.sprite.body?.velocity.set(0)
      
      // Nếu đang đi dạo (STOCKER), thỉnh thoảng đổi hướng
      if (worker.state === 'STOCKER' && Math.random() < 0.05) {
        this.updateWorkerTarget(worker)
      }
    }
  }

  /**
   * Cập nhật text trạng thái và animation
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

    // Animation
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
    
    if (Math.abs(vx) < 10 && Math.abs(vy) < 10) {
        anims.stop()
    }
  }
}
