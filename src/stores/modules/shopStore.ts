import { defineStore } from 'pinia'
import { FURNITURE_ITEMS } from '../../config/shopData'
import { useStatsStore } from './statsStore'
import { useInventoryStore } from './inventoryStore'
import type { ShelfData, PlayTableData, CashierData, ShelfTier } from '../../types/gameTypes'

/**
 * Tạo một tầng kệ hàng (Tier) trống.
 */
const createEmptyTier = (): ShelfTier => ({ itemId: null, slots: [], maxSlots: 0 })

/**
 * Khởi tạo dữ liệu cho một Kệ hàng (Shelf) mới.
 */
const createShelf = (id: string, furnitureId: string, x: number, y: number): ShelfData => ({
  id,
  furnitureId,
  x,
  y,
  tiers: [createEmptyTier(), createEmptyTier(), createEmptyTier()] // Mặc định mỗi kệ có 3 tầng
})

/**
 * Khởi tạo dữ liệu cho một Bàn chơi bài (Play Table).
 */
const createPlayTable = (id: string, furnitureId: string, x: number, y: number): PlayTableData => ({
  id,
  furnitureId,
  x: x,
  y: y,
  occupants: [null, null], // Bàn có tối đa 2 chỗ ngồi
  matchStartedAt: null
})

/**
 * Khởi tạo dữ liệu cho Quầy thu ngân (Cashier).
 */
const createCashier = (id: string, furnitureId: string, x: number, y: number): CashierData => ({
  id,
  furnitureId,
  x,
  y
})

/**
 * ShopStore - Quản lý toàn bộ cấu trúc vật lý của cửa hàng và luồng bán hàng.
 * 
 * Các trách nhiệm chính:
 * - Lưu trữ vị trí và trạng thái của toàn bộ nội thất (Kệ, Bàn, Quầy).
 * - Quản lý chế độ Xây dựng (Build Mode) và Chỉnh sửa (Edit Mode).
 * - Điều phối hàng hóa trên kệ (Xếp hàng, dọn kệ).
 * - Quản lý hàng chờ (Queue) của khách hàng và quy trình thanh toán.
 */
export const useShopStore = defineStore('shop', {
  state: () => ({
    /** Danh sách kệ hàng đang đặt trong shop */
    placedShelves: {} as Record<string, ShelfData>,
    /** Danh sách bàn chơi bài đang đặt */
    placedTables: {} as Record<string, PlayTableData>,
    /** Danh sách quầy thu ngân */
    placedCashiers: {
      'cashier_default': createCashier('cashier_default', 'cashier_desk', 1100, 1100)
    } as Record<string, CashierData>,
    /** Kho lưu trữ các món nội thất đã mua nhưng chưa đặt */
    purchasedFurniture: {} as Record<string, number>,
    
    // Trạng thái UI/UX
    activeShelfId: null as string | null,
    showShelfMenu: false,
    showBinderMenu: false,
    showBuildMenu: false,
    showOnlineShop: false,
    
    // Trạng thái Logic Xây dựng
    isBuildMode: false,
    buildItemId: null as string | null,
    isEditMode: false,
    /** Chứa dữ liệu vật dụng đang được "nhấc lên" để di chuyển */
    editFurnitureData: null as any, 
    
    // Trạng thái Shop
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingCustomers: 0,
    /** Hàng chờ thanh toán (First-in, First-out) */
    waitingQueue: [] as { instanceId: string, price: number }[],
  }),
  actions: {
    /**
     * Mở hoặc Đóng cửa shop.
     */
    setShopState(newState: 'OPEN' | 'CLOSED') {
      this.shopState = newState
    },

    /**
     * Đưa khách hàng vào hàng chờ thanh toán.
     * @param price Số tiền khách sẽ trả
     * @param instanceId ID của NPC khách hàng
     */
    addWaitingCustomer(price: number, instanceId: string) {
      this.waitingCustomers++
      this.waitingQueue.push({ instanceId, price })
    },

    /**
     * Phục vụ khách hàng đứng đầu hàng chờ.
     * Cộng tiền, cộng kinh nghiệm (XP) và trả về ID khách để Phaser giải phóng NPC.
     */
    serveCustomer(): string | null {
      const statsStore = useStatsStore()
      if (this.waitingCustomers > 0) {
        this.waitingCustomers--
        const entry = this.waitingQueue.shift()
        if (!entry) return null

        const { instanceId, price } = entry
        statsStore.addMoney(price)
        statsStore.dailyStats.customersServed++
        statsStore.dailyStats.revenue += price
        statsStore.gainExp(5)
        return instanceId
      }
      return null
    },

    /**
     * Buộc kết thúc ngày sớm:
     * - Đóng cửa hàng ngay lập tức.
     * - Hiển thị Modal báo cáo doanh thu từ StatsStore.
     */
    forceEndDay() {
      this.shopState = 'CLOSED'
      useStatsStore().showEndDayModal = true
    },
    /**
     * Mở menu quản lý kệ
     */
    openShelfManagement(shelfId: string) {
      if (!this.placedShelves[shelfId]) return
      this.activeShelfId = shelfId
      this.showShelfMenu = true
    },
    /**
     * Đóng menu quản lý kệ
     */
    closeShelfManagement() {
      this.activeShelfId = null
      this.showShelfMenu = false
    },

    /**
     * Xếp 1 món đồ từ kho hàng của shop (shopInventory) vào 1 tầng của kệ.
     */
    moveToTierSlot(itemId: string, tierIndex: number) {
      const inventoryStore = useInventoryStore()
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      const itemData = inventoryStore.shopItems[itemId]
      if (!itemData) return
      if (inventoryStore.shopInventory[itemId] <= 0) return

      const tier = shelf.tiers[tierIndex]
      const isBox = itemData.type === 'box'
      const maxSlots = isBox ? 4 : 32 // Box chiếm nhiều chỗ hơn Pack

      // Nếu tầng đang trống, gán loại hàng cho tầng này
      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      
      // Kiểm tra loại hàng và sức chứa
      if (tier.itemId !== itemId) return
      if (tier.slots.length >= tier.maxSlots) return

      tier.slots.push(itemId)
      inventoryStore.shopInventory[itemId]--
      if (inventoryStore.shopInventory[itemId] === 0) delete inventoryStore.shopInventory[itemId]
    },

    /**
     * Tự động xếp đầy hàng vào một tầng kệ nếu kho còn đủ.
     */
    fillTier(itemId: string, tierIndex: number) {
      const inventoryStore = useInventoryStore()
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      const itemData = inventoryStore.shopItems[itemId]
      if (!itemData) return

      const tier = shelf.tiers[tierIndex]
      const isBox = itemData.type === 'box'
      const maxSlots = isBox ? 4 : 32

      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      if (tier.itemId !== itemId) return

      const spaceLeft = tier.maxSlots - tier.slots.length
      const available = inventoryStore.shopInventory[itemId] ?? 0
      const toAdd = Math.min(spaceLeft, available)

      for (let i = 0; i < toAdd; i++) {
        tier.slots.push(itemId)
      }
      inventoryStore.shopInventory[itemId] -= toAdd
      if (inventoryStore.shopInventory[itemId] <= 0) delete inventoryStore.shopInventory[itemId]
    },

    /**
     * Thu hồi toàn bộ hàng từ một tầng kệ về kho.
     */
    clearTier(shelfId: string, tierIndex: number) {
      const inventoryStore = useInventoryStore()
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return
      const tier = shelf.tiers[tierIndex]
      if (!tier.itemId) return

      if (!inventoryStore.shopInventory[tier.itemId]) inventoryStore.shopInventory[tier.itemId] = 0
      inventoryStore.shopInventory[tier.itemId] += tier.slots.length
      
      // Reset tầng về trạng thái trống
      tier.itemId = null
      tier.slots = []
      tier.maxSlots = 0
    },
    /**
     * Xóa toàn bộ kệ
     */
    clearEntireShelf() {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      shelf.tiers.forEach((_, i) => this.clearTier(shelf.id, i))
    },

    /**
     * Logic NPC lấy sản phẩm: Chọn ngẫu nhiên một tầng có hàng và lấy 1 món.
     */
    npcTakeItemFromSlot(shelfId: string) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return null

      const filledTiers = shelf.tiers.map((t, idx) => ({ t, idx })).filter(x => x.t.itemId && x.t.slots.length > 0)
      if (filledTiers.length === 0) return null

      const picked = filledTiers[Math.floor(Math.random() * filledTiers.length)]
      const tier = picked.t
      const itemId = tier.itemId!

      tier.slots.pop() // Xóa item khỏi kệ
      if (tier.slots.length === 0) {
        tier.itemId = null
        tier.maxSlots = 0
      }

      const statsStore = useStatsStore()
      statsStore.dailyStats.itemsSold++
      return itemId
    },

    /**
     * Mua furniture từ cửa hàng Online
     */
    buyFurniture(furnitureId: string) {
      const statsStore = useStatsStore()
      const furnitureData = FURNITURE_ITEMS[furnitureId]
      if (!furnitureData) return false

      if (!statsStore.spendMoney(furnitureData.buyPrice)) return false
      if (statsStore.level < furnitureData.requiredLevel) return false

      if (!this.purchasedFurniture[furnitureId]) this.purchasedFurniture[furnitureId] = 0
      this.purchasedFurniture[furnitureId]++
      return true
    },

    /**
     * Bắt đầu build mode
     */
    startBuildMode(furnitureId: string) {
      this.buildItemId = furnitureId
      this.isBuildMode = true
      this.showBuildMenu = false
    },
    /**
     * Hủy build mode
     */
    cancelBuildMode() {
      this.isBuildMode = false
      this.buildItemId = null
    },
     /**
     * Đặt bàn chơi
     */
    placePlayTable(x: number, y: number) {
      if (!this.buildItemId) return null
      const id = 'table_' + Date.now()
      const newTable = createPlayTable(id, this.buildItemId, x, y)
      this.placedTables[id] = newTable
      return newTable
    },
    /**
     * Đặt nội thất xuống bản đồ tại tọa độ (X, Y).
     * Xử lý cả 2 trường hợp: Đặt đồ mới và Di chuyển đồ cũ.
     */
    placeFurniture(x: number, y: number) {
      // Trường hợp 1: Đang di chuyển đồ vật hiện có (từ Edit Mode)
      if (this.editFurnitureData) {
        const data = { ...this.editFurnitureData, x, y }
        if (data.type === 'shelf') {
          this.placedShelves[data.id] = data
        } else if (data.type === 'cashier') {
          this.placedCashiers[data.id] = data
        } else {
          this.placedTables[data.id] = data
        }
        this.editFurnitureData = null
        this.isBuildMode = false
        return data
      }

      // Trường hợp 2: Đặt vật phẩm mới từ kho mua sắm
      const furnitureId = this.buildItemId
      if (!furnitureId) return null

      let placedData = null
      if (furnitureId === 'play_table') {
        // placedData = this.placePlayTable(x, y)
        const id = 'table_' + Date.now()
        placedData = createPlayTable(id, furnitureId, x, y)
        this.placedTables[id] = placedData
      } else if (furnitureId === 'cashier_desk') {
        const id = 'cashier_' + Date.now()
        placedData = createCashier(id, furnitureId, x, y)
        this.placedCashiers[id] = placedData
      } else {
        const id = 'shelf_' + Date.now()
        placedData = createShelf(id, furnitureId, x, y)
        this.placedShelves[id] = placedData
      }

      // Trừ số lượng trong kho nội thất
      if (this.purchasedFurniture[furnitureId] > 0) {
        this.purchasedFurniture[furnitureId]--
        if (this.purchasedFurniture[furnitureId] === 0) {
          delete this.purchasedFurniture[furnitureId]
        }
      }

      this.cancelBuildMode()
      return placedData
    },

    /** Bật/Tắt chế độ chỉnh sửa vị trí nội thất */
    toggleEditMode() {
      this.isEditMode = !this.isEditMode
      if (!this.isEditMode) {
        this.editFurnitureData = null
      }
    },

    /**
     * Nhấc một món đồ lên khỏi bản đồ để thay đổi vị trí.
     */
    pickUpFurniture(instanceId: string, type: 'shelf' | 'table' | 'cashier') {
      if (type === 'shelf') {
        const data = this.placedShelves[instanceId]
        if (data) {
          this.editFurnitureData = { ...data, type: 'shelf' }
          delete this.placedShelves[instanceId]
          this.isBuildMode = true // Reuse placement logic
          return true
        }
      } else if (type === 'table') {
        const data = this.placedTables[instanceId]
        if (data) {
          this.editFurnitureData = { ...data, type: 'table' }
          delete this.placedTables[instanceId]
          this.isBuildMode = true // Reuse placement logic
          return true
        }
      } else if (type === 'cashier') {
        const data = this.placedCashiers[instanceId]
        if (data) {
          this.editFurnitureData = { ...data, type: 'cashier' }
          delete this.placedCashiers[instanceId]
          this.isBuildMode = true
          return true
        }
      }
      return false
    },

    /**
     * Thu hồi vĩnh viễn món đồ đang cầm trên tay vào Kho (Trạng thái chưa đặt).
     * Nếu là kệ hàng, toàn bộ hàng hóa trên kệ sẽ tự động trả về kho hàng.
     */
    warehouseFurniture() {
      const inventoryStore = useInventoryStore()
      if (!this.editFurnitureData) return

      const data = this.editFurnitureData
      const furnitureId = data.furnitureId

      // Trả hàng về kho shopInventory
      if (data.type === 'shelf' && data.tiers) {
        data.tiers.forEach((tier: any) => {
          tier.slots.forEach((itemId: string | null) => {
            if (itemId) {
              inventoryStore.shopInventory[itemId] = (inventoryStore.shopInventory[itemId] || 0) + 1
            }
          })
        })
      }

      // Trả nội thất về kho purchasedFurniture
      this.purchasedFurniture[furnitureId] = (this.purchasedFurniture[furnitureId] || 0) + 1

      // Reset trạng thái
      this.editFurnitureData = null
      this.isBuildMode = false
      this.buildItemId = null
    },

    /** NPC đăng ký vào một vị trí trên bàn chơi bài */
    joinTable(tableId: string, instanceId: string): number | null {
      const table = this.placedTables[tableId]
      if (!table) return null

      const seatIndex = table.occupants.indexOf(null)
      if (seatIndex !== -1) {
        table.occupants[seatIndex] = instanceId
        return seatIndex
      }
      return null
    },

    /** Bắt đầu tính giờ trận đấu khi bàn đã đủ 2 người */
    startMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table && table.occupants.every(o => o !== null)) {
         table.matchStartedAt = Date.now()
       }
    },

    /** Kết thúc trận đấu (Reset thời gian nhưng giữ Occupants để NPC tự giải phóng) */
    finishMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table) {
         table.matchStartedAt = null
       }
    },

    /**
     * Khôi phục dữ liệu Shop từ file Save.
     * 
     * Quy trình xử lý bao gồm:
     * 1. Khôi phục các mảng nội thất cơ bản.
     * 2. Migration: Chuyển đổi cashierPosition (cũ) sang placedCashiers (mới).
     * 3. Safety Check: Kiểm tra cấu trúc dữ liệu kệ hàng để tránh Crash nếu bản Save quá cũ.
     * 4. Migration tọa độ: Tự động dịch chuyển đồ vật +1000px nếu chúng thuộc bản đồ cũ.
     */
    loadShop(parsed: any) {
      // 1. Khôi phục danh sách nội thất (ưu tiên dữ liệu mới nhất)
      if (parsed.purchasedFurniture) this.purchasedFurniture = parsed.purchasedFurniture
      if (parsed.placedTables) this.placedTables = parsed.placedTables
      
      // 2. Xử lý Quầy thu ngân (Migration từ cashierPosition cũ sang placedCashiers)
      if (parsed.placedCashiers) {
        this.placedCashiers = parsed.placedCashiers
      } else if (parsed.cashierPosition) {
        const pos = parsed.cashierPosition
        this.placedCashiers = {
          'cashier_default': createCashier('cashier_default', 'cashier_desk', pos.x, pos.y)
        }
      }

      // 3. Xử lý Kệ hàng & Safety Check
      if (parsed.placedShelves) {
        const shelves = Object.values(parsed.placedShelves) as any[]
        const firstShelf = shelves[0]
        
        // Kiểm tra xem dữ liệu kệ có hợp lệ không (phải có mảng tiers và tọa độ)
        if (shelves.length > 0 && (!Array.isArray(firstShelf?.tiers) || typeof firstShelf?.x === 'undefined')) {
          console.warn('[ShopStore] Dữ liệu kệ hàng không tương thích. Đang reset để tránh lỗi.')
          this.placedShelves = {}
        } else {
          this.placedShelves = parsed.placedShelves
        }
      }

      // 4. Migration tọa độ: Dịch chuyển đồ vật nếu tọa độ cũ nằm ngoài vùng map mới (+1000px)
      const migratePos = (items: Record<string, any>) => {
        Object.values(items).forEach(item => {
          if (item.x < 1000) {
            item.x += 1000
            item.y += 1000
          }
        })
      }

      if (this.placedShelves) migratePos(this.placedShelves)
      if (this.placedTables) migratePos(this.placedTables)
      if (this.placedCashiers) migratePos(this.placedCashiers)

      this.shopState = parsed.shopState ?? 'OPEN'
    }
  }
})