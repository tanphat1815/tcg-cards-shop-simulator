import MainScene from '../MainScene'
import { DEPTH } from '../../config/renderConfigs'
import { BASE_SHOP_WIDTH, BASE_SHOP_HEIGHT, getExpansionDimensions } from '../../config/expansionData'
import { useGameStore } from '../../stores/gameStore'

/**
 * EnvironmentManager - Quản lý môi trường shop: tường, sàn, và hệ thống mở rộng
 */
export class EnvironmentManager {
  private scene: MainScene
  private floorGraphics!: Phaser.GameObjects.Graphics
  private wallGraphics!: Phaser.GameObjects.Graphics
  private outsideGraphics!: Phaser.GameObjects.Graphics
  private wallTop!: Phaser.GameObjects.Rectangle
  private wallLeft!: Phaser.GameObjects.Rectangle
  private wallRight!: Phaser.GameObjects.Rectangle
  private wallBottomLeft!: Phaser.GameObjects.Rectangle
  private wallBottomRight!: Phaser.GameObjects.Rectangle
  private doorLocation = { x: 0, y: 0 }
  private shopBounds = { x: 0, y: 0, w: 0, h: 0 }
  public wallsGroup!: Phaser.Physics.Arcade.StaticGroup

  // Tọa độ gốc cho shop trong thế giới 3000x3000px
  public static readonly START_X = 1000
  public static readonly START_Y = 1000

  constructor(scene: MainScene) {
    this.scene = scene
    this.wallsGroup = this.scene.physics.add.staticGroup()
    this.initializeGraphics()
    this.createWalls()
  }

  /**
   * Khởi tạo các graphics objects
   */
  private initializeGraphics() {
    this.outsideGraphics = this.scene.add.graphics().setDepth(DEPTH.OUTSIDE)
    this.floorGraphics = this.scene.add.graphics().setDepth(DEPTH.FLOOR)
    this.wallGraphics = this.scene.add.graphics().setDepth(DEPTH.WALL_GRAPHICS)
  }

  /**
   * Tạo các bức tường của shop
   */
  private createWalls() {
    // Tính toán kích thước shop hiện tại
    const gameStore = useGameStore()
    const { extraW, extraH } = getExpansionDimensions(gameStore.expansionLevel)
    const width = BASE_SHOP_WIDTH + extraW
    const height = BASE_SHOP_HEIGHT + extraH

    // Thiết lập bounds và vị trí cửa chính xác dựa trên START_X/Y
    this.shopBounds = { x: EnvironmentManager.START_X, y: EnvironmentManager.START_Y, w: width, h: height }
    this.doorLocation = { x: EnvironmentManager.START_X + width / 2, y: EnvironmentManager.START_Y + height }

    // Tạo các bức tường tại tọa độ thực tế
    const { x, y, w, h } = this.shopBounds
    const thickness = 50

    this.wallTop = this.scene.add.rectangle(x + w / 2, y - thickness/2, w, thickness, 0x8B4513).setDepth(DEPTH.WALL)
    this.wallLeft = this.scene.add.rectangle(x - thickness/2, y + h / 2, thickness, h, 0x8B4513).setDepth(DEPTH.WALL)
    this.wallRight = this.scene.add.rectangle(x + w + thickness/2, y + h / 2, thickness, h, 0x8B4513).setDepth(DEPTH.WALL)
    
    // Tường dưới (có khe cửa)
    const doorWidth = 80
    const sideWallW = (w - doorWidth) / 2
    this.wallBottomLeft = this.scene.add.rectangle(x + sideWallW / 2, y + h + thickness / 2, sideWallW, thickness, 0x8B4513).setDepth(DEPTH.WALL)
    this.wallBottomRight = this.scene.add.rectangle(x + w - sideWallW / 2, y + h + thickness / 2, sideWallW, thickness, 0x8B4513).setDepth(DEPTH.WALL)

    // Kích hoạt physics và thêm vào group
    const walls = [this.wallTop, this.wallLeft, this.wallRight, this.wallBottomLeft, this.wallBottomRight]
    walls.forEach(w => {
      this.scene.physics.add.existing(w, true)
      this.wallsGroup.add(w)
      w.setVisible(false) // Ẩn vùng vật lý, không hiển thị màu nâu
    })
    console.log("DEBUG: EnvironmentManager walls initialized and hidden")

    // Tạo lỗ cửa (Visual)
    this.scene.add.rectangle(this.doorLocation.x, this.doorLocation.y, 80, 60, 0x000000).setDepth(DEPTH.WALL + 1).setVisible(false)
  }

  /**
   * Vẽ sàn nhà
   */
  drawFloor() {
    const gameStore = useGameStore()
    const { extraW, extraH } = getExpansionDimensions(gameStore.expansionLevel)
    const width = BASE_SHOP_WIDTH + extraW
    const height = BASE_SHOP_HEIGHT + extraH

    const { x, y } = this.shopBounds

    this.floorGraphics.clear()
    this.floorGraphics.fillStyle(0xD2B48C) // Màu gỗ nhạt
    this.floorGraphics.fillRect(x, y, width, height)

    // Vẽ pattern sàn
    this.floorGraphics.lineStyle(2, 0x8B4513)
    for (let lx = 0; lx <= width; lx += 100) {
      this.floorGraphics.lineBetween(x + lx, y, x + lx, y + height)
    }
    for (let ly = 0; ly <= height; ly += 100) {
      this.floorGraphics.lineBetween(x, y + ly, x + width, y + ly)
    }
  }

  /**
   * Vẽ tường
   */
  drawWalls() {
    const gameStore = useGameStore()
    const { extraW, extraH } = getExpansionDimensions(gameStore.expansionLevel)
    const width = BASE_SHOP_WIDTH + extraW
    const height = BASE_SHOP_HEIGHT + extraH

    const { x, y } = this.shopBounds

    this.wallGraphics.clear()
    this.wallGraphics.fillStyle(0x8B4513) // Màu gỗ tối
    this.wallGraphics.fillRect(x, y, width, 50) // Tường trên
    this.wallGraphics.fillRect(x, y, 50, height) // Tường trái
    this.wallGraphics.fillRect(x + width - 50, y, 50, height) // Tường phải
    this.wallGraphics.fillRect(x, y + height - 50, 200, 50) // Tường dưới trái
    this.wallGraphics.fillRect(x + width - 200, y + height - 50, 200, 50) // Tường dưới phải

    // Vẽ cửa
    this.wallGraphics.fillStyle(0x000000)
    this.wallGraphics.fillRect(this.doorLocation.x - 40, this.doorLocation.y - 30, 80, 60)
  }

  /**
   * Vẽ nền ngoài shop
   */
  drawOutside() {
    const gameStore = useGameStore()
    const { extraW, extraH } = getExpansionDimensions(gameStore.expansionLevel)
    const width = BASE_SHOP_WIDTH + extraW
    const height = BASE_SHOP_HEIGHT + extraH

    const { x, y } = this.shopBounds

    this.outsideGraphics.clear()
    this.outsideGraphics.fillStyle(0x90EE90) // Màu xanh lá nhạt
    this.outsideGraphics.fillRect(x - 1000, y - 1000, width + 2000, height + 2000)

    // Vẽ đường viền shop
    this.outsideGraphics.lineStyle(4, 0x228B22)
    this.outsideGraphics.strokeRect(x, y, width, height)
  }

  /**
   * Cập nhật khi mở rộng shop
   */
  updateExpansion() {
    const gameStore = useGameStore()
    const { extraW, extraH } = getExpansionDimensions(gameStore.expansionLevel)
    const width = BASE_SHOP_WIDTH + extraW
    const height = BASE_SHOP_HEIGHT + extraH

    const startX = EnvironmentManager.START_X
    const startY = EnvironmentManager.START_Y

    // Cập nhật vị trí tường dựa trên startX/startX
    const sideWallW = (width - 80) / 2
    const thickness = 50

    this.wallTop.setPosition(startX + width / 2, startY - thickness/2)
    this.wallTop.setSize(width, thickness)

    this.wallLeft.setPosition(startX - thickness/2, startY + height / 2)
    this.wallLeft.setSize(thickness, height)

    this.wallRight.setPosition(startX + width + thickness/2, startY + height / 2)
    this.wallRight.setSize(thickness, height)

    this.wallBottomLeft.setPosition(startX + sideWallW / 2, startY + height + thickness / 2)
    this.wallBottomLeft.setSize(sideWallW, thickness)

    this.wallBottomRight.setPosition(startX + width - sideWallW / 2, startY + height + thickness / 2)
    this.wallBottomRight.setSize(sideWallW, thickness)

    // Cập nhật bounds và vị trí cửa
    this.shopBounds = { x: startX, y: startY, w: width, h: height }
    this.doorLocation = { x: startX + width / 2, y: startY + height }

    // Vẽ lại
    this.drawFloor()
    this.drawWalls()
    this.drawOutside()
  }

  /**
   * Khởi tạo môi trường shop ban đầu
   */
  initializeEnvironment() {
    this.drawOutside()
    this.drawFloor()
    this.drawWalls()
    this.updatePhysicalWalls()
  }

  /**
   * Refresh toàn bộ môi trường shop (từ MainScene.refreshEnvironment)
   */
  refreshEnvironment() {
    console.log("DEBUG: EnvironmentManager.refreshEnvironment started")
    try {
      const store = useGameStore()
      const { extraW, extraH } = getExpansionDimensions(store.expansionLevel)

      const shopW = BASE_SHOP_WIDTH + extraW
      const shopH = BASE_SHOP_HEIGHT + extraH
      const startX = EnvironmentManager.START_X
      const startY = EnvironmentManager.START_Y

      this.shopBounds = { x: startX, y: startY, w: shopW, h: shopH }
      this.doorLocation = { x: startX + shopW / 2, y: startY + shopH }

      // Camera Bounds (Bám theo không gian thế giới rộng đã thiết lập ở create)
      this.scene.cameras.main.setBounds(0, 0, 3000, 3000)

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

      // DRAW PREVIEW
      if (this.scene.previewGraphics) {
        this.scene.previewGraphics.clear()
        if (store.settings.showExpansionPreview) {
          const nextDim = getExpansionDimensions(store.expansionLevel + 1)
          const nextW = BASE_SHOP_WIDTH + nextDim.extraW
          const nextH = BASE_SHOP_HEIGHT + nextDim.extraH

          if (store.settings.expansionPreviewStyle === 'BLUEPRINT') {
            console.log(`DEBUG: Drawing Blueprint at ${startX},${startY} with size ${nextW}x${nextH}`)
            this.scene.previewGraphics.lineStyle(3, 0x00ffff, 1.0)
            this.drawDashedRect(startX, startY, nextW, nextH, 0x00ffff)
          } else {
            // GLOW Style
            for (let i = 1; i <= 3; i++) {
               this.scene.previewGraphics.lineStyle(2 * i, 0xffffff, 0.1)
               this.scene.previewGraphics.strokeRect(startX - i, startY - i, nextW + i*2, nextH + i*2)
            }
            this.scene.previewGraphics.lineStyle(2, 0xffffff, 0.8)
            this.scene.previewGraphics.strokeRect(startX, startY, nextW, nextH)
          }
        }
      }

      this.updatePhysicalWalls()
      console.log("DEBUG: EnvironmentManager.refreshEnvironment finished")
    } catch (err) {
      console.error("CRITICAL: EnvironmentManager.refreshEnvironment failed!", err)
    }
  }

  /**
   * Cập nhật vị trí tường vật lý
   */
  updatePhysicalWalls() {
    const { x, y, w, h } = this.shopBounds
    const thickness = 40
    const doorWidth = 80
    const sideWallWidth = (w - doorWidth) / 2

    console.log(`DEBUG: EnvironmentManager.updatePhysicalWalls - ShopBounds X:${x} Y:${y} W:${w} H:${h}`)

    const updateBody = (rect: Phaser.GameObjects.Rectangle) => {
      if (rect && rect.body) {
        (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject()
      } else {
        console.warn("DEBUG: Wall body missing, re-initializing physics for rectangle")
        this.scene.physics.add.existing(rect, true)
      }
    }

    // Top wall
    this.wallTop.setPosition(x + w / 2, y - thickness / 2)
    this.wallTop.setSize(w, thickness)
    updateBody(this.wallTop)

    // Left wall
    this.wallLeft.setPosition(x - thickness / 2, y + h / 2)
    this.wallLeft.setSize(thickness, h)
    updateBody(this.wallLeft)

    // Right wall
    this.wallRight.setPosition(x + w + thickness / 2, y + h / 2)
    this.wallRight.setSize(thickness, h)
    updateBody(this.wallRight)

    // Bottom Left
    this.wallBottomLeft.setPosition(x + sideWallWidth / 2, y + h + thickness / 2)
    this.wallBottomLeft.setSize(sideWallWidth, thickness)
    updateBody(this.wallBottomLeft)

    // Bottom Right
    this.wallBottomRight.setPosition(x + w - sideWallWidth / 2, y + h + thickness / 2)
    this.wallBottomRight.setSize(sideWallWidth, thickness)
    updateBody(this.wallBottomRight)

    console.log("DEBUG: EnvironmentManager.updatePhysicalWalls - completed")
  }

  /**
   * Lấy bounds của shop
   */
  getShopBounds() {
    return this.shopBounds
  }

  /**
   * Vẽ hình chữ nhật với đường nét (dashed rectangle)
   * Sử dụng cho preview expansion
   * @param x Tọa độ X góc trên trái
   * @param y Tọa độ Y góc trên trái
   * @param w Chiều rộng
   * @param h Chiều cao
   * @param color Màu sắc hex
   */
  private drawDashedRect(x: number, y: number, w: number, h: number, color: number) {
    const dashLength = 10
    const gap = 5
    const graphics = this.scene.previewGraphics
    
    graphics?.lineStyle(3, color, 1.0)
    
    // Draw top
    let currentX = x
    while (currentX < x + w) {
      const nextX = Math.min(currentX + dashLength, x + w)
      graphics?.lineBetween(currentX, y, nextX, y)
      currentX = nextX + gap
    }
    
    // Draw right
    let currentY = y
    while (currentY < y + h) {
      const nextY = Math.min(currentY + dashLength, y + h)
      graphics?.lineBetween(x + w, currentY, x + w, nextY)
      currentY = nextY + gap
    }
    
    // Draw bottom
    currentX = x + w
    while (currentX > x) {
      const nextX = Math.max(currentX - dashLength, x)
      graphics?.lineBetween(currentX, y + h, nextX, y + h)
      currentX = nextX - gap
    }
    
    // Draw left
    currentY = y + h
    while (currentY > y) {
      const nextY = Math.max(currentY - dashLength, y)
      graphics?.lineBetween(x, currentY, x, nextY)
      currentY = nextY - gap
    }
  }

  /**
   * Lấy vị trí cửa
   */
  getDoorLocation() {
    return this.doorLocation
  }

  /**
   * Cleanup khi destroy scene
   */
  destroy() {
    this.floorGraphics.destroy()
    this.wallGraphics.destroy()
    this.outsideGraphics.destroy()
    this.wallTop.destroy()
    this.wallLeft.destroy()
    this.wallRight.destroy()
    this.wallBottomLeft.destroy()
    this.wallBottomRight.destroy()
  }
}