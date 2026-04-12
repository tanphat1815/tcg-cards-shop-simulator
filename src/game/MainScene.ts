import Phaser from 'phaser'
import { useGameStore } from '../stores/gameStore'
import { useStatsStore } from '../stores/modules/statsStore'
import { useShopStore } from '../stores/modules/shopStore'
import playerImg from '../assets/images/player.svg'
import npcImg from '../assets/images/npc.svg'
import shelfImg from '../assets/images/shelf.svg'
import cashierImg from '../assets/images/cashier.svg'
import { WORKERS, SPEED_TO_MS } from '../config/workerData'
import { DEPTH } from '../config/renderConfigs'
import { EnvironmentManager } from './managers/EnvironmentManager'
import { FurnitureManager } from './managers/FurnitureManager'
import { NPCManager } from './managers/NPCManager'

/**
 * MainScene - Orchestrator chính của game Phaser.
 * Kết nối các Managers và xử lý logic tương tác của người chơi.
 */
export default class MainScene extends Phaser.Scene {
  // Game Objects
  public player!: Phaser.Physics.Arcade.Sprite
  
  // Managers
  public environmentManager!: EnvironmentManager
  public furnitureManager!: FurnitureManager
  public npcManager!: NPCManager

  // Input & UI
  private keyE!: Phaser.Input.Keyboard.Key
  private ghostSprite: Phaser.GameObjects.Sprite | null = null
  private ghostRectangle: Phaser.GameObjects.Rectangle | null = null
  private ghostText: Phaser.GameObjects.Text | null = null
  private isPlacementValid: boolean = false
  private staffSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map()
  private lastAutoCheckoutTime: number = 0
  
  // Graphics Layers
  public previewGraphics!: Phaser.GameObjects.Graphics
  public placementGraphics!: Phaser.GameObjects.Graphics
  private editOverlay!: Phaser.GameObjects.Graphics
  private editText!: Phaser.GameObjects.Text
  private lastPlacementTime: number = 0

  private cursors!: {
    up: Phaser.Input.Keyboard.Key,
    down: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    p: Phaser.Input.Keyboard.Key
  }

  // Camera Drag vars
  private isDraggingCamera: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private camStartX: number = 0
  private camStartY: number = 0

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

    // 1. Khởi tạo Layers đồ họa
    this.previewGraphics = this.add.graphics().setDepth(DEPTH.PREVIEW)
    this.placementGraphics = this.add.graphics().setDepth(DEPTH.PLACEMENT_VISUALIZER)
    this.editOverlay = this.add.graphics().setDepth(DEPTH.EDIT_OVERLAY).setScrollFactor(0)
    
    // 2. Khởi tạo Managers
    this.environmentManager = new EnvironmentManager(this)
    this.furnitureManager = new FurnitureManager(this)
    this.npcManager = new NPCManager(this, this.environmentManager)

    // 3. UI & Animations
    this.setupAnimations()
    this.setupUI()

    // 4. Vật lý & Thế giới
    this.physics.world.setBounds(0, 0, 3000, 3000)
    this.environmentManager.initializeEnvironment()
    this.furnitureManager.initializeFurniture()

    // 5. Player
    const doorPos = this.environmentManager.getDoorLocation()
    this.player = this.physics.add.sprite(doorPos.x, doorPos.y - 150, 'player')
    this.player.setCollideWorldBounds(true).setDepth(DEPTH.PLAYER)

    // 6. Va chạm cho Player
    this.physics.add.collider(this.player, this.furnitureManager.shelvesGroup)
    this.physics.add.collider(this.player, this.furnitureManager.tablesGroup)
    this.physics.add.collider(this.player, this.furnitureManager.cashierGroup)
    this.physics.add.collider(this.player, this.environmentManager.wallsGroup)

    // 7. Cấu hình phím
    this.setupInputs()

    // 8. Camera
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05)
    this.cameras.main.setZoom(1)
    
    // 9. Lắng nghe Store changes
    this.setupStoreSubscriptions(gameStore)

    // 10. Khởi động vòng lặp spawn NPC
    this.time.addEvent({
      delay: 3000,
      callback: () => this.npcManager.spawnNPC(),
      loop: true
    })

    // 11. Khởi động vòng lặp thời gian (Tick mỗi giây thực = 1 phút game)
    // Chỉ tick khi shop đang MỞ CỬA
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (gameStore.shopState === 'OPEN') {
          gameStore.tickTime(1)
        }
      },
      loop: true
    })

    // 12. Thiết lập kéo Camera (Drag to Pan)
    this.setupCameraDrag()

    // Khởi tạo môi trường lần đầu (Vẽ shop)
    this.environmentManager.refreshEnvironment()
  }

  private setupAnimations() {
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
  }

  private setupUI() {
    this.editText = this.add.text(this.cameras.main.width / 2, 80, 'SHOP SETUP MODE', { 
      fontSize: '32px', 
      color: '#00ffff', 
      fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(DEPTH.UI).setScrollFactor(0).setVisible(false)
  }

  private setupInputs() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        p: Phaser.Input.Keyboard.KeyCodes.P
      }) as any
      
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
      
      this.input.keyboard.on('keydown-X', () => {
        useGameStore().toggleEditMode()
      })
    }
  }

  /**
   * Thiết lập tính năng kéo Camera bằng chuột phải hoặc chuột giữa.
   */
  private setupCameraDrag() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Chuột phải (2) hoặc chuột giữa (1)
      if (pointer.button === 1 || pointer.button === 2) {
        this.isDraggingCamera = true
        this.cameras.main.stopFollow() // Dừng follow để kéo tự do
        
        this.dragStartX = pointer.x
        this.dragStartY = pointer.y
        this.camStartX = this.cameras.main.scrollX
        this.camStartY = this.cameras.main.scrollY
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingCamera) {
        const dx = pointer.x - this.dragStartX
        const dy = pointer.y - this.dragStartY
        
        this.cameras.main.scrollX = this.camStartX - dx
        this.cameras.main.scrollY = this.camStartY - dy
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 1 || pointer.button === 2) {
        this.isDraggingCamera = false
        
        // (Tùy chọn) Để camera quay lại follow player sau 2s không tương tác
        this.time.delayedCall(2000, () => {
          if (!this.isDraggingCamera && (this.player.body!.velocity.x !== 0 || this.player.body!.velocity.y !== 0)) {
            this.cameras.main.startFollow(this.player, true, 0.05, 0.05)
          }
        })
      }
    })

    // Ngăn chặn menu chuột phải trình duyệt
    this.input.mouse?.disableContextMenu()
  }

  private setupStoreSubscriptions(gameStore: any) {
    const statsStore = useStatsStore()
    const shopStore = useShopStore()

    let lastExpansionLevel = statsStore.expansionLevel
    let lastSettings = JSON.stringify(statsStore.settings)

    // Lắng nghe statsStore (Cài đặt, Level)
    statsStore.$subscribe((_mutation, state) => {
      const currentSettings = JSON.stringify(state.settings)
      if (state.expansionLevel !== lastExpansionLevel || currentSettings !== lastSettings) {
        console.log("DEBUG: statsStore changed, refreshing environment")
        lastExpansionLevel = state.expansionLevel
        lastSettings = currentSettings
        this.environmentManager.refreshEnvironment()
      }
    })

    // Lắng nghe shopState thay đổi (ví dụ: spawn NPC khi mở cửa)
    shopStore.$subscribe((_mutation, state) => {
       // Refresh khi mở rộng hoặc thay đổi trạng thái shop
       if (state.shopState === 'OPEN') {
         // Thực hiện các logic khi mở cửa nếu cần
       }
    })

    gameStore.$subscribe((_mutation: any, state: any) => {
      if (state.showEndDayModal) {
        this.npcManager.cleanupAllNPCs()
      }
    })
  }

  update(time: number) {
    if (!this.cursors || !this.player.body || !this.keyE) return

    const store = useGameStore()

    // 1. Cập nhật Managers
    this.npcManager.update()
    this.furnitureManager.updateFurnitureVisuals()

    // 2. Tương tác phím E
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.handlePlayerInteraction(store)
    }

    // 3. Auto Checkout
    this.handleAutoCheckout(time)

    // 4. Build & Edit Mode
    if (store.isBuildMode || store.isEditMode) {
      this.handleBuildMode(store)
      this.player.setVelocity(0)
      this.player.anims.stop()
    } else {
      this.handlePlayerMovement()
      this.clearGhostIfNecessary()
    }

    // 5. Edit Overlay Visual
    this.updateEditOverlay(store)

    // 6. Diagnostics
    if (Phaser.Input.Keyboard.JustDown(this.cursors.p)) {
      this.runDiagnostics()
    }
  }

  private handlePlayerInteraction(store: any) {
    // Check Cashier
    let nearestCashier = this.getNearestFromGroup(this.furnitureManager.cashierGroup, 80)
    if (nearestCashier && store.waitingCustomers > 0) {
      store.serveCustomer()
      return
    }

    // Check Shelf
    let nearestShelf = this.getNearestFromGroup(this.furnitureManager.shelvesGroup, 70)
    if (nearestShelf) {
      store.openShelfManagement(nearestShelf.getData('id'))
    }
  }

  private getNearestFromGroup(group: Phaser.Physics.Arcade.StaticGroup, maxDist: number): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null
    let minDist = maxDist
    group.getChildren().forEach(child => {
      const sprite = child as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y)
      if (dist < minDist) {
        minDist = dist
        nearest = sprite
      }
    })
    return nearest
  }

  private handlePlayerMovement() {
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
      this.player.body!.velocity.normalize().scale(speed)
      if (this.cursors.left.isDown) this.player.anims.play('player-left', true)
      else if (this.cursors.right.isDown) this.player.anims.play('player-right', true)
      else if (this.cursors.up.isDown) this.player.anims.play('player-up', true)
      else if (this.cursors.down.isDown) this.player.anims.play('player-down', true)
    } else {
      this.player.anims.stop()
    }
  }

  private handleAutoCheckout(time: number) {
    const store = useGameStore()
    if (store.waitingCustomers <= 0) return

    const cashier = store.hiredWorkers.find((w: any) => w.duty === 'CASHIER')
    if (!cashier) return

    const workerData = WORKERS.find(w => w.id === cashier.workerId)
    if (!workerData) return

    const cooldown = SPEED_TO_MS[workerData.checkoutSpeed]
    if (time > this.lastAutoCheckoutTime + cooldown) {
      store.serveCustomer()
      this.lastAutoCheckoutTime = time
      
      const cashierSprite = this.staffSprites.get(cashier.instanceId)
      if (cashierSprite) {
        const pulse = this.add.text(cashierSprite.x, cashierSprite.y - 40, '💳 Auto', { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5)
        this.tweens.add({ targets: pulse, y: pulse.y - 20, alpha: 0, duration: 1000, onComplete: () => pulse.destroy() })
      }
    }
  }

  private handleBuildMode(store: any) {
    const pointer = this.input.activePointer

    // Edit logic (Pick up)
    if (store.isEditMode && !store.isBuildMode) {
      if (pointer.isDown && this.time.now > this.lastPlacementTime + 200) {
        this.handleFurniturePickup(pointer, store)
      }
      return
    }

    if (!store.isBuildMode) return

    // Placement logic (Ghost)
    this.updateGhostPosition(pointer, store)
    this.drawPlacementVisualizer()

    // Validation
    this.isPlacementValid = this.validatePlacement(pointer)
    this.updateGhostVisual()

    // Place item
    if (pointer.isDown && this.isPlacementValid && this.time.now > this.lastPlacementTime + 300) {
       this.placeFurniture(pointer, store)
    }

    // Cancel logic
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    if (Phaser.Input.Keyboard.JustDown(escKey!) || pointer.rightButtonDown()) {
      this.cancelPlacement(store)
    }
  }

  private handleFurniturePickup(pointer: Phaser.Input.Pointer, store: any) {
    let found = false
    const checkGroups = [
      { group: this.furnitureManager.cashierGroup, type: 'cashier' as const },
      { group: this.furnitureManager.shelvesGroup, type: 'shelf' as const },
      { group: this.furnitureManager.tablesGroup, type: 'table' as const }
    ]

    for (const { group, type } of checkGroups) {
      group.getChildren().forEach(child => {
        const sprite = child as Phaser.Physics.Arcade.Sprite
        const bounds = type === 'table' ? new Phaser.Geom.Rectangle(sprite.x - 30, sprite.y - 20, 60, 40) : sprite.getBounds()
        
        if (bounds.contains(pointer.worldX, pointer.worldY)) {
          const id = sprite.getData('id')
          if (store.pickUpFurniture(id, type)) {
            found = true
            this.furnitureManager.removeFurniture(id, type)
            sprite.destroy()
            this.lastPlacementTime = this.time.now
          }
        }
      })
      if (found) break
    }
  }

  private updateGhostPosition(pointer: Phaser.Input.Pointer, store: any) {
    if (!this.ghostSprite && !this.ghostRectangle) {
      const isTable = store.buildItemId === 'play_table' || store.editFurnitureData?.type === 'table'
      const isCashier = store.buildItemId === 'cashier_desk' || store.editFurnitureData?.type === 'cashier'
      
      if (isTable) {
        this.ghostRectangle = this.add.rectangle(0, 0, 60, 40, 0x7f8c8d).setStrokeStyle(2, 0x95a5a6)
        this.ghostRectangle.setAlpha(0.6).setDepth(DEPTH.GHOST)
        this.ghostText = this.add.text(0, 0, 'TABLE', { fontSize: '10px', color: '#fff' }).setOrigin(0.5)
        this.ghostText.setAlpha(0.6).setDepth(DEPTH.GHOST + 1)
      } else {
        const texture = isCashier ? 'cashier' : 'shelf'
        this.ghostSprite = this.add.sprite(0, 0, texture)
        this.ghostSprite.setAlpha(0.6).setDepth(DEPTH.GHOST)
      }
    }

    if (this.ghostRectangle) {
      this.ghostRectangle.setPosition(pointer.worldX, pointer.worldY)
      if (this.ghostText) this.ghostText.setPosition(pointer.worldX, pointer.worldY)
    } else if (this.ghostSprite) {
      this.ghostSprite.setPosition(pointer.worldX, pointer.worldY)
    }
  }

  private validatePlacement(pointer: Phaser.Input.Pointer): boolean {
    const pad = 30
    const bounds = this.environmentManager.getShopBounds()
    
    // 1. Check Shop Bounds
    if (pointer.worldX < bounds.x + pad || pointer.worldX > bounds.x + bounds.w - pad ||
        pointer.worldY < bounds.y + pad || pointer.worldY > bounds.y + bounds.h - pad) {
      return false
    }

    // 2. Check Collisions
    const w = this.ghostRectangle ? 60 : 40
    const h = this.ghostRectangle ? 40 : 40
    const rect = new Phaser.Geom.Rectangle(pointer.worldX - w/2, pointer.worldY - h/2, w, h)

    let collided = false
    const obstacleGroups = [
      this.environmentManager.wallsGroup,
      this.furnitureManager.cashierGroup,
      this.furnitureManager.shelvesGroup,
      this.furnitureManager.tablesGroup
    ]

    for (const group of obstacleGroups) {
      group.getChildren().forEach(child => {
        const sprite = child as any
        if (useGameStore().editFurnitureData?.id === sprite.getData('id')) return
        
        const b = (child instanceof Phaser.Physics.Arcade.Sprite && sprite.texture.key === '') ? 
                  new Phaser.Geom.Rectangle(sprite.x - 30, sprite.y - 20, 60, 40) : 
                  sprite.getBounds()
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, b)) collided = true
      })
      if (collided) return false
    }

    // 3. Distance to Player
    if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.player.x, this.player.y) < 50) return false

    return true
  }

  private updateGhostVisual() {
    const color = this.isPlacementValid ? 0x00ff00 : 0xff0000
    if (this.ghostRectangle) this.ghostRectangle.setFillStyle(this.isPlacementValid ? 0x7f8c8d : 0xff0000, 0.6)
    else if (this.ghostSprite) this.ghostSprite.setTint(color)
  }

  private placeFurniture(pointer: Phaser.Input.Pointer, store: any) {
    const placedData = store.placeFurniture(pointer.worldX, pointer.worldY)
    this.lastPlacementTime = this.time.now
    
    if (placedData) {
      this.furnitureManager.addFurnitureToScene(placedData)
    }
    this.clearGhost()
  }

  private cancelPlacement(store: any) {
    if (store.editFurnitureData) store.warehouseFurniture()
    else store.cancelBuildMode()
    this.clearGhost()
  }

  private clearGhost() {
    if (this.ghostRectangle) {
      this.ghostRectangle.destroy()
      this.ghostRectangle = null
      if (this.ghostText) this.ghostText.destroy()
      this.ghostText = null
    }
    if (this.ghostSprite) {
      this.ghostSprite.destroy()
      this.ghostSprite = null
    }
    this.placementGraphics.clear()
  }

  private clearGhostIfNecessary() {
    if (this.ghostSprite || this.ghostRectangle) this.clearGhost()
  }

  /**
   * Draws the visualizer for placement obstacles.
   */
  private drawPlacementVisualizer() {
    this.placementGraphics.clear()
    this.placementGraphics.fillStyle(0xff0000, 0.3)
    
    const store = useGameStore()
    const obstacleGroups = [
      this.environmentManager.wallsGroup,
      this.furnitureManager.cashierGroup,
      this.furnitureManager.shelvesGroup,
      this.furnitureManager.tablesGroup
    ]

    obstacleGroups.forEach(group => {
      group.getChildren().forEach(child => {
        const sprite = child as Phaser.Physics.Arcade.Sprite
        if (store.editFurnitureData?.id === sprite.getData('id')) return
        const b = sprite.getBounds()
        this.placementGraphics.fillRect(b.x, b.y, b.width, b.height)
      })
    })
  }

  private updateEditOverlay(store: any) {
    this.editOverlay.clear()
    if (store.isEditMode) {
      this.editOverlay.lineStyle(15, 0x00ffff, 0.4)
      this.editOverlay.strokeRect(0, 0, this.scale.width, this.scale.height)
      this.editText.setVisible(true)
    } else {
      this.editText.setVisible(false)
    }
  }

  private runDiagnostics() {
    const store = useGameStore()
    console.log("=== DIAGNOSTIC REPORT ===")
    console.log("NPC Count:", this.npcManager.getNPCCount())
    console.log("Placed Tables:", Object.keys(store.placedTables).length)
    console.log("Expansion Level:", store.expansionLevel)
    console.log("===============================")
  }
}
