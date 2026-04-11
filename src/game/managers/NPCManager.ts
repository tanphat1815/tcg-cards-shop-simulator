import Phaser from 'phaser'
import { DEPTH } from '../../config/renderConfigs'
import { useGameStore } from '../../stores/gameStore'
import { useShopStore } from '../../stores/modules/shopStore'
import type { NPCState, Customer } from '../../types/gameTypes'
import type { EnvironmentManager } from './EnvironmentManager'

/**
 * NPCManager - Quản lý logic AI và hành vi của khách hàng (NPC)
 */
export class NPCManager {
  private scene: Phaser.Scene
  private environmentManager: EnvironmentManager
  private customers: Customer[] = []
  private npcSpeed = 100
  private stuckCheckInterval = 500 // ms
  private decisionInterval = 1500 // ms
  private boredomThreshold = 45000 // ms (45 seconds)

  constructor(
    scene: Phaser.Scene,
    environmentManager: EnvironmentManager
  ) {
    this.scene = scene
    this.environmentManager = environmentManager
  }

  /**
   * Cập nhật logic NPC gọi mỗi frame
   */
  public update() {
    this.updateNPCs(this.scene.time.now)
  }

  /**
   * Lấy số lượng NPC hiện tại
   */
  public getNPCCount(): number {
    return this.customers.length
  }

  /**
   * Xóa sạch toàn bộ NPC (dùng khi kết thúc ngày)
   */
  public cleanupAllNPCs() {
    this.customers.forEach(c => {
      if (c.statusText) c.statusText.destroy()
      c.sprite.destroy()
    })
    this.customers = []
  }

  /**
   * Khởi tạo NPC spawn system
   */
  initializeNPCs() {
    this.scene.time.addEvent({
      delay: 3000,
      callback: () => this.spawnNPC(),
      loop: true
    })
  }

  /**
   * Spawn một NPC mới
   */
  public spawnNPC() {
    const gameStore = useGameStore()
    if (gameStore.shopState !== 'OPEN') return
    if (this.customers.length >= 10) return

    const doorLocation = this.environmentManager.getDoorLocation()
    const npcSprite = this.scene.physics.add.sprite(doorLocation.x, doorLocation.y + 50, 'npc')
    npcSprite.setCollideWorldBounds(true).setDepth(DEPTH.NPC)

    // 30% khách muốn chơi, 70% muốn mua hàng
    const isPlayer = Math.random() < 0.3

    const instanceId = `npc_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const newCust: Customer = {
      sprite: npcSprite,
      state: 'SPAWN' as NPCState,
      timer: this.scene.time.now + 500,
      targetX: doorLocation.x,
      targetY: doorLocation.y - 40,
      targetPrice: 0,
      intent: isPlayer ? 'PLAY' : 'BUY',
      spawnTime: this.scene.time.now,
      lastDecisionTime: this.scene.time.now,
      lastMoveAttemptTime: this.scene.time.now,
      instanceId,
      checkedShelfIds: [],
      searchStartTime: this.scene.time.now
    }

    newCust.statusText = this.scene.add.text(npcSprite.x, npcSprite.y - 35, '...', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT).setVisible(true)

    console.log(`[SPAWN] NPC ${instanceId} spawned with intent: ${newCust.intent}`)
    this.customers.push(newCust)
  }

  /**
   * Update tất cả NPC mỗi frame
   * @param time Current game time in milliseconds
   */
  updateNPCs(time: number) {
    const shopStore = useShopStore()
    
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const customer = this.customers[i]
      const sprite = customer.sprite

      // Cập nhật animation và status text
      this.updateNPCAnimation(customer)
      this.updateStatusText(customer, time)
      this.handleStuckRecovery(customer, time)

      // Kiểm tra nếu NPC đang đợi thanh toán mà không còn trong hàng chờ của Store (đã được thanh toán)
      if (customer.state === 'WAITING' || customer.state === 'GO_CASHIER') {
        const isInQueue = shopStore.waitingQueue.some(item => item.instanceId === customer.instanceId)
        if (!isInQueue) {
          console.log(`[CHECKOUT] NPC ${customer.instanceId} served. Leaving now.`)
          this.npcLeaveShop(customer)
          continue
        }
      }

      // Thực hiện AI state machine
      this.handleNPCState(customer, time)

      // Cleanup NPC đã rời đi quá lâu (dự phòng)
      if (customer.state === 'LEAVE' && time - (customer.timer || 0) > 15000) {
        if (customer.statusText) customer.statusText.destroy()
        sprite.destroy()
        this.customers.splice(i, 1)
      }
    }
  }

  private updateNPCAnimation(customer: Customer) {
    const sprite = customer.sprite
    if (sprite.body && sprite.body.velocity.lengthSq() > 0) {
      const vx = sprite.body.velocity.x
      const vy = sprite.body.velocity.y
      if (Math.abs(vx) > Math.abs(vy)) {
        sprite.anims.play(vx < 0 ? 'npc-left' : 'npc-right', true)
      } else {
        sprite.anims.play(vy < 0 ? 'npc-up' : 'npc-down', true)
      }
    } else {
      sprite.anims.stop()
    }
  }

  private updateStatusText(customer: Customer, time: number) {
    if (!customer.statusText) return
    customer.statusText.setPosition(customer.sprite.x, customer.sprite.y - 35)

    let label = '...'
    switch (customer.state) {
      case 'SPAWN': label = 'Entering...'; break;
      case 'WANDER': label = customer.intent === 'PLAY' ? '🔍 Seeking Table' : '🔍 Seeking Cards'; break;
      case 'SEEK_ITEM': label = '📦 Going to shelf'; break;
      case 'INTERACT': label = '🛒 Picking items'; break;
      case 'GO_CASHIER': label = '🛒 To Cashier'; break;
      case 'WAITING': label = '⌛ Waiting in line'; break;
      case 'SEEK_TABLE': label = '🃏 Going to table'; break;
      case 'PLAYING': {
        const store = useGameStore()
        const table = customer.assignedTableId ? store.placedTables[customer.assignedTableId] : null
        label = (table && table.matchStartedAt) ? '🃏 Playing match' : '⌛ Waiting for Opponent';
        break;
      }
      case 'LEAVE': label = (time - customer.spawnTime > 40000) ? '😒 Bored - Leaving' : '👋 Leaving'; break;
    }
    customer.statusText.setText(label)
  }

  private handleStuckRecovery(customer: Customer, time: number) {
    const moveStates: NPCState[] = ['WANDER', 'SEEK_ITEM', 'SEEK_TABLE', 'GO_CASHIER', 'LEAVE']
    if (!moveStates.includes(customer.state)) return

    if (time > (customer.lastMoveAttemptTime || 0) + this.stuckCheckInterval) {
      customer.lastMoveAttemptTime = time
      const dist = Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.targetX, customer.targetY)
      const isStuck = customer.sprite.body && customer.sprite.body.velocity.lengthSq() < 100

      if (dist > 15 && isStuck) {
        this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
      }
    }
  }

  private handleNPCState(customer: Customer, time: number) {
    switch (customer.state) {
      case 'SPAWN': this.handleSpawn(customer, time); break;
      case 'WANDER': this.handleWander(customer, time); break;
      case 'WANT_TO_PLAY': this.handleWantToPlay(customer, time); break;
      case 'SEEK_TABLE': this.handleSeekTable(customer); break;
      case 'PLAYING': this.handlePlaying(customer, time); break;
      case 'SEEK_ITEM': this.handleSeekItem(customer, time); break;
      case 'INTERACT': this.handleInteract(customer, time); break;
      case 'GO_CASHIER': this.handleGoCashier(customer); break;
      case 'WAITING': this.handleWaiting(customer); break;
      case 'LEAVE': this.handleLeave(customer); break;
    }
  }

  private handleSpawn(customer: Customer, time: number) {
    if (time > customer.timer) {
      customer.state = customer.intent === 'PLAY' ? 'WANT_TO_PLAY' : 'WANDER'
      const shopBounds = this.environmentManager.getShopBounds()
      customer.targetX = Phaser.Math.Between(shopBounds.x + 50, shopBounds.x + shopBounds.w - 50)
      customer.targetY = Phaser.Math.Between(shopBounds.y + 50, shopBounds.y + shopBounds.h - 50)
      this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
    }
  }

  private handleWantToPlay(customer: Customer, time: number) {
    const store = useGameStore()
    const tables = Object.values(store.placedTables)
    let bestTableId = null

    for (const table of tables) {
      if (table.occupants && table.occupants.includes(null)) {
        bestTableId = table.id
        break
      }
    }

    if (bestTableId) {
      const seatIndex = store.joinTable(bestTableId, customer.instanceId)
      if (seatIndex !== null) {
        customer.state = 'SEEK_TABLE'
        customer.assignedTableId = bestTableId
        customer.seatIndex = seatIndex
        const table = store.placedTables[bestTableId]
        customer.targetX = seatIndex === 0 ? table.x - 22 : table.x + 22
        customer.targetY = table.y
        this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
      }
    } else {
      const searchTime = time - (customer.searchStartTime || 0)
      if (searchTime > 10000 || Math.random() < 0.2) {
        customer.intent = 'BUY'
        customer.checkedShelfIds = []
        customer.state = 'WANDER'
        customer.searchStartTime = time
      } else {
        customer.state = 'WANDER'
      }
    }
  }

  private handleSeekTable(customer: Customer) {
    const dist = Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.targetX, customer.targetY)
    if (dist < 12) {
      customer.sprite.body!.velocity.set(0)
      customer.state = 'PLAYING'
      customer.timer = 0
    }
  }

  private handlePlaying(customer: Customer, time: number) {
    const gStore = useGameStore()
    const myTable = gStore.placedTables[customer.assignedTableId!]
    if (!myTable) { customer.state = 'LEAVE'; return; }

    if (myTable.occupants.every(o => o !== null) && !myTable.matchStartedAt) {
      gStore.startMatch(myTable.id)
    }

    if (myTable.matchStartedAt) {
      const elapsed = Date.now() - myTable.matchStartedAt
      const duration = 12000

      if (time % 1000 < 50) {
        const emo = this.scene.add.text(customer.sprite.x, customer.sprite.y - 40, '🃏', { fontSize: '16px' }).setOrigin(0.5)
        this.scene.tweens.add({ targets: emo, y: emo.y - 20, alpha: 0, duration: 800, onComplete: () => emo.destroy() })
      }

      if (elapsed >= duration) {
        if (customer.seatIndex === 0) {
          gStore.finishMatch(myTable.id)
          gStore.gainExp(50)
          const xpText = this.scene.add.text(myTable.x, myTable.y - 60, '+50 XP', { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5)
          this.scene.tweens.add({ targets: xpText, y: xpText.y - 40, alpha: 0, duration: 2000, onComplete: () => xpText.destroy() })
        }
        this.npcLeaveShop(customer)
      }
    }
  }

  private handleWander(customer: Customer, time: number) {
    if (time - customer.spawnTime > this.boredomThreshold) {
      this.npcLeaveShop(customer)
      return
    }

    if (time > customer.lastDecisionTime + this.decisionInterval) {
      customer.lastDecisionTime = time
      const store = useGameStore()

      if (customer.intent === 'PLAY') {
        const tables = Object.values(store.placedTables)
        let found = false
        for (const table of tables) {
          if (table.occupants && table.occupants.includes(null)) {
            const seatIndex = store.joinTable(table.id, customer.instanceId)
            if (seatIndex !== null) {
              customer.state = 'SEEK_TABLE'
              customer.assignedTableId = table.id
              customer.seatIndex = seatIndex
              customer.targetX = seatIndex === 0 ? table.x - 22 : table.x + 22
              customer.targetY = table.y
              this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
              found = true
              break
            }
          }
        }
        if (!found && Math.random() < 0.3) { customer.intent = 'BUY' }
      } else {
        const shelves = Object.values(store.placedShelves)
        let foundShelfId = null
        for (const shelf of shelves) {
          if (!customer.checkedShelfIds.includes(shelf.id) && shelf.tiers.some(t => t.slots.length > 0)) {
            foundShelfId = shelf.id
            break
          }
        }
        if (foundShelfId) {
          const shelf = store.placedShelves[foundShelfId]
          customer.state = 'SEEK_ITEM'
          customer.targetX = shelf.x
          customer.targetY = shelf.y + 45
          this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
        } else if (Math.random() < 0.4) {
          if (Math.random() < 0.5) {
            customer.intent = 'PLAY'
            customer.state = 'WANT_TO_PLAY'
            customer.searchStartTime = time
          } else {
            this.npcLeaveShop(customer)
          }
        }
      }
    }

    if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.targetX, customer.targetY) < 12) {
      customer.sprite.body!.velocity.set(0)
      const shopBounds = this.environmentManager.getShopBounds()
      customer.targetX = Phaser.Math.Between(shopBounds.x + 50, shopBounds.x + shopBounds.w - 50)
      customer.targetY = Phaser.Math.Between(shopBounds.y + 50, shopBounds.y + shopBounds.h - 50)
      this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
    }
  }

  private handleSeekItem(customer: Customer, time: number) {
    if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.targetX, customer.targetY) < 12) {
      customer.sprite.body!.velocity.set(0)
      customer.state = 'INTERACT'
      customer.timer = time + 1000
    }
  }

  private handleInteract(customer: Customer, time: number) {
    if (time > customer.timer) {
      const store = useGameStore()
      let shelfIdTaken = null
      for (const shelf of Object.values(store.placedShelves)) {
        if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, shelf.x, shelf.y + 45) < 15) {
          shelfIdTaken = shelf.id; break;
        }
      }

      const itemId = shelfIdTaken ? store.npcTakeItemFromSlot(shelfIdTaken) : null
      if (itemId) {
        const itemData = store.shopItems[itemId]
        customer.targetPrice = itemData ? itemData.sellPrice : 15
        const popupText = itemData?.type === 'box' ? '+1 Box 📦' : '+1 Pack 🎁'
        const popup = this.scene.add.text(customer.sprite.x, customer.sprite.y - 40, popupText, { fontSize: '12px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5)
        this.scene.tweens.add({ targets: popup, y: popup.y - 30, alpha: 0, duration: 1500, onComplete: () => popup.destroy() })

        // Chuyển sang GO_CASHIER
        customer.state = 'GO_CASHIER'
        store.addWaitingCustomer(customer.targetPrice, customer.instanceId)
        
        // Tìm vị trí quầy thu ngân để xếp hàng
        const cashier = Object.values(store.placedCashiers)[0] // Lấy quầy đầu tiên
        if (cashier) {
          const shopStore = useShopStore()
          const myIndex = shopStore.waitingQueue.findIndex(item => item.instanceId === customer.instanceId)
          customer.targetX = cashier.x
          customer.targetY = cashier.y + 60 + (myIndex * 40) // Xếp hàng dọc xuống
          this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
        }
      } else {
        if (shelfIdTaken) customer.checkedShelfIds.push(shelfIdTaken)
        customer.state = 'WANDER'
      }
    }
  }

  private handleGoCashier(customer: Customer) {
    if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.targetX, customer.targetY) > 5) {
      this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
    } else {
      customer.sprite.body!.velocity.set(0)
      customer.state = 'WAITING'
    }
  }

  private handleWaiting(customer: Customer) {
    const shopStore = useShopStore()
    const myIndex = shopStore.waitingQueue.findIndex(item => item.instanceId === customer.instanceId)
    if (myIndex === -1) return // Sẽ được xử lý trong updateNPCs

    const cashier = Object.values(shopStore.placedCashiers)[0]
    if (cashier) {
      const expectedY = cashier.y + 60 + (myIndex * 40)
      if (Math.abs(customer.targetY - expectedY) > 5) {
        customer.targetY = expectedY
        customer.state = 'GO_CASHIER'
      }
    }
    customer.sprite.body!.velocity.set(0)
  }

  private handleLeave(customer: Customer) {
    // Cleanup table occupancy
    if (customer.assignedTableId && customer.seatIndex !== undefined) {
      const gStore = useGameStore()
      const table = gStore.placedTables[customer.assignedTableId]
      if (table && table.occupants[customer.seatIndex!] === customer.instanceId) {
        table.occupants[customer.seatIndex!] = null
      }
    }

    const doorLocation = this.environmentManager.getDoorLocation()
    if (Phaser.Math.Distance.Between(customer.sprite.x, customer.sprite.y, customer.targetX, customer.targetY) < 15) {
      if (customer.targetY > doorLocation.y) {
        if (customer.statusText) customer.statusText.destroy()
        customer.sprite.destroy()
        const idx = this.customers.indexOf(customer)
        if (idx !== -1) this.customers.splice(idx, 1)
      }
    }
  }

  private npcLeaveShop(customer: Customer) {
    if (!customer.sprite.active) return
    customer.state = 'LEAVE'
    customer.timer = this.scene.time.now
    const doorLocation = this.environmentManager.getDoorLocation()

    customer.targetX = doorLocation.x
    customer.targetY = doorLocation.y - 40
    this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)

    this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        if (customer.sprite.active) {
          customer.targetY = doorLocation.y + 120
          this.scene.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, this.npcSpeed)
        }
      }
    })
  }

  getCustomers(): Customer[] { return this.customers }
}
