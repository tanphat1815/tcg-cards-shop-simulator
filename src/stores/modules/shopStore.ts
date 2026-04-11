import { defineStore } from 'pinia'
import { FURNITURE_ITEMS } from '../../config/shopData'
import { useStatsStore } from './statsStore'
import { useInventoryStore } from './inventoryStore'
import type { ShelfData, PlayTableData, CashierData, ShelfTier } from '../../types/gameTypes'

const createEmptyTier = (): ShelfTier => ({ itemId: null, slots: [], maxSlots: 0 })
const createShelf = (id: string, furnitureId: string, x: number, y: number): ShelfData => ({
  id,
  furnitureId,
  x,
  y,
  tiers: [createEmptyTier(), createEmptyTier(), createEmptyTier()]
})

const createPlayTable = (id: string, furnitureId: string, x: number, y: number): PlayTableData => ({
  id,
  furnitureId,
  x: x,
  y: y,
  occupants: [null, null],
  matchStartedAt: null
})

const createCashier = (id: string, furnitureId: string, x: number, y: number): CashierData => ({
  id,
  furnitureId,
  x,
  y
})

/**
 * Store quản lý shop, furniture, build mode
 */
export const useShopStore = defineStore('shop', {
  state: () => ({
    placedShelves: {} as Record<string, ShelfData>,
    placedTables: {} as Record<string, PlayTableData>,
    placedCashiers: {
      'cashier_default': createCashier('cashier_default', 'cashier_desk', 1100, 1100)
    } as Record<string, CashierData>,
    purchasedFurniture: {} as Record<string, number>,
    activeShelfId: null as string | null,
    showShelfMenu: false,
    showBinderMenu: false,
    showBuildMenu: false,
    isBuildMode: false,
    buildItemId: null as string | null,
    isEditMode: false,
    editFurnitureData: null as any, // Stores data of the item being moved
    showOnlineShop: false,
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingCustomers: 0,
    waitingQueue: [] as { instanceId: string, price: number }[],
  }),
  actions: {
    /**
     * Đặt trạng thái shop
     */
    setShopState(newState: 'OPEN' | 'CLOSED') {
      this.shopState = newState
    },
    /**
     * Thêm khách hàng vào hàng chờ
     * @param price Số tiền khách sẽ trả
     * @param instanceId ID của NPC khách hàng
     */
    addWaitingCustomer(price: number, instanceId: string) {
      this.waitingCustomers++
      this.waitingQueue.push({ instanceId, price })
    },
    /**
     * Phục vụ khách hàng đầu tiên trong hàng chờ
     * @returns instanceId của khách vừa thanh toán để Phaser biết cần giải phóng NPC
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

        // XP Reward: 5 XP
        statsStore.gainExp(5)
        return instanceId
      }
      return null
    },
    /**
     * Buộc kết thúc ngày
     */
    forceEndDay() {
      const statsStore = useStatsStore()
      this.shopState = 'CLOSED'
      statsStore.showEndDayModal = true
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
     * Chuyển item vào tier slot
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
      const maxSlots = isBox ? 4 : 32

      // Tier is empty: claim it for this item type
      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      // Tier type mismatch: reject
      if (tier.itemId !== itemId) return
      // Tier is full: reject
      if (tier.slots.length >= tier.maxSlots) return

      tier.slots.push(itemId)
      inventoryStore.shopInventory[itemId]--
      if (inventoryStore.shopInventory[itemId] === 0) delete inventoryStore.shopInventory[itemId]
    },
    /**
     * Điền đầy tier
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
     * Xóa tier
     */
    clearTier(shelfId: string, tierIndex: number) {
      const inventoryStore = useInventoryStore()
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return
      const tier = shelf.tiers[tierIndex]
      if (!tier.itemId) return

      if (!inventoryStore.shopInventory[tier.itemId]) inventoryStore.shopInventory[tier.itemId] = 0
      inventoryStore.shopInventory[tier.itemId] += tier.slots.length
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
     * NPC lấy item từ slot
     */
    npcTakeItemFromSlot(shelfId: string) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return null

      // Find tiers that have items
      const filledTiers = shelf.tiers.map((t, idx) => ({ t, idx })).filter(x => x.t.itemId && x.t.slots.length > 0)
      if (filledTiers.length === 0) return null

      const picked = filledTiers[Math.floor(Math.random() * filledTiers.length)]
      const tier = picked.t
      const itemId = tier.itemId!

      tier.slots.pop()
      if (tier.slots.length === 0) {
        tier.itemId = null
        tier.maxSlots = 0
      }

      const statsStore = useStatsStore()
      statsStore.dailyStats.itemsSold++
      return itemId
    },
    /**
     * Mua furniture
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
     * Đặt furniture
     */
    placeFurniture(x: number, y: number) {
      // Case 1: Re-placing an existing item in Edit Mode
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

      // Case 2: Placing a new item from Build Menu
      const furnitureId = this.buildItemId
      if (!furnitureId) return null

      let placedData = null
      if (furnitureId === 'play_table') {
        placedData = this.placePlayTable(x, y)
      } else if (furnitureId === 'cashier_desk') {
        const id = 'cashier_' + Date.now()
        placedData = createCashier(id, furnitureId, x, y)
        this.placedCashiers[id] = placedData
      } else {
        const id = 'shelf_' + Date.now()
        placedData = createShelf(id, furnitureId, x, y)
        this.placedShelves[id] = placedData
      }

      // Remove from purchased
      if (this.purchasedFurniture[furnitureId] > 0) {
        this.purchasedFurniture[furnitureId]--
        if (this.purchasedFurniture[furnitureId] === 0) {
          delete this.purchasedFurniture[furnitureId]
        }
      }

      this.cancelBuildMode()
      return placedData
    },
    /**
     * Toggle edit mode
     */
    toggleEditMode() {
      this.isEditMode = !this.isEditMode
      if (!this.isEditMode) {
        this.editFurnitureData = null
      }
    },
    /**
     * Nhặt furniture
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
     * Warehouse furniture
     */
    warehouseFurniture() {
      const inventoryStore = useInventoryStore()
      if (!this.editFurnitureData) return

      const data = this.editFurnitureData
      const furnitureId = data.furnitureId

      // 1. Return items to shopInventory (if shelf)
      if (data.type === 'shelf' && data.tiers) {
        data.tiers.forEach((tier: any) => {
          tier.slots.forEach((itemId: string | null) => {
            if (itemId) {
              inventoryStore.shopInventory[itemId] = (inventoryStore.shopInventory[itemId] || 0) + 1
            }
          })
        })
      }

      // 2. Return the furniture item itself to purchasedFurniture
      this.purchasedFurniture[furnitureId] = (this.purchasedFurniture[furnitureId] || 0) + 1

      // 3. Cleanup
      this.editFurnitureData = null
      this.isBuildMode = false
      this.buildItemId = null
    },
    /**
     * Join table
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
     * Start match
     */
    startMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table && table.occupants.every(o => o !== null)) {
         table.matchStartedAt = Date.now()
       }
    },
    /**
     * Kết thúc trận đấu tại bàn
     * Lưu ý: Không reset occupants ngay để NPC tự giải phóng ghế khi rời đi
     */
    finishMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table) {
         table.matchStartedAt = null
         // table.occupants remains until NPC transitions to LEAVE state
       }
    },
    /**
     * Load dữ liệu từ save (phần shop)
     */
    loadShop(parsed: any) {
      if (parsed.placedShelves) {
        // Check for legacy array format or missing properties
        const firstShelf = Object.values(parsed.placedShelves)[0] as any
        if (firstShelf && Array.isArray(firstShelf.tiers) && typeof firstShelf.x !== 'undefined') {
           this.placedShelves = parsed.placedShelves
        } else {
           console.warn('Incompatible shelf data detected. Resetting shelves for Build Mode.')
           this.placedShelves = {}
        }
      }
      if (parsed.placedTables) {
         this.placedTables = parsed.placedTables
      }
      if (parsed.purchasedFurniture) {
        this.purchasedFurniture = parsed.purchasedFurniture
      }
      if (parsed.placedCashiers) {
        this.placedCashiers = parsed.placedCashiers
      } else if (parsed.cashierPosition) {
        // Migration for old saves (pre-refactor)
        const pos = parsed.cashierPosition
        if (pos.x < 1000) { pos.x += 1000; pos.y += 1000; }
        this.placedCashiers = {
          'cashier_default': createCashier('cashier_default', 'cashier_desk', pos.x, pos.y)
        }
      }

      // Migration for other furniture (shelves and tables)
      if (parsed.placedShelves) {
        Object.values(parsed.placedShelves).forEach((shelf: any) => {
          if (shelf.x < 1000) { shelf.x += 1000; shelf.y += 1000; }
        })
        this.placedShelves = parsed.placedShelves
      }
      if (parsed.placedTables) {
        Object.values(parsed.placedTables).forEach((table: any) => {
          if (table.x < 1000) { table.x += 1000; table.y += 1000; }
        })
        this.placedTables = parsed.placedTables
      }

      this.shopState = parsed.shopState ?? 'OPEN'
    }
  }
})