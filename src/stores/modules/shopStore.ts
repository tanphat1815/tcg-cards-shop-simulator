import { defineStore } from 'pinia'
import { FURNITURE_ITEMS } from '../../config/shopData'
import { EXPANSIONS_LOT_A } from '../../config/expansionData'
import type { ShelfData, PlayTableData, CashierData, ShelfTier } from '../../types/game'
import { useStatsStore } from './statsStore'
import { useInventoryStore } from './inventoryStore'

// Helper tạo dữ liệu ban đầu
const createEmptyTier = (): ShelfTier => ({ itemId: null, slots: [], maxSlots: 0 })
const createShelf = (id: string, furnitureId: string, x: number, y: number): ShelfData => ({
  id, furnitureId, x, y,
  tiers: [createEmptyTier(), createEmptyTier(), createEmptyTier()]
})
const createPlayTable = (id: string, furnitureId: string, x: number, y: number): PlayTableData => ({
  id, furnitureId, x, y, occupants: [null, null], matchStartedAt: null
})
const createCashier = (id: string, furnitureId: string, x: number, y: number): CashierData => ({
  id, furnitureId, x, y
})

/**
 * Store quản lý việc xây dựng, nội thất và mở rộng shop.
 */
export const useShopStore = defineStore('shop', {
  state: () => ({
    placedShelves: {} as Record<string, ShelfData>,
    placedTables: {} as Record<string, PlayTableData>,
    placedCashiers: {
      'cashier_default': createCashier('cashier_default', 'cashier_desk', 1100, 1100)
    } as Record<string, CashierData>,
    purchasedFurniture: {} as Record<string, number>,
    
    // UI State của shop
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    isBuildMode: false,
    buildItemId: null as string | null,
    isEditMode: false,
    editFurnitureData: null as any,
    expansionLevel: 0,
    
    // Menu Overlay visibility
    activeShelfId: null as string | null,
    showShelfMenu: false,
    showBinderMenu: false,
    showBuildMenu: false,
    showOnlineShop: false,
    showSettings: false,
    showEndDayModal: false,
    settings: {
      showExpansionPreview: true,
      expansionPreviewStyle: 'GLOW' as 'BLUEPRINT' | 'GLOW'
    }
  }),

  actions: {
    /**
     * Mua nội thất mới.
     */
    buyFurniture(furnitureId: string) {
      const statsStore = useStatsStore()
      const furnitureData = FURNITURE_ITEMS[furnitureId]
      if (!furnitureData || statsStore.money < furnitureData.buyPrice || statsStore.level < furnitureData.requiredLevel) return false
      
      this.purchasedFurniture[furnitureId] = (this.purchasedFurniture[furnitureId] || 0) + 1
      return true
    },

    /**
     * Cập nhật trạng thái đóng/mở của shop.
     */
    setShopState(newState: 'OPEN' | 'CLOSED') {
      this.shopState = newState
    },

    /**
     * Ép buộc kết thúc ngày sớm (mở modal tổng kết).
     */
    forceEndDay() {
      this.shopState = 'CLOSED'
      this.showEndDayModal = true
    },

    /**
     * Mở menu quản lý kệ hàng.
     */
    openShelfManagement(shelfId: string) {
      if (!this.placedShelves[shelfId]) return
      this.activeShelfId = shelfId
      this.showShelfMenu = true
    },

    /**
     * Đóng menu quản lý kệ hàng.
     */
    closeShelfManagement() {
      this.activeShelfId = null
      this.showShelfMenu = false
    },

    /**
     * Bắt đầu chế độ xây dựng đặt đồ.
     */
    startBuildMode(furnitureId: string) {
      this.buildItemId = furnitureId
      this.isBuildMode = true
      this.showBuildMenu = false
    },

    /**
     * Đặt đồ xuống sàn.
     */
    placeFurniture(x: number, y: number) {
      // Logic di chuyển đồ cũ
      if (this.editFurnitureData) {
        const data = { ...this.editFurnitureData, x, y }
        if (data.type === 'shelf') this.placedShelves[data.id] = data
        else if (data.type === 'cashier') this.placedCashiers[data.id] = data
        else this.placedTables[data.id] = data
        this.editFurnitureData = null
        this.isBuildMode = false
        return data
      }

      // Logic đặt đồ mới mua
      const furnitureId = this.buildItemId
      if (!furnitureId) return null
      
      let placedData = null
      if (furnitureId === 'play_table') {
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
      
      if (this.purchasedFurniture[furnitureId] > 0) {
        this.purchasedFurniture[furnitureId]--
        if (this.purchasedFurniture[furnitureId] === 0) delete this.purchasedFurniture[furnitureId]
      }
      this.isBuildMode = false
      this.buildItemId = null
      return placedData
    },

    /**
     * Thu hồi đồ vào kho.
     */
    warehouseFurniture() {
      if (!this.editFurnitureData) return
      const inventoryStore = useInventoryStore()
      const data = this.editFurnitureData
      
      // Hoàn trả hàng trên kệ về kho
      if (data.type === 'shelf' && data.tiers) {
        data.tiers.forEach((tier: any) => {
          tier.slots.forEach((itemId: string | null) => {
            if (itemId) inventoryStore.addItemsToInventory(itemId, 1)
          })
        })
      }

      this.purchasedFurniture[data.furnitureId] = (this.purchasedFurniture[data.furnitureId] || 0) + 1
      this.editFurnitureData = null
      this.isBuildMode = false
    },

    /**
     * Hủy bỏ chế độ xây dựng/đặt đồ.
     */
    cancelBuildMode() {
      this.isBuildMode = false
      this.buildItemId = null
    },

    /**
     * Bật/tắt chế độ chỉnh sửa (di chuyển đồ đã đặt).
     */
    toggleEditMode() {
      this.isEditMode = !this.isEditMode
      if (!this.isEditMode) {
        this.editFurnitureData = null
      }
    },

    /**
     * Nhặt một món đồ đã đặt trên sàn lên để di chuyển hoặc cất vào kho.
     */
    pickUpFurniture(instanceId: string, type: 'shelf' | 'table' | 'cashier') {
      if (type === 'shelf') {
        const data = this.placedShelves[instanceId]
        if (data) {
          this.editFurnitureData = { ...data, type: 'shelf' }
          delete this.placedShelves[instanceId]
          this.isBuildMode = true 
          return true
        }
      } else if (type === 'table') {
        const data = this.placedTables[instanceId]
        if (data) {
          this.editFurnitureData = { ...data, type: 'table' }
          delete this.placedTables[instanceId]
          this.isBuildMode = true 
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
     * Khách hàng tham gia vào bàn đấu bài.
     */
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

    /**
     * Bắt đầu một trận đấu bài tại bàn.
     */
    startMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table && table.occupants.every(o => o !== null)) {
         table.matchStartedAt = Date.now()
       }
    },

    /**
     * Kết thúc trận đấu bài và dọn dẹp bàn.
     */
    finishMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table) {
         table.matchStartedAt = null
         table.occupants = [null, null]
       }
    },

    /**
     * Thu hồi toàn bộ hàng hóa từ một kệ về kho.
     */
    clearEntireShelf(shelfId: string) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return

      const inventoryStore = useInventoryStore()
      shelf.tiers.forEach(tier => {
        if (tier.itemId && tier.slots.length > 0) {
          inventoryStore.addItemsToInventory(tier.itemId, tier.slots.length)
        }
        tier.itemId = null
        tier.slots = []
        tier.maxSlots = 0
      })
    },

    /**
     * Mở rộng diện tích shop.
     */
    buyExpansion() {
      const statsStore = useStatsStore()
      const nextId = this.expansionLevel + 1
      const config = EXPANSIONS_LOT_A.find(e => e.id === nextId)
      if (!config || statsStore.money < config.cost || statsStore.level < config.requiredLevel) return false
      
      statsStore.spendMoney(config.cost)
      this.expansionLevel = nextId
      return true
    }
  }
})
