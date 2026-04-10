import Phaser from 'phaser'
import { useGameStore } from '../stores/gameStore'
import playerImg from '../assets/images/player.svg'
import npcImg from '../assets/images/npc.svg'
import shelfImg from '../assets/images/shelf.svg'
import cashierImg from '../assets/images/cashier.svg'

type NPCState = 'SPAWN' | 'WANDER' | 'SEEK_ITEM' | 'INTERACT' | 'GO_CASHIER' | 'WAITING' | 'LEAVE'

interface Customer {
  sprite: Phaser.Physics.Arcade.Sprite;
  state: NPCState;
  timer: number;
  targetX: number;
  targetY: number;
  targetPrice: number;
}

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private customers: Customer[] = []
  private cashierQueue: Customer[] = []
  private shelvesGroup!: Phaser.Physics.Arcade.StaticGroup
  private cashierGroup!: Phaser.Physics.Arcade.StaticGroup
  private cashierDesk!: Phaser.Physics.Arcade.Sprite
  private keyE!: Phaser.Input.Keyboard.Key
  private shelfTexts: Record<string, Phaser.GameObjects.Text> = {}

  private cursors!: {
    up: Phaser.Input.Keyboard.Key,
    down: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key
  }

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    this.load.spritesheet('player', playerImg, { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('npc', npcImg, { frameWidth: 32, frameHeight: 32 })
    this.load.image('shelf', shelfImg)
    this.load.image('cashier', cashierImg)
  }

  create() {
    this.cameras.main.setBackgroundColor('#2ecc71')

    // Animations
    const anims = this.anims
    anims.create({ key: 'player-down', frames: anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 8, repeat: -1 })
    anims.create({ key: 'player-left', frames: anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 8, repeat: -1 })
    anims.create({ key: 'player-right', frames: anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 8, repeat: -1 })
    anims.create({ key: 'player-up', frames: anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 8, repeat: -1 })

    anims.create({ key: 'npc-down', frames: anims.generateFrameNumbers('npc', { start: 0, end: 2 }), frameRate: 8, repeat: -1 })
    anims.create({ key: 'npc-left', frames: anims.generateFrameNumbers('npc', { start: 3, end: 5 }), frameRate: 8, repeat: -1 })
    anims.create({ key: 'npc-right', frames: anims.generateFrameNumbers('npc', { start: 6, end: 8 }), frameRate: 8, repeat: -1 })
    anims.create({ key: 'npc-up', frames: anims.generateFrameNumbers('npc', { start: 9, end: 11 }), frameRate: 8, repeat: -1 })

    // Tạo Kệ hàng (Shelves) - Static physics
    this.shelvesGroup = this.physics.add.staticGroup()
    
    const s1 = this.shelvesGroup.create(200, 150, 'shelf') as Phaser.Physics.Arcade.Sprite
    s1.setData('id', 'shelf1')
    
    const s2 = this.shelvesGroup.create(500, 150, 'shelf') as Phaser.Physics.Arcade.Sprite
    s2.setData('id', 'shelf2')

    // Text báo hiệu trên kệ
    this.shelfTexts['shelf1'] = this.add.text(200, 100, '🪹 Empty', { fontSize: '12px', color: '#fff', backgroundColor: '#000' }).setOrigin(0.5)
    this.shelfTexts['shelf2'] = this.add.text(500, 100, '🪹 Empty', { fontSize: '12px', color: '#fff', backgroundColor: '#000' }).setOrigin(0.5)

    // Tạo Quầy thu ngân (Cashier)
    this.cashierGroup = this.physics.add.staticGroup()
    this.cashierDesk = this.cashierGroup.create(600, 180, 'cashier') as Phaser.Physics.Arcade.Sprite
    this.cashierDesk.setData('id', 'cashier')

    // Player
    this.player = this.physics.add.sprite(400, 300, 'player')
    this.player.setCollideWorldBounds(true)

    // Va chạm
    this.physics.add.collider(this.player, this.shelvesGroup)
    this.physics.add.collider(this.player, this.cashierGroup)

    // Cấu hình phím
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      }) as typeof this.cursors
      
      // Phím tương tác 'E'
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    }

    // Spawn khách
    this.time.addEvent({
      delay: 3000,
      callback: this.spawnCustomer,
      callbackScope: this,
      loop: true
    })

    // Lắng nghe thanh toán
    const gameStore = useGameStore()
    let lastWaitingCount = gameStore.waitingCustomers

    gameStore.$subscribe((mutation, state) => {
      if (state.waitingCustomers < lastWaitingCount) {
        if (this.cashierQueue.length > 0) {
          const servedCust = this.cashierQueue.shift()!
          servedCust.sprite.destroy()
          
          const indexInCustomers = this.customers.indexOf(servedCust)
          if (indexInCustomers !== -1) {
            this.customers.splice(indexInCustomers, 1)
          }
        }
      }
      lastWaitingCount = state.waitingCustomers
    })
  }

  spawnCustomer() {
    if (useGameStore().shopState !== 'OPEN') return
    if (this.customers.length >= 10) return

    const npcSprite = this.physics.add.sprite(400, 600, 'npc')
    npcSprite.setCollideWorldBounds(true)

    this.customers.push({
      sprite: npcSprite,
      state: 'SPAWN',
      timer: this.time.now + 1000,
      targetX: 400,
      targetY: 600,
      targetPrice: 0
    })
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player.body || !this.keyE) return

    // Bắt sự kiện ấn phím E (chỉ tính 1 lần ấn xuống JustDown)
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      const store = useGameStore()
      
      // Tương tác Cashier
      const distToCashier = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cashierDesk.x, this.cashierDesk.y)
      if (distToCashier < 80) {
        if (store.waitingCustomers > 0) {
          store.serveCustomer()
        }
      }

      // Tương tác Shelf
      this.shelvesGroup.getChildren().forEach(child => {
        const shelf = child as Phaser.Physics.Arcade.Sprite
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, shelf.x, shelf.y)
        if (dist < 70) {
          store.openShelfManagement(shelf.getData('id'))
        }
      })
    }

    // Cập nhật Text báo hiệu đồ trên kệ liên tục từ Store Pinia
    const store = useGameStore()
    for (const [id, textObj] of Object.entries(this.shelfTexts)) {
       const shelfData = store.placedShelves[id as 'shelf1' | 'shelf2']
       if (shelfData) {
         const filledSlots = shelfData.slots.filter(s => s.itemId !== null && s.quantity > 0)
         if (filledSlots.length > 0) {
           textObj.setText(`🏷️ Hàng: ${filledSlots.length}/${shelfData.slots.length}`)
         } else {
           textObj.setText('🪹 Trống')
         }
       }
    }

    // Player di chuyển
    this.player.setVelocity(0)
    const speed = 160
    let isMoving = false

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed)
      isMoving = true
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed)
      isMoving = true
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed)
      isMoving = true
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed)
      isMoving = true
    }

    if (isMoving) {
      this.player.body.velocity.normalize().scale(speed)
      if (this.cursors.left.isDown) this.player.anims.play('player-left', true)
      else if (this.cursors.right.isDown) this.player.anims.play('player-right', true)
      else if (this.cursors.up.isDown) this.player.anims.play('player-up', true)
      else if (this.cursors.down.isDown) this.player.anims.play('player-down', true)
    } else {
      this.player.anims.stop()
    }

    // Cập nhật targetY của các khách đang xếp hàng để tự dồn lên
    this.cashierQueue.forEach((cust, idx) => {
       cust.targetX = 600
       cust.targetY = 220 + idx * 45
    })

    // Auto Show End Day Modal
    if (store.shopState === 'CLOSED' && this.customers.length === 0 && store.waitingCustomers === 0 && !store.showEndDayModal) {
      store.showEndDayModal = true
    }

    // NPC Logic
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const customer = this.customers[i]
      const sprite = customer.sprite
      const npcSpeed = 100

      // Animation NPC
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

      switch (customer.state) {
        case 'SPAWN':
          if (time > customer.timer) {
            customer.state = 'WANDER'
            customer.targetX = Phaser.Math.Between(100, 700)
            customer.targetY = Phaser.Math.Between(300, 500)
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          }
          break

        case 'WANDER':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 5) {
            sprite.body!.velocity.set(0)
            
            const store = useGameStore()
            let foundShelfId: 'shelf1'|'shelf2'|null = null
            // Check if shelf 1 or shelf 2 has items
            if (store.placedShelves.shelf1 && store.placedShelves.shelf1.slots.some(s => s.itemId !== null && s.quantity > 0)) foundShelfId = 'shelf1'
            else if (store.placedShelves.shelf2 && store.placedShelves.shelf2.slots.some(s => s.itemId !== null && s.quantity > 0)) foundShelfId = 'shelf2'

            if (foundShelfId) {
              customer.state = 'SEEK_ITEM'
              customer.targetX = foundShelfId === 'shelf1' ? 200 : 500
              customer.targetY = 180 // Đứng trước kệ
            } else {
              // Lượn tiếp nếu shop trống
              customer.targetX = Phaser.Math.Between(100, 700)
              customer.targetY = Phaser.Math.Between(300, 500)
            }
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          }
          break

        case 'SEEK_ITEM':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 5) {
            sprite.body!.velocity.set(0)
            customer.state = 'INTERACT'
            customer.timer = time + 1000 // Xem hàng/lấy hàng trong 1s
          }
          break

        case 'INTERACT':
          if (time > customer.timer) {
            const store = useGameStore()
            const shelfIdToTake = customer.targetX === 200 ? 'shelf1' : 'shelf2'
            const itemId = store.npcTakeItemFromSlot(shelfIdToTake)
            
            if (itemId) {
              const itemData = store.shopItems[itemId]
              customer.targetPrice = itemData ? itemData.sellPrice : 15
              
              const popupText = itemData?.type === 'box' ? '+1 Box 📦' : '+1 Pack 🎁'
              const popup = this.add.text(sprite.x, sprite.y - 40, popupText, { fontSize: '12px', color: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5)
              this.tweens.add({ targets: popup, y: popup.y - 30, alpha: 0, duration: 1500, onComplete: () => popup.destroy() })

              customer.state = 'GO_CASHIER'
              useGameStore().addWaitingCustomer(customer.targetPrice)
              this.cashierQueue.push(customer)
            } else {
              customer.state = 'WANDER'
              customer.targetX = Phaser.Math.Between(100, 700)
              customer.targetY = Phaser.Math.Between(300, 500)
            }
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          }
          break

        case 'GO_CASHIER':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) > 5) {
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          } else {
            sprite.body!.velocity.set(0)
            customer.state = 'WAITING'
          }
          break

        case 'WAITING':
          // Nếu slot trống phía trước, target thay đổi -> khoảng cách > 5 -> Tiến lên!
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) > 5) {
            customer.state = 'GO_CASHIER'
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          } else {
            sprite.body!.velocity.set(0) 
          }
          break

        case 'LEAVE':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 5) {
            sprite.destroy()
            this.customers.splice(i, 1) 
          }
          break
      }
    }
  }
}
