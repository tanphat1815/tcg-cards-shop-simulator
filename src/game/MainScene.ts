import Phaser from 'phaser'
import { useGameStore } from '../stores/gameStore'
import playerImg from '../assets/images/player.svg'
import npcImg from '../assets/images/npc.svg'
import shelfImg from '../assets/images/shelf.svg'
import cashierImg from '../assets/images/cashier.svg'
import { WORKERS, SPEED_TO_MS } from '../config/workerData'
import { BASE_SHOP_WIDTH, BASE_SHOP_HEIGHT, TILE_SIZE, getExpansionDimensions } from '../config/expansionData'
import { DEPTH } from '../config/renderConfigs'

type NPCState = 'SPAWN' | 'WANDER' | 'SEEK_ITEM' | 'INTERACT' | 'GO_CASHIER' | 'WAITING' | 'LEAVE' | 'WANT_TO_PLAY' | 'SEEK_TABLE' | 'PLAYING'

interface Customer {
  sprite: Phaser.Physics.Arcade.Sprite;
  state: NPCState;
  timer: number;
  targetX: number;
  targetY: number;
  targetPrice: number;
  intent?: 'BUY' | 'PLAY';
  assignedTableId?: string | null;
  seatIndex?: number | null;
  spawnTime: number;         // Time when NPC entered shop
  lastDecisionTime: number;  // For periodic AI re-scans
  statusText?: Phaser.GameObjects.Text; // Overhead popover
  lastMoveAttemptTime?: number; // For stuck recovery logic
  instanceId: string; // Persistent ID for this NPC
  checkedShelfIds: string[]; // Remember shelves visited but empty
  searchStartTime?: number; // Time when NPC started searching for a table/shelf
}

export default class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private customers: Customer[] = []
  private cashierQueue: Customer[] = []
  private shelvesGroup!: Phaser.Physics.Arcade.StaticGroup
  private tablesGroup!: Phaser.Physics.Arcade.StaticGroup
  private cashierGroup!: Phaser.Physics.Arcade.StaticGroup
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup
  private wallTop!: Phaser.GameObjects.Rectangle
  private wallLeft!: Phaser.GameObjects.Rectangle
  private wallRight!: Phaser.GameObjects.Rectangle
  private wallBottomLeft!: Phaser.GameObjects.Rectangle
  private wallBottomRight!: Phaser.GameObjects.Rectangle
  private keyE!: Phaser.Input.Keyboard.Key
  private shelfTexts: Record<string, Phaser.GameObjects.Text> = {}
  private tableVisuals: Record<string, { rect: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text }> = {}
  private ghostSprite: Phaser.GameObjects.Sprite | null = null
  private ghostRectangle: Phaser.GameObjects.Rectangle | null = null
  private ghostText: Phaser.GameObjects.Text | null = null
  private isPlacementValid: boolean = false
  private staffSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map()
  private lastAutoCheckoutTime: number = 0
  private floorGraphics!: Phaser.GameObjects.Graphics
  private wallGraphics!: Phaser.GameObjects.Graphics
  private outsideGraphics!: Phaser.GameObjects.Graphics
  private previewGraphics!: Phaser.GameObjects.Graphics
  private placementGraphics!: Phaser.GameObjects.Graphics
  private editOverlay!: Phaser.GameObjects.Graphics
  private editText!: Phaser.GameObjects.Text
  private doorLocation = { x: 0, y: 0 }
  private shopBounds = { x: 0, y: 0, w: 0, h: 0 }
  private lastPlacementTime: number = 0

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
    this.outsideGraphics = this.add.graphics().setDepth(DEPTH.OUTSIDE)
    this.floorGraphics = this.add.graphics().setDepth(DEPTH.FLOOR)
    this.wallGraphics = this.add.graphics().setDepth(DEPTH.WALL_GRAPHICS)
    this.placementGraphics = this.add.graphics().setDepth(DEPTH.PLACEMENT_VISUALIZER)
    this.previewGraphics = this.add.graphics().setDepth(DEPTH.PREVIEW)

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
    this.tablesGroup = this.physics.add.staticGroup()
    this.cashierGroup = this.physics.add.staticGroup()
    this.wallsGroup = this.physics.add.staticGroup()

    // Khởi tạo 5 khối tường "vĩnh cửu" (tàng hình)
    this.wallTop = this.add.rectangle(0, 0, 10, 10, 0x00ff00, 0)
    this.wallLeft = this.add.rectangle(0, 0, 10, 10, 0x00ff00, 0)
    this.wallRight = this.add.rectangle(0, 0, 10, 10, 0x00ff00, 0)
    this.wallBottomLeft = this.add.rectangle(0, 0, 10, 10, 0x00ff00, 0)
    this.wallBottomRight = this.add.rectangle(0, 0, 10, 10, 0x00ff00, 0)

    // Kích hoạt vật lý cho chúng
    const walls = [this.wallTop, this.wallLeft, this.wallRight, this.wallBottomLeft, this.wallBottomRight]
    walls.forEach(w => {
      this.physics.add.existing(w, true)
      this.wallsGroup.add(w)
    })
    console.log("DEBUG: Physical walls initialized")

    // Render các vật thể đã đặt từ Store
    Object.values(gameStore.placedCashiers).forEach(cashierData => {
      this.addCashierToScene(cashierData)
    })

    // Thiết lập giới hạn thế giới rộng lớn (3000x3000px)
    this.physics.world.setBounds(0, 0, 3000, 3000)

    // Khởi tạo môi trường shop & bounds
    this.refreshEnvironment()

    // Render các vật thể đã đặt từ Store
    Object.values(gameStore.placedShelves).forEach(shelfData => {
      this.addShelfToScene(shelfData)
    })
    Object.values(gameStore.placedTables).forEach(tableData => {
      this.addTableToScene(tableData)
    })

    // Player
    this.player = this.physics.add.sprite(this.shopBounds.x + 150, this.shopBounds.y + 150, 'player')
    this.player.setCollideWorldBounds(true).setDepth(DEPTH.PLAYER)

    // Va chạm
    this.physics.add.collider(this.player, this.shelvesGroup)
    this.physics.add.collider(this.player, this.tablesGroup)
    this.physics.add.collider(this.player, this.cashierGroup)
    this.physics.add.collider(this.player, this.wallsGroup)

    // Cấu hình phím
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        p: Phaser.Input.Keyboard.KeyCodes.P
      }) as any
      
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    }

    // Spawn khách định kỳ
    this.time.addEvent({
      delay: 3000,
      callback: this.spawnCustomer,
      callbackScope: this,
      loop: true
    })

    this.input.keyboard?.on('keydown-X', () => {
      gameStore.toggleEditMode()
    })

    // Edit Mode UI
    this.editOverlay = this.add.graphics().setDepth(DEPTH.PREVIEW - 5).setScrollFactor(0)
    this.editText = this.add.text(this.cameras.main.width / 2, 80, 'SHOP SETUP MODE', { 
      fontSize: '32px', 
      color: '#00ffff', 
      fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT + 100).setScrollFactor(0).setVisible(false)

    // Camera Setup
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05)
    this.cameras.main.setZoom(1)
    
    // Lắng nghe thay đổi store
    let lastWaitingCount = gameStore.waitingCustomers
    let lastExpansionLevel = gameStore.expansionLevel
    let lastSettings = JSON.stringify(gameStore.settings)
    let lastEndDayModalState = gameStore.showEndDayModal

    gameStore.$subscribe((mutation, state) => {
      const currentSettings = JSON.stringify(state.settings)
      // CHỈ gọi refreshEnvironment khi thực sự cần thiết
      if (state.expansionLevel !== lastExpansionLevel || currentSettings !== lastSettings) {
        lastExpansionLevel = state.expansionLevel
        lastSettings = currentSettings
        this.refreshEnvironment()
      }

      if (state.waitingCustomers < lastWaitingCount) {
        if (this.cashierQueue.length > 0) {
          const servedCust = this.cashierQueue.shift()!
          
          const rand = Math.random();
          const store = useGameStore();
          const hasFreeTable = Object.values(store.placedTables).some(t => t.occupants.includes(null));

          if (rand < 0.3 && hasFreeTable) {
            // Ở lại chơi bài
            servedCust.intent = 'PLAY';
            servedCust.state = 'WANT_TO_PLAY';
            servedCust.searchStartTime = state.timeInMinutes; // Sử dụng time từ store cho đồng nhất
          } else {
            this.npcLeaveShop(servedCust);
          }
        }
      }
      if (state.showEndDayModal && !lastEndDayModalState) {
        // CLEANUP ALL NPCs FOR NEXT DAY
        this.customers.forEach(c => {
          if (c.statusText) c.statusText.destroy()
          c.sprite.destroy()
        })
        this.customers = []
        this.cashierQueue = []
      }
      lastEndDayModalState = state.showEndDayModal
      lastWaitingCount = state.waitingCustomers
    })

    // Khởi tạo môi trường lần đầu
    this.refreshEnvironment()
  }

  private refreshEnvironment() {
    console.log("DEBUG: refreshEnvironment started")
    try {
      const store = useGameStore()
      const { extraW, extraH } = getExpansionDimensions(store.expansionLevel)
    
    const shopW = BASE_SHOP_WIDTH + extraW
    const shopH = BASE_SHOP_HEIGHT + extraH
    const startX = 1000
    const startY = 1000
    
    this.shopBounds = { x: startX, y: startY, w: shopW, h: shopH }
    this.doorLocation = { x: startX + shopW / 2, y: startY + shopH }

    // Camera Bounds (Bám theo không gian thế giới rộng đã thiết lập ở create)
    const worldPad = 400
    this.cameras.main.setBounds(0, 0, 3000, 3000)

    // Vẽ Outside
    this.outsideGraphics.clear()
    this.outsideGraphics.fillStyle(0x1a1a1a, 1) // Dark street
    this.outsideGraphics.fillRect(0, 0, 3000, 3000)
    
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
    
    // ĐÃ XÓA: this.cashierDesk.setPosition(...) 
    // Giữ nguyên vị trí tuyệt đối từ create

    // DRAW PREVIEW
    this.previewGraphics.clear()
    if (store.settings.showExpansionPreview) {
      const nextDim = getExpansionDimensions(store.expansionLevel + 1)
      const nextW = BASE_SHOP_WIDTH + nextDim.extraW
      const nextH = BASE_SHOP_HEIGHT + nextDim.extraH
      
      if (store.settings.expansionPreviewStyle === 'BLUEPRINT') {
        this.previewGraphics.lineStyle(2, 0x00ffff, 0.4)
        // Dash logic (simplified via multiple strokes if needed or manual)
        // Phaser graphics doesn't have native dashed line but we can simulate
        this.drawDashedRect(startX, startY, nextW, nextH, 0x00ffff)
      } else {
        // GLOW Style
        // Outer glow
        for (let i = 1; i <= 3; i++) {
           this.previewGraphics.lineStyle(2 * i, 0xffffff, 0.1)
           this.previewGraphics.strokeRect(startX - i, startY - i, nextW + i*2, nextH + i*2)
        }
        this.previewGraphics.lineStyle(2, 0xffffff, 0.8)
        this.previewGraphics.strokeRect(startX, startY, nextW, nextH)
      }
    }

    this.updatePhysicalWalls()
    console.log("DEBUG: refreshEnvironment finished")
    } catch (err) {
      console.error("CRITICAL: refreshEnvironment failed!", err)
    }
  }

  private drawDashedRect(x: number, y: number, w: number, h: number, color: number) {
    const dashLen = 10
    const gapLen = 5
    this.previewGraphics.lineStyle(2, color, 0.5)
    
    const drawDashedLine = (x1: number, y1: number, x2: number, y2: number) => {
      let curX = x1; let curY = y1
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const cos = Math.cos(angle); const sin = Math.sin(angle)
      const totalDist = Math.sqrt((x2-x1)**2 + (y2-y1)**2)
      let dist = 0
      while (dist < totalDist) {
        this.previewGraphics.lineBetween(curX, curY, curX + cos * Math.min(dashLen, totalDist - dist), curY + sin * Math.min(dashLen, totalDist - dist))
        curX += cos * (dashLen + gapLen)
        curY += sin * (dashLen + gapLen)
        dist += (dashLen + gapLen)
      }
    }

    drawDashedLine(x, y, x + w, y)
    drawDashedLine(x + w, y, x + w, y + h)
    drawDashedLine(x + w, y + h, x, y + h)
    drawDashedLine(x, y + h, x, y)
  }

  private updatePhysicalWalls() {
    const { x, y, w, h } = this.shopBounds;
    const thickness = 40;
    const doorWidth = 80;
    const sideWallWidth = (w - doorWidth) / 2;

    console.log(`DEBUG: updatePhysicalWalls - ShopBounds X:${x} Y:${y} W:${w} H:${h}`);

    const updateBody = (rect: Phaser.GameObjects.Rectangle) => {
      if (rect && rect.body) {
        (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      } else {
        console.warn("DEBUG: Wall body missing, re-initializing physics for rectangle");
        this.physics.add.existing(rect, true);
      }
    };

    // Top wall
    this.wallTop.setPosition(x + w / 2, y - thickness / 2);
    this.wallTop.setSize(w, thickness);
    updateBody(this.wallTop);

    // Left wall
    this.wallLeft.setPosition(x - thickness / 2, y + h / 2);
    this.wallLeft.setSize(thickness, h);
    updateBody(this.wallLeft);

    // Right wall
    this.wallRight.setPosition(x + w + thickness / 2, y + h / 2);
    this.wallRight.setSize(thickness, h);
    updateBody(this.wallRight);

    // Bottom Left
    this.wallBottomLeft.setPosition(x + sideWallWidth / 2, y + h + thickness / 2);
    this.wallBottomLeft.setSize(sideWallWidth, thickness);
    updateBody(this.wallBottomLeft);

    // Bottom Right
    this.wallBottomRight.setPosition(x + w - sideWallWidth / 2, y + h + thickness / 2);
    this.wallBottomRight.setSize(sideWallWidth, thickness);
    updateBody(this.wallBottomRight);

    console.log("DEBUG: updatePhysicalWalls - completed");
  }

  spawnCustomer() {
    if (useGameStore().shopState !== 'OPEN') return
    if (this.customers.length >= 10) return

    // Khách bắt đầu từ cửa
    const npcSprite = this.physics.add.sprite(this.doorLocation.x, this.doorLocation.y + 50, 'npc')
    npcSprite.setCollideWorldBounds(true).setDepth(DEPTH.NPC)

    const isPlayer = Math.random() < 0.3

    const instanceId = `npc_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const newCust: Customer = {
      sprite: npcSprite,
      state: 'SPAWN' as NPCState,
      timer: this.time.now + 500,
      targetX: this.doorLocation.x,
      targetY: this.doorLocation.y - 40, // Đi vào trong shop
      targetPrice: 0,
      intent: isPlayer ? 'PLAY' : 'BUY',
      spawnTime: this.time.now,
      lastDecisionTime: this.time.now,
      lastMoveAttemptTime: this.time.now,
      instanceId,
      checkedShelfIds: [],
      searchStartTime: this.time.now
    }

    newCust.statusText = this.add.text(npcSprite.x, npcSprite.y - 35, '...', {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT).setVisible(true)

    console.log(`[SPAWN] NPC spawned with intent: ${newCust.intent}`)
    this.customers.push(newCust)

    // Thêm va chạm
    this.physics.add.collider(npcSprite, this.shelvesGroup)
    // Đã xóa va chạm với bàn để NPC có thể đi vào vị trí ngồi (ghế)
    this.physics.add.collider(npcSprite, this.wallsGroup)

    this.physics.moveTo(npcSprite, this.doorLocation.x, this.doorLocation.y - 40, 100)
  }

  update(time: number, _delta: number) {
    if (!this.cursors || !this.player.body || !this.keyE) return

    const store = useGameStore()

    // --- TỰ ĐỘNG DỌN DẸP KHÁCH MA (Mỗi 5 giây) & CẬP NHẬT NHÃN BÀN ---
    if (time % 5000 < 20) {
      this.cleanupGhostOccupants();
    }
    this.updateTableVisuals();

    // Bắt sự kiện ấn phím E (chỉ tính 1 lần ấn xuống JustDown)
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      
      // Tương tác Cashier
      let nearestCashier: Phaser.Physics.Arcade.Sprite | null = null
      let minDist = 999
      this.cashierGroup.getChildren().forEach(child => {
        const c = child as Phaser.Physics.Arcade.Sprite
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y)
        if (dist < minDist) {
          minDist = dist
          nearestCashier = c
        }
      })

      if (nearestCashier && minDist < 80) {
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

    // --- Build & Edit Mode Logic ---
    if (store.isBuildMode || store.isEditMode) {
      this.handleBuildMode()
      return // Dừng các logic di chuyển khi đang ở Build/Edit Mode
    } else if (this.ghostSprite) {
      this.ghostSprite.destroy()
      this.ghostSprite = null
    }

    // Update Edit Mode UI
    this.editOverlay.clear()
    if (store.isEditMode) {
      const sw = this.scale.width
      const sh = this.scale.height
      this.editOverlay.lineStyle(15, 0x00ffff, 0.4)
      this.editOverlay.strokeRect(0, 0, sw, sh)
      this.editText.setPosition(sw / 2, 80)
      this.editText.setVisible(true)
    } else {
      this.editText.setVisible(false)
      // 6. Handle Debug Key P
    if (this.input.keyboard && (this.cursors as any).p && Phaser.Input.Keyboard.JustDown((this.cursors as any).p)) {
      const store = useGameStore()
      this.cleanupGhostOccupants(); // Dọn dẹp ngay khi nhấn P
      console.log("=== DIAGNOSTIC REPORT (Key P) ===")
      console.log("Placed Tables Count:", Object.keys(store.placedTables).length)
      console.log("Placed Tables Map:", JSON.parse(JSON.stringify(store.placedTables)))
      console.log("NPC Customers Count:", this.customers.length)
      console.log("NPC Intents:", this.customers.map((c, idx) => `NPC ${idx}: ${c.intent} (State: ${c.state})`).join(", "))
      console.log("===============================")
    }
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
    const primaryCashier = this.cashierGroup.getFirstAlive() as Phaser.Physics.Arcade.Sprite
    this.cashierQueue.forEach((cust, idx) => {
       if (primaryCashier) {
         cust.targetX = primaryCashier.x
         cust.targetY = primaryCashier.y + 110 + idx * 45
       } else {
         cust.targetX = 600
         cust.targetY = 220 + idx * 45
       }
    })

    // Removed: Auto Show End Day Modal (Now manual via button)

    // NPC Logic
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const customer = this.customers[i]
      const sprite = customer.sprite
      const npcSpeed = 100

      // Animation NPC & Status Position
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

      // Status Position & Content
      if (customer.statusText) {
        customer.statusText.setPosition(sprite.x, sprite.y - 35)
        
        let label = '...'
        switch (customer.state) {
          case 'SPAWN': label = 'Entering...'; break;
          case 'WANDER': label = customer.intent === 'PLAY' ? '🔍 Seeking Table' : '🔍 Seeking Cards'; break;
          case 'SEEK_ITEM': label = '📦 Going to shelf'; break;
          case 'INTERACT': label = '🛒 Picking items'; break;
          case 'GO_CASHIER': label = '🛒 To Cashier'; break;
          case 'WAITING': label = '⌛ Waiting in line'; break;
          case 'SEEK_TABLE': label = '🃏 Going to table'; break;
          case 'PLAYING': 
            const store = useGameStore();
            const table = customer.assignedTableId ? store.placedTables[customer.assignedTableId] : null;
            label = (table && table.matchStartedAt) ? '🃏 Playing match' : '⌛ Waiting for Opponent'; 
            break;
          case 'LEAVE': label = (time - customer.spawnTime > 40000) ? '😒 Bored - Leaving' : '👋 Leaving'; break;
        }
        customer.statusText.setText(label)
      }

      // Stuck Recovery Logic (Every 500ms)
      const moveStates: NPCState[] = ['WANDER', 'SEEK_ITEM', 'SEEK_TABLE', 'GO_CASHIER', 'LEAVE']
      if (moveStates.includes(customer.state) && time > (customer.lastMoveAttemptTime || 0) + 500) {
        customer.lastMoveAttemptTime = time
        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY)
        const isStuck = sprite.body && sprite.body.velocity.lengthSq() < 100 // Speed < 10
        
        if (dist > 15 && isStuck) {
           this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
        }
      }

      switch (customer.state) {
        case 'SPAWN':
          if (time > customer.timer) {
            customer.state = customer.intent === 'PLAY' ? 'WANT_TO_PLAY' : 'WANDER'
            customer.targetX = Phaser.Math.Between(this.shopBounds.x + 50, this.shopBounds.x + this.shopBounds.w - 50)
            customer.targetY = Phaser.Math.Between(this.shopBounds.y + 50, this.shopBounds.y + this.shopBounds.h - 50)
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          }
          break

        case 'WANT_TO_PLAY':
          // Tìm bàn trống
          const store = useGameStore()
          let bestTableId = null
          const tables = Object.values(store.placedTables)

          for (const table of tables) {
            const hasSpace = table.occupants && table.occupants.includes(null)
            if (hasSpace) {
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
                this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
            }
          } else {
            // Bỏ cuộc nếu tìm bàn quá lâu (10 giây)
            const searchTime = time - (customer.searchStartTime || 0);
            if (searchTime > 10000 || Math.random() < 0.2) {
              if (Math.random() < 0.6) {
                customer.intent = 'BUY'
                customer.checkedShelfIds = []
                customer.state = 'WANDER'
                customer.searchStartTime = time
              } else {
                this.npcLeaveShop(customer)
              }
            } else {
               customer.state = 'WANDER'
            }
          }
          break

        case 'SEEK_TABLE':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 12) {
            sprite.body!.velocity.set(0)
            customer.state = 'PLAYING'
            customer.timer = 0 // Wait for match start
          }
          break

        case 'PLAYING':
          const gStore = useGameStore()
          const myTable = gStore.placedTables[customer.assignedTableId!]
          if (!myTable) {
             customer.state = 'LEAVE'
             break
          }

          // Kiểm tra xem đã đủ 2 người chưa để bắt đầu match
          if (myTable.occupants.every(o => o !== null) && !myTable.matchStartedAt) {
             gStore.startMatch(myTable.id)
          }

          if (myTable.matchStartedAt) {
            const elapsed = Date.now() - myTable.matchStartedAt
            const duration = 12000 // 12 seconds
            
            // Icon thi đấu trên đầu
            if (time % 1000 < 50) {
               const emo = this.add.text(sprite.x, sprite.y - 40, '🃏', { fontSize: '16px' }).setOrigin(0.5)
               this.tweens.add({ targets: emo, y: emo.y - 20, alpha: 0, duration: 800, onComplete: () => emo.destroy() })
            }

            if (elapsed >= duration) {
               // Kết thúc trận đấu
               if (customer.seatIndex === 0) { // Chỉ 1 NPC gọi finish match dọn bàn
                  gStore.finishMatch(myTable.id)
                  gStore.gainExp(50)
                  const xpText = this.add.text(myTable.x, myTable.y - 60, '+50 XP', { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5)
                  this.tweens.add({ targets: xpText, y: xpText.y - 40, alpha: 0, duration: 2000, onComplete: () => xpText.destroy() })
               }
               this.npcLeaveShop(customer)
            }
          }
          break

        case 'WANDER':
          // Boredom logic: Leave after 45s of wandering/waiting
          if (time - customer.spawnTime > 45000) {
            this.npcLeaveShop(customer)
            break
          }

          // Periodic target re-scanning (every 1.5s)
          if (time > customer.lastDecisionTime + 1500) {
            customer.lastDecisionTime = time
            const store = useGameStore()

            if (customer.intent === 'PLAY') {
              // Re-check for tables
              let bestTableId = null
              const tables = Object.values(store.placedTables)
              
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
                  this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
                  break
                }
              } else {
                // Đang lang thang tìm bàn mà vẫn không thấy
                if (Math.random() < 0.3) {
                  customer.intent = 'BUY'
                  customer.checkedShelfIds = []
                }
              }
            } else {
              // Re-check for shelves with items
              let foundShelfId: string | null = null
              const shelves = Object.values(store.placedShelves)
              
              for (const shelf of shelves) {
                // Chỉ tìm kệ chưa kiểm tra (Tránh Loop)
                if (customer.checkedShelfIds.includes(shelf.id)) continue;

                const hasItems = shelf.tiers.some(t => t.slots.length > 0)
                if (hasItems) {
                  foundShelfId = shelf.id
                  break
                }
              }

              if (foundShelfId) {
                const shelf = store.placedShelves[foundShelfId]
                customer.state = 'SEEK_ITEM'
                customer.targetX = shelf.x
                customer.targetY = shelf.y + 45
                this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
                break
              } else {
                // Không tìm thấy kệ nào có hàng HOẶC shop chưa có kệ nào
                if (Math.random() < 0.4) {
                  if (Math.random() < 0.5) {
                    customer.intent = 'PLAY'
                    customer.state = 'WANT_TO_PLAY'
                    customer.searchStartTime = time
                  } else {
                    this.npcLeaveShop(customer)
                  }
                  break
                }
              }
            }
          }

          // Continue wandering if no target found
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 12) {
            sprite.body!.velocity.set(0)
            customer.targetX = Phaser.Math.Between(this.shopBounds.x + 50, this.shopBounds.x + this.shopBounds.w - 50)
            customer.targetY = Phaser.Math.Between(this.shopBounds.y + 50, this.shopBounds.y + this.shopBounds.h - 50)
            this.physics.moveTo(sprite, customer.targetX, customer.targetY, npcSpeed)
          }
          break

        case 'SEEK_ITEM':
          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 12) {
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
               if (Phaser.Math.Distance.Between(sprite.x, sprite.y, shelf.x, shelf.y + 45) < 15) {
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
              // Hụt hàng: Ghi nhớ kệ này và quyết định tiếp
              if (shelfIdToTake) {
                 customer.checkedShelfIds.push(shelfIdToTake);
              }

              const totalShelves = Object.keys(store.placedShelves).length;
              if (customer.checkedShelfIds.length >= totalShelves) {
                  // Đã kiểm tra hết toàn bộ kệ trong shop mà không có gì
                  const rand = Math.random();
                  if (rand < 0.4) {
                      // Đổi ý định sang đi chơi bài
                      customer.intent = 'PLAY';
                      customer.state = 'WANT_TO_PLAY';
                      customer.searchStartTime = time;
                  } else {
                      this.npcLeaveShop(customer);
                  }
              } else {
                  // Vẫn còn kệ chưa xem, đi lang thang tìm tiếp
                  customer.state = 'WANDER'
                  customer.targetX = Phaser.Math.Between(this.shopBounds.x + 20, this.shopBounds.x + this.shopBounds.w - 20)
                  customer.targetY = Phaser.Math.Between(this.shopBounds.y + 20, this.shopBounds.y + this.shopBounds.h - 20)
              }
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
          // Cleanup table occupancy if leaving
          if (customer.assignedTableId && customer.seatIndex !== undefined) {
             const gStore = useGameStore()
             const table = gStore.placedTables[customer.assignedTableId]
             if (table && table.occupants[customer.seatIndex!] === customer.instanceId) {
                table.occupants[customer.seatIndex!] = null
             }
          }

          // Failsafe: Force destroy if stuck in LEAVE for more than 15s
          if (time - (customer.timer || 0) > 15000 && customer.state === 'LEAVE') {
             if (customer.statusText) customer.statusText.destroy()
             sprite.destroy()
             this.customers.splice(i, 1)
             break
          }

          if (Phaser.Math.Distance.Between(sprite.x, sprite.y, customer.targetX, customer.targetY) < 15) {
            // CHỈ biến mất khi đã thực sự bước RA NGOÀI cửa (mục tiêu cuối cùng)
            if (customer.targetY > this.doorLocation.y) {
              if (customer.statusText) customer.statusText.destroy()
              sprite.destroy()
              this.customers.splice(i, 1) 
            }
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
        const primaryCashier = this.cashierGroup.getFirstAlive() as Phaser.Physics.Arcade.Sprite
        if (primaryCashier) {
          targetX = primaryCashier.x
          targetY = primaryCashier.y + 40
        } else {
          targetX = 600
          targetY = 150
        }
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
    shelf.setData('id', shelfData.id).setDepth(DEPTH.FURNITURE)
    shelf.refreshBody()

    // Tạo text báo hiệu
    this.shelfTexts[shelfData.id] = this.add.text(shelfData.x, shelfData.y - 50, '🪹 Empty', { 
      fontSize: '12px', 
      color: '#fff', 
      backgroundColor: '#000' 
    }).setOrigin(0.5).setDepth(DEPTH.UI_TEXT)
  }

  private addTableToScene(tableData: any) {
    // Cleanup any existing visuals for this ID to prevent ghosting
    if (this.tableVisuals[tableData.id]) {
        this.tableVisuals[tableData.id].rect.destroy()
        this.tableVisuals[tableData.id].label.destroy()
        delete this.tableVisuals[tableData.id]
    }

    const table = this.tablesGroup.create(tableData.x, tableData.y, undefined) as Phaser.Physics.Arcade.Sprite
    table.setSize(60, 40)
    table.setVisible(false)
    table.setData('id', tableData.id).setDepth(DEPTH.TABLE)

    const rect = this.add.rectangle(tableData.x, tableData.y, 60, 40, 0x7f8c8d).setStrokeStyle(2, 0x95a5a6).setData('id', tableData.id).setDepth(DEPTH.TABLE)
    const label = this.add.text(tableData.x, tableData.y, 'TABLE', { fontSize: '10px', color: '#fff' }).setOrigin(0.5).setData('id', tableData.id).setDepth(DEPTH.UI_TEXT)

    // Store visuals for cleanup
    this.tableVisuals[tableData.id] = { rect, label }
  }

  private addCashierToScene(cashierData: any) {
    const cashier = this.cashierGroup.create(cashierData.x, cashierData.y, 'cashier') as Phaser.Physics.Arcade.Sprite
    cashier.setData('id', cashierData.id).setDepth(DEPTH.CASHIER)
    cashier.refreshBody()
  }

  private handleBuildMode() {
    const store = useGameStore()
    const pointer = this.input.activePointer

    // 1. Logic chọn đồ nếu đang ở Edit Mode và chưa cầm gì
    if (store.isEditMode && !store.isBuildMode) {
      if (pointer.isDown && this.time.now > (this.lastPlacementTime || 0) + 200) {
        console.log(`DEBUG: Edit Mode Click at (${pointer.worldX.toFixed(0)}, ${pointer.worldY.toFixed(0)})`)
        let found = false

        // Kiểm tra click vào quầy thu ngân
        this.cashierGroup.getChildren().forEach(child => {
          const cashier = child as Phaser.Physics.Arcade.Sprite
          if (cashier.getBounds().contains(pointer.worldX, pointer.worldY)) {
            const id = cashier.getData('id')
            if (store.pickUpFurniture(id, 'cashier')) {
              found = true
              cashier.destroy()
              this.lastPlacementTime = this.time.now
            }
          }
        })

        // Kiểm tra click vào kệ
        this.shelvesGroup.getChildren().forEach(child => {
          const shelf = child as Phaser.Physics.Arcade.Sprite
          const bounds = shelf.getBounds()
          if (bounds.contains(pointer.worldX, pointer.worldY)) {
            const id = shelf.getData('id')
            console.log(`DEBUG: Clicked Shelf ID: ${id} at bounds: ${JSON.stringify(bounds)}`)
            if (store.pickUpFurniture(id, 'shelf')) {
              found = true
              if (this.shelfTexts[id]) {
                this.shelfTexts[id].destroy()
                delete this.shelfTexts[id]
              }
              shelf.destroy()
              this.lastPlacementTime = this.time.now
            }
          }
        })
        
        // Kiểm tra click vào bàn
        this.tablesGroup.getChildren().forEach(child => {
          const table = child as Phaser.Physics.Arcade.Sprite
          const tRect = new Phaser.Geom.Rectangle(table.x - 30, table.y - 20, 60, 40)
          if (tRect.contains(pointer.worldX, pointer.worldY)) {
            const id = table.getData('id')
            console.log(`DEBUG: Clicked Table ID: ${id}`)
            if (store.pickUpFurniture(id, 'table')) {
              found = true
              
              // Xóa hình ảnh bóng ma của bàn
              if (this.tableVisuals[id]) {
                this.tableVisuals[id].rect.destroy()
                this.tableVisuals[id].label.destroy()
                delete this.tableVisuals[id]
              }
              
              table.destroy()
              this.lastPlacementTime = this.time.now
            }
          }
        })

        if (!found) {
          console.log("DEBUG: No furniture found at click position")
        }
      }
      return
    }

    if (!store.isBuildMode) {
      this.placementGraphics.clear()
      return
    }

    // 2. Tạo ghost nếu chưa có
    if (!this.ghostSprite && !this.ghostRectangle) {
      const isTable = store.buildItemId === 'play_table' || store.editFurnitureData?.type === 'table'
      const isCashier = store.buildItemId === 'cashier_desk' || store.editFurnitureData?.type === 'cashier'
      
      if (isTable) {
        this.ghostRectangle = this.add.rectangle(pointer.worldX, pointer.worldY, 60, 40, 0x7f8c8d).setStrokeStyle(2, 0x95a5a6)
        this.ghostRectangle.setAlpha(0.6).setDepth(DEPTH.GHOST)
        this.ghostText = this.add.text(pointer.worldX, pointer.worldY, 'TABLE', { fontSize: '10px', color: '#fff' }).setOrigin(0.5)
        this.ghostText.setAlpha(0.6).setDepth(DEPTH.GHOST + 1)
      } else if (isCashier) {
        this.ghostSprite = this.add.sprite(pointer.worldX, pointer.worldY, 'cashier')
        this.ghostSprite.setAlpha(0.6).setDepth(DEPTH.GHOST)
      } else {
        this.ghostSprite = this.add.sprite(pointer.worldX, pointer.worldY, 'shelf')
        this.ghostSprite.setAlpha(0.6).setDepth(DEPTH.GHOST)
      }
    }

    // 3. Cập nhật vị trí ghost
    if (this.ghostRectangle) {
      this.ghostRectangle.x = pointer.worldX
      this.ghostRectangle.y = pointer.worldY
      if (this.ghostText) {
        this.ghostText.x = pointer.worldX
        this.ghostText.y = pointer.worldY
      }
    } else if (this.ghostSprite) {
      this.ghostSprite.x = pointer.worldX
      this.ghostSprite.y = pointer.worldY
    }

    // 4. Hiển thị vùng cấm (Visualizer)
    this.drawPlacementVisualizer()

    // 5. Kiểm tra va chạm
    this.isPlacementValid = true
    const pad = 30
    const inBounds = pointer.worldX >= this.shopBounds.x + pad && 
                     pointer.worldX <= this.shopBounds.x + this.shopBounds.w - pad &&
                     pointer.worldY >= this.shopBounds.y + pad && 
                     pointer.worldY <= this.shopBounds.y + this.shopBounds.h - pad
    
    if (!inBounds) this.isPlacementValid = false

    if (this.isPlacementValid) {
      const w = this.ghostRectangle ? 60 : 40
      const h = this.ghostRectangle ? 40 : 40
      if (this.checkCollision(pointer.worldX, pointer.worldY, w, h)) {
        this.isPlacementValid = false
      }
    }

    const distToPlayer = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.player.x, this.player.y)
    if (distToPlayer < 50) this.isPlacementValid = false

    // Visual feedback
    const color = this.isPlacementValid ? 0x00ff00 : 0xff0000
    if (this.ghostRectangle) {
      this.ghostRectangle.setFillStyle(this.isPlacementValid ? 0x7f8c8d : 0xff0000, 0.6)
    } else if (this.ghostSprite) {
      this.ghostSprite.setTint(color)
    }

    // 6. Click để đặt
    if (pointer.isDown && this.isPlacementValid && this.time.now > (this.lastPlacementTime || 0) + 300) {
       const placedData = store.placeFurniture(pointer.worldX, pointer.worldY)
       this.lastPlacementTime = this.time.now
       
       if (placedData) {
         if (placedData.furnitureId === 'play_table' || (placedData.type === 'table')) {
           this.addTableToScene(placedData)
         } else if (placedData.furnitureId === 'cashier_desk' || placedData.type === 'cashier') {
           this.addCashierToScene(placedData)
         } else {
           this.addShelfToScene(placedData)
         }
       }

       this.clearGhost()
    }

    // Phím Esc để hủy
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    const rightClick = pointer.rightButtonDown()

    if (Phaser.Input.Keyboard.JustDown(escKey!) || rightClick) {
      if (store.editFurnitureData) {
        store.warehouseFurniture()
      } else {
        store.cancelBuildMode()
      }
      this.clearGhost()
    }
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

  private drawPlacementVisualizer() {
    this.placementGraphics.clear()
    this.placementGraphics.fillStyle(0xff0000, 0.3)

    // 1. Tường
    this.wallsGroup.getChildren().forEach(child => {
      const wall = child as Phaser.GameObjects.Rectangle
      const bounds = wall.getBounds()
      this.placementGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    })

    // 2. Quầy thu ngân
    this.cashierGroup.getChildren().forEach(child => {
      const cashier = child as Phaser.Physics.Arcade.Sprite
      if (useGameStore().editFurnitureData?.id === cashier.getData('id')) return
      const cBounds = cashier.getBounds()
      this.placementGraphics.fillRect(cBounds.x - 20, cBounds.y - 20, cBounds.width + 40, cBounds.height + 40)
    })

    // 3. Kệ hàng khác
    this.shelvesGroup.getChildren().forEach(child => {
      const shelf = child as Phaser.Physics.Arcade.Sprite
      // Nếu đang bốc kệ này lên thì không vẽ vùng cấm của chính nó
      if (useGameStore().editFurnitureData?.id === shelf.getData('id')) return
      const bounds = shelf.getBounds()
      this.placementGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    })
    
    // 4. Bàn khác
    this.tablesGroup.getChildren().forEach(child => {
      const table = child as Phaser.Physics.Arcade.Sprite
      if (useGameStore().editFurnitureData?.id === table.getData('id')) return
      this.placementGraphics.fillRect(table.x - 30, table.y - 20, 60, 40)
    })
  }

  private checkCollision(x: number, y: number, width: number, height: number): boolean {
    const rect = new Phaser.Geom.Rectangle(x - width/2, y - height/2, width, height)

    // Check vs Walls
    let collided = false
    this.wallsGroup.getChildren().forEach(child => {
       if (Phaser.Geom.Intersects.RectangleToRectangle(rect, (child as any).getBounds())) collided = true
    })
    if (collided) return true

    // Check vs Cashier
    this.cashierGroup.getChildren().forEach(child => {
      const cashier = child as Phaser.Physics.Arcade.Sprite
      if (useGameStore().editFurnitureData?.id === cashier.getData('id')) return
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, cashier.getBounds())) collided = true
    })
    if (collided) return true

    // Check vs other Shelves
    this.shelvesGroup.getChildren().forEach(child => {
      const shelf = child as Phaser.Physics.Arcade.Sprite
      if (useGameStore().editFurnitureData?.id === shelf.getData('id')) return
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, shelf.getBounds())) collided = true
    })
    if (collided) return true

    // Check vs other Tables
    this.tablesGroup.getChildren().forEach(child => {
      const table = child as Phaser.Physics.Arcade.Sprite
      if (useGameStore().editFurnitureData?.id === table.getData('id')) return
      const tBounds = new Phaser.Geom.Rectangle(table.x - 30, table.y - 20, 60, 40)
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, tBounds)) collided = true
    })
    
    return collided
  }

  private cleanupGhostOccupants() {
    const store = useGameStore();
    // Chỉ những NPC thực sự đang chơi hoặc đang tìm bàn mới được coi là hợp lệ
    const validOccupants = this.customers
      .filter(c => (c.state === 'PLAYING' || c.state === 'SEEK_TABLE' || c.state === 'WANT_TO_PLAY') && c.assignedTableId)
      .map(c => c.instanceId);

    Object.values(store.placedTables).forEach(table => {
      table.occupants.forEach((occId, idx) => {
        if (occId && !validOccupants.includes(occId)) {
          console.log(`[CLEANUP] Flush ma ${occId} khỏi bàn ${table.id}`);
          table.occupants[idx] = null;
          // Nếu trận đấu đang diễn ra mà có ma bị đuổi, dừng trận đấu luôn
          if (table.matchStartedAt) {
             table.matchStartedAt = null;
          }
        }
      });
    });
  }

  private updateTableVisuals() {
    const store = useGameStore();
    Object.values(store.placedTables).forEach(tableData => {
      const visual = this.tableVisuals[tableData.id];
      if (visual) {
        const occCount = tableData.occupants.filter(o => o !== null).length;
        let statusStr = '';
        if (tableData.matchStartedAt) {
          statusStr = '🎮 ĐANG ĐẤU';
        } else if (occCount === 0) {
          statusStr = '🟢 TRỐNG';
        } else if (occCount === 1) {
          statusStr = '⌛ CHỜ... (1/2)';
        } else {
          statusStr = '🔴 ĐẦY';
        }
        visual.label.setText(`BÀN\n${occCount}/2\n${statusStr}`);
      }
    });
  }

  private npcLeaveShop(customer: Customer) {
    if (!customer.sprite.active) return;
    
    const npcSpeed = 100;
    customer.state = 'LEAVE';
    customer.timer = this.time.now; // Reset timer for failsafe
    
    // Giai đoạn 1: Di chuyển tới đường trục an toàn phía trên cửa (Avoid walls)
    // Tùy theo vị trí NPC mà chọn điểm buffer phù hợp
    // Nếu NPC đang ở quá sát trục giữa cửa, nó sẽ đi thẳng. 
    // Nếu NPC ở 2 bên, nó sẽ căn trục X trước.
    
    customer.targetX = customer.sprite.x;
    customer.targetY = this.doorLocation.y - 120; // Luôn đứng trên vách tường 1 đoạn
    this.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, npcSpeed);

    // Giai đoạn 2: Sau 0.8s, đi tới điểm AXIS của cửa (Căn giữa)
    this.time.addEvent({
        delay: 800,
        callback: () => {
            if (customer.sprite.active) {
                customer.targetX = this.doorLocation.x;
                customer.targetY = this.doorLocation.y - 100; // Ngay tâm cửa nhưng bên trong shop
                this.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, npcSpeed);
                
                // Giai đoạn 3: Sau thêm 1s nữa, bước thẳng ra ngoài (Xuyên cửa)
                this.time.addEvent({
                    delay: 1000,
                    callback: () => {
                        if (customer.sprite.active) {
                            customer.targetY = this.doorLocation.y + 120; // Bước hẳn ra ngoài thế giới
                            this.physics.moveTo(customer.sprite, customer.targetX, customer.targetY, npcSpeed);
                        }
                    }
                });
            }
        }
    });
  }
}
