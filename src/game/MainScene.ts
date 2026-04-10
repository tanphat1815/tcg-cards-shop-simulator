import Phaser from 'phaser'
import { useGameStore } from '../stores/gameStore'
import playerImg from '../assets/images/player.svg'
import npcImg from '../assets/images/npc.svg'
import shelfImg from '../assets/images/shelf.svg'
import cashierImg from '../assets/images/cashier.svg'
import { WORKERS, SPEED_TO_MS } from '../config/workerData'
import { BASE_SHOP_WIDTH, BASE_SHOP_HEIGHT, EXPANSION_UNIT, getExpansionDimensions } from '../config/expansionData'

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
  private ghostSprite: Phaser.GameObjects.Sprite | null = null
  private isPlacementValid: boolean = false
  private staffSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map()
  private lastAutoCheckoutTime: number = 0
  private floorGraphics!: Phaser.GameObjects.Graphics
  private wallGraphics!: Phaser.GameObjects.Graphics
  private outsideGraphics!: Phaser.GameObjects.Graphics
  private doorLocation = { x: 0, y: 0 }
  private shopBounds = { x: 0, y: 0, w: 0, h: 0 }

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
    const gameStore = useGameStore()

    // Phông nền ngoài shop
    this.outsideGraphics = this.add.graphics()
    this.floorGraphics = this.add.graphics()
    this.wallGraphics = this.add.graphics()

    // Animations
    const anims = this.anims
    if (!anims.exists('player-down')) {
      anims.create({ key: 'player-down', frames: anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'player-left', frames: anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'player-right', frames: anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'player-up', frames: anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 8, repeat: -1 })

      anims.create({ key: 'npc-down', frames: anims.generateFrameNumbers('npc', { start: 0, end: 2 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc-left', frames: anims.generateFrameNumbers('npc', { start: 3, end: 5 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc-right', frames: anims.generateFrameNumbers('npc', { start: 6, end: 8 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc-up', frames: anims.generateFrameNumbers('npc', { start: 9, end: 11 }), frameRate: 8, repeat: -1 })
    }

    // Nhóm vật thể vật lý
    this.shelvesGroup = this.physics.add.staticGroup()
    this.cashierGroup = this.physics.add.staticGroup()

    // Tạo Quầy thu ngân (Cashier) - Vị trí sẽ được cập nhật trong refreshEnvironment
    this.cashierDesk = this.cashierGroup.create(600, 150, 'cashier') as Phaser.Physics.Arcade.Sprite
    this.cashierDesk.setData('id', 'cashier')

    // Khởi tạo môi trường shop & bounds
    this.refreshEnvironment()

    // Render các kệ đã đặt từ Store
    Object.values(gameStore.placedShelves).forEach(shelfData => {
      this.addShelfToScene(shelfData)
    })

    // Player
    this.player = this.physics.add.sprite(this.shopBounds.x + 100, this.shopBounds.y + 100, 'player')
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
      
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    }

    // Spawn khách định kỳ
    this.time.addEvent({
      delay: 3000,
      callback: this.spawnCustomer,
      callbackScope: this,
      loop: true
    })

    // Lắng nghe thay đổi store
    let lastWaitingCount = gameStore.waitingCustomers
    let lastExpansionLevel = gameStore.expansionLevel

    gameStore.$subscribe((mutation, state) => {
      // Check Expansion
      if (state.expansionLevel !== lastExpansionLevel) {
        this.refreshEnvironment()
        lastExpansionLevel = state.expansionLevel
      }

      if (state.waitingCustomers < lastWaitingCount) {
        if (this.cashierQueue.length > 0) {
          const servedCust = this.cashierQueue.shift()!
          servedCust.state = 'LEAVE'
          servedCust.targetX = this.doorLocation.x
          servedCust.targetY = this.doorLocation.y + 50
        }
      }
      lastWaitingCount = state.waitingCustomers
    })
  }

  private refreshEnvironment() {
    const store = useGameStore()
    const { extraW, extraH } = getExpansionDimensions(store.expansionLevel)
    
    const shopW = BASE_SHOP_WIDTH + extraW
    const shopH = BASE_SHOP_HEIGHT + extraH
    const startX = 100
    const startY = 100
    
    this.shopBounds = { x: startX, y: startY, w: shopW, h: shopH }
    this.doorLocation = { x: startX + shopW / 2, y: startY + shopH }

    // World & Camera Bounds
    const worldPad = 400
    this.physics.world.setBounds(startX, startY, shopW, shopH)
    this.cameras.main.setBounds(startX - worldPad, startY - worldPad, shopW + worldPad * 2, shopH + worldPad * 2)

    // Vẽ Outside
    this.outsideGraphics.clear()
    this.outsideGraphics.fillStyle(0x1a1a1a, 1) // Dark street
    this.outsideGraphics.fillRect(startX - worldPad, startY - worldPad, shopW + worldPad * 2, shopH + worldPad * 2)
    
    // Vẽ Floor
    this.floorGraphics.clear()
    this.floorGraphics.fillStyle(0x2c3e50, 1) // Slate floor
    this.floorGraphics.fillRect(startX, startY, shopW, shopH)
    
    // Grid lines
    this.floorGraphics.lineStyle(1, 0x34495e, 0.5)
    for (let i = 0; i <= shopW; i += 40) {
      this.floorGraphics.lineBetween(startX + i, startY, startX + i, startY + shopH)
    }
    for (let j = 0; j <= shopH; j += 40) {
      this.floorGraphics.lineBetween(startX, startY + j, startX + shopW, startY + j)
    }

    // Walls
    this.wallGraphics.clear()
    this.wallGraphics.lineStyle(6, 0xffffff, 0.8)
    this.wallGraphics.strokeRect(startX, startY, shopW, shopH)
    
    // Door gap (yellow line for now)
    this.wallGraphics.lineStyle(8, 0xf1c40f, 1)
    const doorWidth = 80
    this.wallGraphics.lineBetween(this.doorLocation.x - doorWidth/2, this.doorLocation.y, this.doorLocation.x + doorWidth/2, this.doorLocation.y)
    
    if (this.cashierDesk) {
      this.cashierDesk.setPosition(startX + shopW - 60, startY + 60)
    }
  }

  spawnCustomer() {
    if (useGameStore().shopState !== 'OPEN') return
    if (this.customers.length >= 10) return

    // Khách bắt đầu từ cửa
    const npcSprite = this.physics.add.sprite(this.doorLocation.x, this.doorLocation.y + 50, 'npc')
    npcSprite.setCollideWorldBounds(true)

    this.customers.push({
      sprite: npcSprite,
      state: 'SPAWN',
      timer: this.time.now + 500,
      targetX: this.doorLocation.x,
      targetY: this.doorLocation.y - 40, // Đi vào trong shop
      targetPrice: 0
    })
    this.physics.moveTo(npcSprite, this.doorLocation.x, this.doorLocation.y - 40, 100)
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player.body || !this.keyE) return

    const store = useGameStore()

    // Bắt sự kiện ấn phím E (chỉ tính 1 lần ấn xuống JustDown)
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      
      // Tương tác Cashier
      const distToCashier = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cashierDesk.x, this.cashierDesk.y)
      if (distToCashier < 80) {
        if (store.waitingCustomers > 0) {
          store.serveCustomer()
        }
      }

      this.shelvesGroup.getChildren().forEach(child => {
        const shelf = child as Phaser.Physics.Arcade.Sprite
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, shelf.x, shelf.y)
        if (dist < 70) {
          store.openShelfManagement(shelf.getData('id'))
        }
      })
    }

    // --- Auto Checkout Logic ---
    this.handleAutoCheckout(time)

    // --- Build Mode Logic ---
    if (store.isBuildMode) {
      this.handleBuildMode()
      return // Dừng các logic di chuyển khi đang ở Build Mode
    } else if (this.ghostSprite) {
      this.ghostSprite.destroy()
      this.ghostSprite = null
    }

    // Cập nhật Text báo hiệu đồ trên kệ liên tục từ Store Pinia
    for (const [id, textObj] of Object.entries(this.shelfTexts)) {
       const shelfData = store.placedShelves[id]
       if (shelfData) {
         const totalItems = shelfData.tiers.reduce((sum, t) => sum + t.slots.length, 0)
         if (totalItems > 0) {
           textObj.setText(`🏷️ ${totalItems} món`)
         } else {
           textObj.setText('🪹 Trống')
         }
       } else if (id !== 'shelf1' && id !== 'shelf2') { 
         // Dọn dẹp text nếu kệ không còn tồn tại
         textObj.destroy()
         delete this.shelfTexts[id]
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
            customer.targetX = Phaser.Math.Between(this.shopBounds.x + 20, this.shopBounds.x + this.shopBounds.w - 20)
            customer.targetY = Phaser.Math.Between(this.shopBounds.y + 20, this.shopBounds.y + this.shopBounds.h - 20)
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          }
          break

        case 'WANDER':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 5) {
            sprite.body!.velocity.set(0)
            
            const store = useGameStore()
            let foundShelfId: string | null = null
            // Check all placed shelves
            for (const shelf of Object.values(store.placedShelves)) {
              if (shelf.tiers.some(t => t.itemId && t.slots.length > 0)) {
                foundShelfId = shelf.id
                break
              }
            }

            if (foundShelfId) {
              const targetShelf = store.placedShelves[foundShelfId]
              customer.state = 'SEEK_ITEM'
              customer.targetX = targetShelf.x
              customer.targetY = targetShelf.y + 30 // Đứng trước kệ
            } else {
              // Lượn tiếp nếu shop trống
              customer.targetX = Phaser.Math.Between(this.shopBounds.x + 20, this.shopBounds.x + this.shopBounds.w - 20)
              customer.targetY = Phaser.Math.Between(this.shopBounds.y + 20, this.shopBounds.y + this.shopBounds.h - 20)
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
            // Tìm kệ khách đang đứng
            let shelfIdToTake = null
            for (const shelf of Object.values(store.placedShelves)) {
               if (Phaser.Math.Distance.Between(sprite.x, sprite.y, shelf.x, shelf.y + 30) < 10) {
                 shelfIdToTake = shelf.id
                 break
               }
            }
            
            const itemId = shelfIdToTake ? store.npcTakeItemFromSlot(shelfIdToTake) : null
            
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
              customer.targetX = Phaser.Math.Between(this.shopBounds.x + 20, this.shopBounds.x + this.shopBounds.w - 20)
              customer.targetY = Phaser.Math.Between(this.shopBounds.y + 20, this.shopBounds.y + this.shopBounds.h - 20)
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

    // Cập nhật Sprite Nhân viên
    this.updateStaffSprites()
  }

  private updateStaffSprites() {
    const store = useGameStore()
    
    // Xóa các sprite của nhân viên đã bị đuổi việc
    const currentInstanceIds = new Set(store.hiredWorkers.map(w => w.instanceId))
    for (const [instanceId, sprite] of this.staffSprites.entries()) {
      if (!currentInstanceIds.has(instanceId)) {
        sprite.destroy()
        this.staffSprites.delete(instanceId)
      }
    }

    // Cập nhật hoặc tạo mới sprite
    store.hiredWorkers.forEach(hw => {
      let sprite = this.staffSprites.get(hw.instanceId)
      if (!sprite) {
        sprite = this.physics.add.sprite(50, 500, 'npc') // Mặc định đứng ngoài
        sprite.setTint(0xaaaaff) // Màu xanh nhạt để phân biệt với khách
        this.staffSprites.set(hw.instanceId, sprite)
      }

      // Vị trí dựa trên Duty
      let targetX = 50
      let targetY = 500 + (parseInt(hw.instanceId.split('_')[1]) % 100) // Tránh chồng lấn hoàn toàn

      if (hw.duty === 'CASHIER') {
        targetX = 600
        targetY = 150
      } else if (hw.duty === 'STOCKER') {
        targetX = 100
        targetY = 550
      }

      // Di chuyển tới vị trí (Teleport hoặc MoveTo - ở đây dùng teleport cho đơn giản)
      if (Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY) > 5) {
         this.physics.moveTo(sprite, targetX, targetY, 120)
      } else {
         sprite.body!.velocity.set(0)
         // Quay mặt đúng hướng
         if (hw.duty === 'CASHIER') sprite.setFrame(0) // Quay mặt xuống
      }

      // Animation staff
      if (sprite.body!.velocity.lengthSq() > 0) {
        const vx = sprite.body!.velocity.x
        const vy = sprite.body!.velocity.y
        if (Math.abs(vx) > Math.abs(vy)) sprite.anims.play(vx < 0 ? 'npc-left' : 'npc-right', true)
        else sprite.anims.play(vy < 0 ? 'npc-up' : 'npc-down', true)
      } else {
        sprite.anims.stop()
      }
    })
  }

  private handleAutoCheckout(time: number) {
    const store = useGameStore()
    if (store.waitingCustomers <= 0) return

    // Tìm xem ai là Cashier
    const cashier = store.hiredWorkers.find(w => w.duty === 'CASHIER')
    if (!cashier) return

    const workerData = WORKERS.find(w => w.id === cashier.workerId)
    if (!workerData) return

    const cooldown = SPEED_TO_MS[workerData.checkoutSpeed]

    if (time > this.lastAutoCheckoutTime + cooldown) {
      store.serveCustomer()
      this.lastAutoCheckoutTime = time
      
      // Hiệu ứng thanh toán tự động (optional)
      const cashierSprite = this.staffSprites.get(cashier.instanceId)
      if (cashierSprite) {
        const pulse = this.add.text(cashierSprite.x, cashierSprite.y - 40, '💳 Auto', { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5)
        this.tweens.add({ targets: pulse, y: pulse.y - 20, alpha: 0, duration: 1000, onComplete: () => pulse.destroy() })
      }
    }
  }

  private addShelfToScene(shelfData: any) {
    const shelf = this.shelvesGroup.create(shelfData.x, shelfData.y, 'shelf') as Phaser.Physics.Arcade.Sprite
    shelf.setData('id', shelfData.id)
    shelf.refreshBody()

    // Tạo text báo hiệu
    this.shelfTexts[shelfData.id] = this.add.text(shelfData.x, shelfData.y - 50, '🪹 Empty', { 
      fontSize: '12px', 
      color: '#fff', 
      backgroundColor: '#000' 
    }).setOrigin(0.5)
  }

  private handleBuildMode() {
    const store = useGameStore()
    const pointer = this.input.activePointer

    // Tạo ghost nếu chưa có
    if (!this.ghostSprite) {
      this.ghostSprite = this.add.sprite(pointer.x, pointer.y, 'shelf')
      this.ghostSprite.setAlpha(0.6)
      this.ghostSprite.setDepth(100)
    }

    // Cập nhật vị trí ghost
    this.ghostSprite.x = pointer.x
    this.ghostSprite.y = pointer.y

    // Kiểm tra va chạm
    this.isPlacementValid = true

    // 1. Kiểm tra lấn sân quầy thu ngân
    const distToCashier = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.cashierDesk.x, this.cashierDesk.y)
    if (distToCashier < 80) this.isPlacementValid = false

    // 2. Kiểm tra chồng lấn các kệ khác
    this.shelvesGroup.getChildren().forEach(child => {
      const shelf = child as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, shelf.x, shelf.y)
      if (dist < 60) this.isPlacementValid = false
    })

    // 3. Kiểm tra gần Player (không đặt đè lên đầu mình)
    const distToPlayer = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y)
    if (distToPlayer < 50) this.isPlacementValid = false

    // Visual feedback
    if (this.isPlacementValid) {
      this.ghostSprite.setTint(0x00ff00)
    } else {
      this.ghostSprite.setTint(0xff0000)
    }

    // Click để đặt
    if (pointer.isDown && this.isPlacementValid) {
       store.placeFurniture(pointer.x, pointer.y)
       // Render ngay lập tức kệ vừa đặt (store update sẽ trigger render ở đời thực, 
       // nhưng ở đây ta vẽ tay 1 lần để mượt hoặc đợi loop subscribe)
       this.addShelfToScene(Object.values(store.placedShelves).slice(-1)[0])
       this.ghostSprite.destroy()
       this.ghostSprite = null
    }

    // Phím Esc để hủy (Hỗ trợ thêm)
    if (this.input.keyboard && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC))) {
      store.cancelBuildMode()
    }
  }
}
