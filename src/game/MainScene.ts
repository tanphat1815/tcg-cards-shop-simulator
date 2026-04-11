import Phaser from 'phaser'
import { useShopStore } from '../stores/modules/shopStore'
import { useStaffStore } from '../stores/modules/staffStore'
import { NPCManager } from './managers/NPCManager'
import { FurnitureManager } from './managers/FurnitureManager'
import { BuildManager } from './managers/BuildManager'
import { StaffManager } from './managers/StaffManager'
import { getShopBounds } from '../utils/shopUtils'
import playerImg from '../assets/images/player.svg'
import npcImg from '../assets/images/npc.svg'
import shelfImg from '../assets/images/shelf.svg'
import cashierImg from '../assets/images/cashier.svg'
import { DEPTH } from '../config/renderConfigs'

/**
 * MainScene: Orchestrator chính của game.
 * Kết nối các Managers và xử lý vòng lặp (Update Loop) chính.
 */
export default class MainScene extends Phaser.Scene {
  // Managers
  public npcManager!: NPCManager
  public furnitureManager!: FurnitureManager
  public buildManager!: BuildManager
  public staffManager!: StaffManager

  // Sprites & Groups
  private player!: Phaser.Physics.Arcade.Sprite

  // Input
  private keyE!: Phaser.Input.Keyboard.Key
  private cursors!: {
    up: Phaser.Input.Keyboard.Key,
    down: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    w: Phaser.Input.Keyboard.Key,
    a: Phaser.Input.Keyboard.Key,
    s: Phaser.Input.Keyboard.Key,
    d: Phaser.Input.Keyboard.Key
  }

  private floorGraphics!: Phaser.GameObjects.Graphics
  private wallGraphics!: Phaser.GameObjects.Graphics
  private outsideGraphics!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    this.load.spritesheet('player', playerImg, { frameWidth: 32, frameHeight: 32 })
    this.load.spritesheet('npc', npcImg, { frameWidth: 32, frameHeight: 32 })
    this.load.image('shelf_single', shelfImg)
    this.load.image('shelf_double', shelfImg) // Tạm dùng chung, có thể tint
    this.load.image('cashier_desk', cashierImg)
    this.load.image('play_table', shelfImg) // Tạm dùng shelf cho table hoặc asset khác nếu có
    // Key dự phòng cho code cũ
    this.load.image('shelf_texture', shelfImg)
  }

  create() {
    const shopStore = useShopStore()

    // 1. Phông nền và phân lớp Graphics
    this.outsideGraphics = this.add.graphics().setDepth(DEPTH.OUTSIDE)
    this.floorGraphics = this.add.graphics().setDepth(DEPTH.FLOOR)
    this.wallGraphics = this.add.graphics().setDepth(DEPTH.WALL_GRAPHICS)

    // 2. Khởi tạo Animations
    this.setupAnimations()

    // 3. Khởi tạo các Manager (Dependency Injection)
    this.furnitureManager = new FurnitureManager(this)
    this.npcManager = new NPCManager(this)
    this.buildManager = new BuildManager(this)
    this.staffManager = new StaffManager(this)

    // 4. Đồng bộ dữ liệu ban đầu và lắng nghe thay đổi
    this.furnitureManager.syncFurniture()
    shopStore.$subscribe(() => {
      this.furnitureManager.syncFurniture()
    })

    // 5. Thiết lập Input
    if (this.input.keyboard) {
      this.cursors = {
        ...this.input.keyboard.createCursorKeys(),
        w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      } as any
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    }

    // 6. Tạo người chơi
    this.player = this.physics.add.sprite(1100, 1200, 'player')
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(DEPTH.PLAYER)

    // 7. Thiết lập va chạm gốc
    this.setupCollisions()
    
    // 8. Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(1.2)
    this.cameras.main.setBounds(0, 0, 3000, 3000)
  }

  private setupAnimations() {
    const anims = this.anims
    if (!anims.exists('player-down')) {
      anims.create({ key: 'player-down', frames: anims.generateFrameNumbers('player', { start: 0, end: 2 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'player-left', frames: anims.generateFrameNumbers('player', { start: 3, end: 5 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'player-right', frames: anims.generateFrameNumbers('player', { start: 6, end: 8 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'player-up', frames: anims.generateFrameNumbers('player', { start: 9, end: 11 }), frameRate: 8, repeat: -1 })
    }
    if (!anims.exists('npc_walk_down')) {
      anims.create({ key: 'npc_walk_down', frames: anims.generateFrameNumbers('npc', { start: 0, end: 2 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc_walk_left', frames: anims.generateFrameNumbers('npc', { start: 3, end: 5 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc_walk_right', frames: anims.generateFrameNumbers('npc', { start: 6, end: 8 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc_walk_up', frames: anims.generateFrameNumbers('npc', { start: 9, end: 11 }), frameRate: 8, repeat: -1 })
      anims.create({ key: 'npc_idle', frames: [{ key: 'npc', frame: 0 }], frameRate: 1 })
    }
  }

  update(time: number, delta: number) {
    if (!this.player || !this.cursors || !this.npcManager || !this.buildManager || !this.staffManager) return
    this.updatePlayerMovement()
    this.npcManager.update(time, delta)
    this.buildManager.update()
    this.staffManager.update(time, delta)
    this.drawShopGraphics()
  }

  private updatePlayerMovement() {
    const speed = 250
    const sprite = this.player
    sprite.setVelocity(0)
    if (this.cursors.left.isDown || this.cursors.a.isDown) {
      sprite.setVelocityX(-speed)
      sprite.play('player-left', true)
    } else if (this.cursors.right.isDown || this.cursors.d.isDown) {
      sprite.setVelocityX(speed)
      sprite.play('player-right', true)
    } else if (this.cursors.up.isDown || this.cursors.w.isDown) {
      sprite.setVelocityY(-speed)
      sprite.play('player-up', true)
    } else if (this.cursors.down.isDown || this.cursors.s.isDown) {
      sprite.setVelocityY(speed)
      sprite.play('player-down', true)
    } else { sprite.anims.stop() }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.handlePlayerInteraction()
    }
  }

  private handlePlayerInteraction() {
     const shopStore = useShopStore()
     const staffStore = useStaffStore()

     // 1. Tương tác Thu ngân (Cashier)
     // Tìm cashier gần nhất bằng physics body nếu cần, hoặc đơn giản là quét list
     const cashierDist = 80
     const nearestCashier = this.physics.closest(this.player, this.furnitureManager.furnitureGroup.getChildren()) as Phaser.Physics.Arcade.Sprite
     
     if (nearestCashier && Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestCashier.x, nearestCashier.y) < cashierDist) {
        // Kiểm tra xem sprite này có phải là cashier không thông qua texture hoặc data
        if (nearestCashier.texture.key === 'cashier_desk') {
          staffStore.serveCustomer()
          return
        }
     }

     // 2. Tương tác Kệ hàng (Shelf)
     const shelfDist = 70
     const nearestShelf = this.physics.closest(this.player, this.furnitureManager.furnitureGroup.getChildren()) as Phaser.Physics.Arcade.Sprite
     
     if (nearestShelf && Phaser.Math.Distance.Between(this.player.x, this.player.y, nearestShelf.x, nearestShelf.y) < shelfDist) {
        if (nearestShelf.texture.key === 'shelf_texture') {
           // Ở đây ta cần ID của kệ. FurnitureManager nên gán ID vào data của sprite.
           const shelfId = nearestShelf.getData('id')
           if (shelfId) {
              shopStore.openShelfManagement(shelfId)
           }
        }
     }
  }

  /**
   * Thiết lập hệ thống va chạm vật lý cho toàn bộ các đối tượng.
   */
  private setupCollisions() {
    // Va chạm Người chơi - Nội thất
    this.physics.add.collider(this.player, this.furnitureManager.furnitureGroup)

    // Va chạm Khách hàng - Nội thất
    this.physics.add.collider(this.npcManager.customerGroup, this.furnitureManager.furnitureGroup)

    // Va chạm giữa các Khách hàng với nhau (tùy chọn để tránh chồng chéo quá mức)
    this.physics.add.collider(this.npcManager.customerGroup, this.npcManager.customerGroup)
  }

  private drawShopGraphics() {
    const shopStore = useShopStore()
    const bounds = this.getShopBounds(shopStore.expansionLevel)
    
    // Vẽ nền đường xá bên ngoài
    this.outsideGraphics.clear()
    this.outsideGraphics.fillStyle(0x1a1a1a, 1)
    this.outsideGraphics.fillRect(0, 0, 3000, 3000)

    // Vẽ sàn shop
    this.floorGraphics.clear()
    this.floorGraphics.fillStyle(0x2d3748, 1)
    this.floorGraphics.fillRect(bounds.x, bounds.y, bounds.w, bounds.h)
    
    // Grid trang trí
    this.floorGraphics.lineStyle(1, 0x34495e, 0.4)
    for (let x = bounds.x; x <= bounds.x + bounds.w; x += 40) {
      this.floorGraphics.lineBetween(x, bounds.y, x, bounds.y + bounds.h)
    }
    for (let y = bounds.y; y <= bounds.y + bounds.h; y += 40) {
      this.floorGraphics.lineBetween(bounds.x, y, bounds.x + bounds.w, y)
    }

    // Vẽ viền tường
    this.wallGraphics.clear()
    this.wallGraphics.lineStyle(8, 0x4a5568, 1)
    this.wallGraphics.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h)
    
    // Cửa chính
    this.wallGraphics.lineStyle(10, 0x718096, 1)
    const doorX = 1100
    this.wallGraphics.beginPath()
    this.wallGraphics.moveTo(doorX - 60, bounds.y + bounds.h)
    this.wallGraphics.lineTo(doorX + 60, bounds.y + bounds.h)
    this.wallGraphics.strokePath()
  }

  private getShopBounds(level: number) {
     return getShopBounds(level)
  }
}
