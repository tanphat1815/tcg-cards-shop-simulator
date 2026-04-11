import Phaser from 'phaser'
import { DEPTH } from '../../config/renderConfigs'
import { useGameStore } from '../../stores/gameStore'
import type { ShelfData, PlayTableData, CashierData } from '../../types/gameTypes'

/**
 * FurnitureManager - Quản lý hiển thị nội thất: kệ, bàn chơi, quầy thu ngân
 * 
 * Chức năng chính:
 * - Hiển thị tất cả kệ (shelves) trên sân chơi
 * - Hiển thị tất cả bàn chơi (tables) trên sân chơi
 * - Hiển thị tất cả quầy thu ngân (cashiers) trên sân chơi
 * - Cập nhật thông tin hiển thị (số items, trạng thái bàn v.v.)
 * - Quản lý thêm/xóa furniture
 * - Cung cấp physics groups cho collision detection
 * 
 * Sử dụng Dependency Injection:
 * - Scene được truyền vào constructor để tạo sprites và graphics
 * - Các physics groups được quản lý tập trung nhằm tối ưu collision
 * 
 * Luồng hiển thị:
 * 1. initializeFurniture() - gọi lần đầu từ MainScene.create()
 * 2. displayAllFurniture() - đọc từ gameStore.placedShelves/Tables/Cashiers
 * 3. displayShelf/Table/Cashier - tạo sprites và texts
 * 4. updateFurnitureDisplay() - gọi khi dữ liệu thay đổi
 * 
 * @example
 * const furnitureManager = new FurnitureManager(this)
 * furnitureManager.initializeFurniture()
 * this.physics.add.collider(this.player, furnitureManager.shelvesGroup)
 */
export class FurnitureManager {
  private scene: Phaser.Scene
  public shelvesGroup!: Phaser.Physics.Arcade.StaticGroup
  public tablesGroup!: Phaser.Physics.Arcade.StaticGroup
  public cashierGroup!: Phaser.Physics.Arcade.StaticGroup
  private shelfTexts: Record<string, Phaser.GameObjects.Text> = {}
  private tableVisuals: Record<string, { rect: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text }> = {}

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initializeGroups()
  }

  /**
   * Khởi tạo các physics groups
   */
  private initializeGroups() {
    this.shelvesGroup = this.scene.physics.add.staticGroup()
    this.tablesGroup = this.scene.physics.add.staticGroup()
    this.cashierGroup = this.scene.physics.add.staticGroup()
  }

  /**
   * Khởi tạo toàn bộ furniture từ gameStore
   * Gọi sau khi environment đã sẵn sàng
   */
  initializeFurniture() {
    this.displayAllFurniture()
  }

  /**
   * Hiển thị tất cả furniture từ gameStore
   * Thủ tục:
   * 1. Xóa tất cả furniture hiện tại
   * 2. Đọc dữ liệu từ gameStore (placedShelves, placedTables, placedCashiers)
   * 3. Tạo sprites và texts cho mỗi furniture
   * 4. Thêm vào physics groups tương ứng
   */
  displayAllFurniture() {
    const gameStore = useGameStore()

    // Clear existing
    this.clearAllFurniture()

    // Display shelves
    Object.values(gameStore.placedShelves).forEach(shelf => {
      this.displayShelf(shelf)
    })

    // Display tables
    Object.values(gameStore.placedTables).forEach(table => {
      this.displayTable(table)
    })

    // Display cashiers
    Object.values(gameStore.placedCashiers).forEach(cashier => {
      this.displayCashier(cashier)
    })
  }

  /**
   * Hiển thị một kệ hàng
   * - Tạo sprite tại vị trí x, y
   * - Thêm text label hiển thị số lượng items
   * - Thêm vào shelvesGroup cho collision detection
   * @param shelf Dữ liệu kệ từ gameStore
   */
  public displayShelf(shelf: ShelfData) {
    const sprite = this.shelvesGroup.create(shelf.x, shelf.y, 'shelf')
    sprite.setData('id', shelf.id)
    sprite.setData('type', 'shelf')
    sprite.setDepth(DEPTH.FURNITURE) // Lớp 10

    // Hiển thị thông tin kệ
    const text = this.scene.add.text(shelf.x, shelf.y - 60, this.getShelfInfo(shelf), {
      fontSize: '12px',
      color: '#000',
      backgroundColor: '#fff',
      padding: { x: 4, y: 2 }
    }).setDepth(DEPTH.UI)
    this.shelfTexts[shelf.id] = text
  }

  /**
   * Hiển thị một bàn chơi
   * - Tạo sprite (hiện tại dùng sprite cashier tạm)
   * - Tạo rectangle và label hiển thị trạng thái (số người chơi/trạng thái game)
   * - Lưu trữ visual objects để update sau
   * @param table Dữ liệu bàn từ gameStore
   */
  public displayTable(table: PlayTableData) {
    const sprite = this.tablesGroup.create(table.x, table.y, 'cashier') // Sử dụng sprite cashier tạm thời
    sprite.setData('id', table.id)
    sprite.setData('type', 'table')
    sprite.setDepth(DEPTH.TABLE) // Lớp 10

    // Hiển thị trạng thái bàn
    const rect = this.scene.add.rectangle(table.x, table.y, 80, 40, 0x8B4513).setDepth(DEPTH.FURNITURE)
    const label = this.scene.add.text(table.x, table.y - 30, this.getTableInfo(table), {
      fontSize: '10px',
      color: '#fff'
    }).setDepth(DEPTH.UI)

    this.tableVisuals[table.id] = { rect, label }
  }

  /**
   * Hiển thị một quầy thu ngân
   * - Tạo sprite tại vị trí x, y
   * - Thêm vào cashierGroup cho collision detection
   * @param cashier Dữ liệu quầy từ gameStore
   */
  /**
   * Hiển thị một quầy thu ngân
   * @param cashier Dữ liệu quầy từ gameStore
   */
  public displayCashier(cashier: CashierData) {
    const sprite = this.cashierGroup.create(cashier.x, cashier.y, 'cashier')
    sprite.setData('id', cashier.id)
    sprite.setData('type', 'cashier')
    sprite.setDepth(DEPTH.CASHIER) // Lớp 10
  }

  /**
   * Phương thức proxy để thêm furniture bất kỳ vào scene
   */
  public addFurnitureToScene(data: any) {
    if (data.furnitureId === 'play_table' || data.type === 'table') {
      this.displayTable(data)
    } else if (data.furnitureId === 'cashier_desk' || data.type === 'cashier') {
      this.displayCashier(data)
    } else {
      this.displayShelf(data)
    }
  }

  /**
   * Lấy thông tin hiển thị của kệ
   */
  private getShelfInfo(shelf: ShelfData): string {
    const totalItems = shelf.tiers.reduce((sum, tier) => sum + tier.slots.filter(slot => slot !== null).length, 0)
    return `Kệ: ${totalItems} items`
  }

  /**
   * Lấy thông tin hiển thị của bàn
   */
  private getTableInfo(table: PlayTableData): string {
    const occupiedSeats = table.occupants.filter(o => o !== null).length
    const status = table.matchStartedAt ? 'Playing' : `${occupiedSeats}/2 players`
    return status
  }

  /**
   * Cập nhật hiển thị toàn bộ furniture khi dữ liệu thay đổi
   */
  updateFurnitureVisuals() {
    const gameStore = useGameStore()

    // Update shelf texts
    Object.values(gameStore.placedShelves).forEach(shelf => {
      if (this.shelfTexts[shelf.id]) {
        this.shelfTexts[shelf.id].setText(this.getShelfInfo(shelf))
      }
    })

    // Update table visuals
    Object.values(gameStore.placedTables).forEach(table => {
      if (this.tableVisuals[table.id]) {
        const { label } = this.tableVisuals[table.id]
        label.setText(this.getTableInfo(table))
      }
    })
  }

  /**
   * Xóa một furniture khỏi hiển thị
   * - Tìm sprite theo id và type
   * - Destroy sprite và các visual objects liên quan (texts, rects)
   * - Cleanup từ bộ nhớ (đặc biệt là shelfTexts, tableVisuals)
   * @param id ID của furniture (từ gameStore)
   * @param type Loại furniture: 'shelf' | 'table' | 'cashier'
   */
  removeFurniture(id: string, type: 'shelf' | 'table' | 'cashier') {
    if (type === 'shelf') {
      const sprite = this.shelvesGroup.getChildren().find(s => s.getData('id') === id) as Phaser.Physics.Arcade.Sprite
      if (sprite) sprite.destroy()
      if (this.shelfTexts[id]) {
        this.shelfTexts[id].destroy()
        delete this.shelfTexts[id]
      }
    } else if (type === 'table') {
      const sprite = this.tablesGroup.getChildren().find(s => s.getData('id') === id) as Phaser.Physics.Arcade.Sprite
      if (sprite) sprite.destroy()
      if (this.tableVisuals[id]) {
        this.tableVisuals[id].rect.destroy()
        this.tableVisuals[id].label.destroy()
        delete this.tableVisuals[id]
      }
    } else if (type === 'cashier') {
      const sprite = this.cashierGroup.getChildren().find(s => s.getData('id') === id) as Phaser.Physics.Arcade.Sprite
      if (sprite) sprite.destroy()
    }
  }

  /**
   * Xóa tất cả furniture khỏi hiển thị
   * - Clear tất cả sprites từ 3 physics groups
   * - Destroy tất cả text labels và visual rectangles
   * - Reset bộ nhớ (shelfTexts, tableVisuals)
   * Được gọi bởi displayAllFurniture() trước khi tạo lại toàn bộ
   */
  private clearAllFurniture() {
    this.shelvesGroup.clear(true, true)
    this.tablesGroup.clear(true, true)
    this.cashierGroup.clear(true, true)

    Object.values(this.shelfTexts).forEach(text => text.destroy())
    this.shelfTexts = {}

    Object.values(this.tableVisuals).forEach(({ rect, label }) => {
      rect.destroy()
      label.destroy()
    })
    this.tableVisuals = {}
  }

  /**
   * Lấy physics groups để collision
   */
  getPhysicsGroups() {
    return {
      shelves: this.shelvesGroup,
      tables: this.tablesGroup,
      cashiers: this.cashierGroup
    }
  }

  /**
   * Cleanup khi destroy scene
   * - Gọi clearAllFurniture() để xóa tất cả objects
   * - Được gọi từ MainScene.shutdown hoặc cleanup
   */
  destroy() {
    this.clearAllFurniture()
  }
}