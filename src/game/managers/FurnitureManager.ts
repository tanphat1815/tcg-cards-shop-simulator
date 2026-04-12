import Phaser from 'phaser'
import { DEPTH } from '../../config/renderConfigs'
import { useGameStore } from '../../stores/gameStore'
import type { ShelfData, PlayTableData, CashierData } from '../../types/gameTypes'

/**
 * FurnitureManager - Quản lý hiển thị và vật lý toàn bộ nội thất trong Shop.
 * 
 * Các trách nhiệm chính:
 * - Kệ hàng (Shelves): Render model kệ, text label hiển thị số lượng hàng hóa.
 * - Bàn chơi bài (Tables): Render khu vực bàn chơi, text label hiển thị trạng thái đấu bài (Playing/Waiting).
 * - Quầy thu ngân (Cashiers): Render quầy thu ngân chính của shop.
 * - Vật lý: Quản lý các Physics Static Groups để Player và NPC có thể va chạm (Collision).
 * - Đồng bộ: Cập nhật Visuals (Text/Status) liên tục dựa trên trạng thái trong Store.
 * 
 * Cấu trúc phân lớp (Depth):
 * - FURNITURE (10): Dành cho Sprite vật thể.
 * - UI (20): Dành cho Text Label hiển thị phía trên vật thể.
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
  
  // Physics Groups - Dạng Static vì nội thất không di chuyển sau khi đặt
  public shelvesGroup!: Phaser.Physics.Arcade.StaticGroup
  public tablesGroup!: Phaser.Physics.Arcade.StaticGroup
  public cashierGroup!: Phaser.Physics.Arcade.StaticGroup
  
  /** Lưu trữ các đối tượng Text để cập nhật nội dung hiệu quả mà không cần tạo mới */
  private shelfTexts: Record<string, Phaser.GameObjects.Text> = {}
  private tableVisuals: Record<string, { rect: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text }> = {}

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initializeGroups()
  }

  /**
   * Khởi tạo các nhóm Vật lý tĩnh. 
   * Được gọi trong Constructor để đảm bảo các Group luôn sẵn sàng trước khi nạp đồ nội thất.
   */
  private initializeGroups() {
    this.shelvesGroup = this.scene.physics.add.staticGroup()
    this.tablesGroup = this.scene.physics.add.staticGroup()
    this.cashierGroup = this.scene.physics.add.staticGroup()
  }

  /**
   * Khởi tạo toàn bộ nội thất từ GameStore.
   * Nên được gọi sau khi EnvironmentManager đã vẽ xong sàn và tường.
   */
  initializeFurniture() {
    this.displayAllFurniture()
  }

  /**
   * Quét toàn bộ Store và render lại tất cả vật dụng hiện có.
   * Thủ tục:
   * 1. Xóa tất cả furniture hiện tại
   * 2. Đọc dữ liệu từ gameStore (placedShelves, placedTables, placedCashiers)
   * 3. Tạo sprites và texts cho mỗi furniture
   * 4. Thêm vào physics groups tương ứng
   */
  displayAllFurniture() {
    const gameStore = useGameStore()

    // Xóa sạch các đối tượng cũ trước khi vẽ lại
    this.clearAllFurniture()

    // 1. Render Kệ hàng
    Object.values(gameStore.placedShelves).forEach(shelf => {
      this.displayShelf(shelf)
    })

    // 2. Render Bàn chơi
    Object.values(gameStore.placedTables).forEach(table => {
      this.displayTable(table)
    })

    // 3. Render Quầy thu ngân
    Object.values(gameStore.placedCashiers).forEach(cashier => {
      this.displayCashier(cashier)
    })
  }

  /**
   * Render một Kệ hàng cụ thể.
   * Kèm theo Text Label hiển thị tổng số hàng hóa đang có trên tất cả các tầng.
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

    // Khởi tạo Text Label hiển thị thông tin hàng hóa
    const text = this.scene.add.text(shelf.x, shelf.y - 60, this.getShelfInfo(shelf), {
      fontSize: '12px',
      color: '#000',
      backgroundColor: '#fff',
      padding: { x: 4, y: 2 }
    }).setDepth(DEPTH.UI)
    
    this.shelfTexts[shelf.id] = text
  }

  /**
   * Render một Bàn chơi bài.
   * Bao gồm một Rectangle đại diện cho mặt bàn và Label hiển thị trạng thái người chơi.
   * - Tạo sprite giả tại vị trí x, y
   * - Vẽ rectangle cho mặt bàn
   * - Thêm text label hiển thị trạng thái
   * - Thêm vào tablesGroup cho collision detection
   * @param table Dữ liệu bàn từ gameStore
   */
  public displayTable(table: PlayTableData) {
    // Sprite giả để phục vụ va chạm vật lý
    const sprite = this.tablesGroup.create(table.x, table.y, 'cashier') 
    sprite.setData('id', table.id)
    sprite.setData('type', 'table')
    sprite.setDepth(DEPTH.TABLE)
    sprite.setVisible(false) // Ẩn sprite giả, ta sẽ vẽ bàn bằng Graphics/Rectangle

    // Vẽ hình ảnh bàn
    const rect = this.scene.add.rectangle(table.x, table.y, 80, 40, 0x8B4513).setDepth(DEPTH.FURNITURE)
    const label = this.scene.add.text(table.x, table.y - 30, this.getTableInfo(table), {
      fontSize: '10px',
      color: '#fff'
    }).setDepth(DEPTH.UI)

    this.tableVisuals[table.id] = { rect, label }
  }

  /**
   * Render Quầy thu ngân.
   * - Tạo sprite tại vị trí x, y
   * - Thêm vào cashierGroup cho collision detection
   * @param cashier Dữ liệu quầy từ gameStore
   */
  public displayCashier(cashier: CashierData) {
    const sprite = this.cashierGroup.create(cashier.x, cashier.y, 'cashier')
    sprite.setData('id', cashier.id)
    sprite.setData('type', 'cashier')
    sprite.setDepth(DEPTH.CASHIER)
  }

  /**
   * Phương thức tiện ích để thêm nhanh một món nội thất vào Scene dựa trên cấu trúc dữ liệu chung.
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
   * Tổng hợp chuỗi thông tin cho label của kệ hàng.
   */
  private getShelfInfo(shelf: ShelfData): string {
    const totalItems = shelf.tiers.reduce((sum, tier) => sum + tier.slots.filter(slot => slot !== null).length, 0)
    return `Kệ: ${totalItems} món`
  }

  /**
   * Tổng hợp chuỗi thông tin cho label của bàn chơi.
   */
  private getTableInfo(table: PlayTableData): string {
    const occupiedSeats = table.occupants.filter(o => o !== null).length
    const status = table.matchStartedAt ? 'Đang chơi...' : `${occupiedSeats}/2 Người chơi`
    return status
  }

  /**
   * Cập nhật Visuals cho toàn bộ nội thất. 
   * Được gọi trong vòng lặp Update của MainScene để đồng bộ hóa các con số hiển thị.
   */
  updateFurnitureVisuals() {
    const gameStore = useGameStore()

    // 1. Cập nhật Text trên các kệ
    Object.values(gameStore.placedShelves).forEach(shelf => {
      if (this.shelfTexts[shelf.id]) {
        this.shelfTexts[shelf.id].setText(this.getShelfInfo(shelf))
      }
    })

    // 2. Cập nhật Status trên các bàn
    Object.values(gameStore.placedTables).forEach(table => {
      if (this.tableVisuals[table.id]) {
        const { label } = this.tableVisuals[table.id]
        label.setText(this.getTableInfo(table))
      }
    })
  }

  /**
   * Xóa một món nội thất khỏi Scene khi bị User thu hồi (Pick up).
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
   * Dọn dẹp sạch sẽ toàn bộ đối tượng GameObjects và Text trước khi vẽ lại hoặc chuyển Scene.
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
   * Trả về các Physics Groups cấp độ thấp cho hệ thống vật lý Phaser (Colliders).
   */
  getPhysicsGroups() {
    return {
      shelves: this.shelvesGroup,
      tables: this.tablesGroup,
      cashiers: this.cashierGroup
    }
  }

  /**
   * Giải phóng tài nguyên khi Manager không còn sử dụng.
    * - Gọi clearAllFurniture() để xóa tất cả objects
   * - Được gọi từ MainScene.shutdown hoặc cleanup
   */
  destroy() {
    this.clearAllFurniture()
  }
}