import { defineStore } from 'pinia'
import { useStatsStore } from './modules/statsStore'
import { useInventoryStore } from './modules/inventoryStore'
import { useShopStore } from './modules/shopStore'
import { useStaffStore } from './modules/staffStore'

/**
 * GameStore (Facade): Cổng giao tiếp chính kết hợp tất cả các module store.
 * Duy trì API cũ để đảm bảo tính tương thích với các thành phần UI và Phaser hiện tại.
 */
export const useGameStore = defineStore('game', {
  state: () => ({
    // Facade không lưu trữ state trực tiếp, nhưng Pinia requires state function.
    // Để tương thích với việc destructuring trong App.vue (nếu có), 
    // ta nên tránh dùng facade để lưu trữ, nhưng có thể cung cấp getters/setters.
  }),
  getters: {
    // === Stats & Progress ===
    money: () => useStatsStore().money,
    level: () => useStatsStore().level,
    currentExp: () => useStatsStore().currentExp,
    showLevelUpNext: () => useStatsStore().showLevelUpNext,
    dailyStats: () => useStatsStore().dailyStats,
    currentDay: () => useStatsStore().currentDay,
    timeInMinutes: () => useStatsStore().timeInMinutes,
    expansionLevel: () => useStatsStore().expansionLevel,
    showEndDayModal: () => useStatsStore().showEndDayModal,
    showSettings: () => useStatsStore().showSettings,
    settings: () => useStatsStore().settings,

    // === Inventory & Cards ===
    shopInventory: () => useInventoryStore().shopInventory,
    personalBinder: () => useInventoryStore().personalBinder,
    allCards: () => useInventoryStore().allCards,
    shopItems: () => useInventoryStore().shopItems,
    isOpeningPack: () => useInventoryStore().isOpeningPack,
    currentPack: () => useInventoryStore().currentPack,

    // === Shop & Furniture ===
    placedShelves: () => useShopStore().placedShelves,
    placedTables: () => useShopStore().placedTables,
    placedCashiers: () => useShopStore().placedCashiers,
    purchasedFurniture: () => useShopStore().purchasedFurniture,
    activeShelfId: () => useShopStore().activeShelfId,
    
    // UI Toggles (Add setters via actions or computed)
    showShelfMenu: () => useShopStore().showShelfMenu,
    showBinderMenu: () => useShopStore().showBinderMenu,
    showBuildMenu: () => useShopStore().showBuildMenu,
    isBuildMode: () => useShopStore().isBuildMode,
    buildItemId: () => useShopStore().buildItemId,
    isEditMode: () => useShopStore().isEditMode,
    editFurnitureData: () => useShopStore().editFurnitureData,
    showOnlineShop: () => useShopStore().showOnlineShop,
    
    shopState: () => useShopStore().shopState,
    waitingCustomers: () => useShopStore().waitingCustomers,
    waitingQueue: () => useShopStore().waitingQueue,

    // === Staff & Workers ===
    hiredWorkers: () => useStaffStore().hiredWorkers,

    // === Derived Stats ===
    requiredExp: () => useStatsStore().requiredExp,
  },
  actions: {
    // --- Setters (Cần thiết cho v-model hoặc gán trực tiếp trong Vue) ---
    setShowOnlineShop(val: boolean) { useShopStore().showOnlineShop = val },
    setShowBuildMenu(val: boolean) { useShopStore().showBuildMenu = val },
    setShowBinderMenu(val: boolean) { useShopStore().showBinderMenu = val },
    setShowSettings(val: boolean) { useStatsStore().showSettings = val },
    setBuildMode(val: boolean) { useShopStore().isBuildMode = val },
    setEditMode(val: boolean) { useShopStore().isEditMode = val },

    // --- Stats Actions ---
    addMoney(amount: number) { useStatsStore().addMoney(amount) },
    spendMoney(amount: number) { return useStatsStore().spendMoney(amount) },
    gainExp(amount: number) { useStatsStore().gainExp(amount) },
    tickTime(minutes: number) { useStatsStore().tickTime(minutes) },
    buyExpansion() { return useStatsStore().buyExpansion() },

    // --- Inventory Actions ---
    buyStock(itemId: string, amount: number = 1) { return useInventoryStore().buyStock(itemId, amount) },
    unboxItem(boxId: string) { useInventoryStore().unboxItem(boxId) },
    tearPack(packId: string) { useInventoryStore().tearPack(packId) },
    closePackOpening() { useInventoryStore().closePackOpening() },

    // --- Shop Actions ---
    setShopState(newState: 'OPEN' | 'CLOSED') { useShopStore().setShopState(newState) },
    addWaitingCustomer(price: number, instanceId: string) { useShopStore().addWaitingCustomer(price, instanceId) },
    serveCustomer() { return useShopStore().serveCustomer() },
    forceEndDay() { useShopStore().forceEndDay() },
    openShelfManagement(shelfId: string) { useShopStore().openShelfManagement(shelfId) },
    closeShelfManagement() { useShopStore().closeShelfManagement() },
    moveToTierSlot(itemId: string, tierIndex: number) { useShopStore().moveToTierSlot(itemId, tierIndex) },
    fillTier(itemId: string, tierIndex: number) { useShopStore().fillTier(itemId, tierIndex) },
    clearTier(shelfId: string, tierIndex: number) { useShopStore().clearTier(shelfId, tierIndex) },
    clearEntireShelf() { useShopStore().clearEntireShelf() },
    npcTakeItemFromSlot(shelfId: string) { return useShopStore().npcTakeItemFromSlot(shelfId) },
    buyFurniture(furnitureId: string) { return useShopStore().buyFurniture(furnitureId) },
    startBuildMode(furnitureId: string) { useShopStore().startBuildMode(furnitureId) },
    cancelBuildMode() { useShopStore().cancelBuildMode() },
    placePlayTable(x: number, y: number) { return useShopStore().placePlayTable(x, y) },
    placeFurniture(x: number, y: number) { return useShopStore().placeFurniture(x, y) },
    toggleEditMode() { useShopStore().toggleEditMode() },
    pickUpFurniture(instanceId: string, type: 'shelf' | 'table' | 'cashier') { return useShopStore().pickUpFurniture(instanceId, type) },
    warehouseFurniture() { useShopStore().warehouseFurniture() },
    joinTable(tableId: string, instanceId: string) { return useShopStore().joinTable(tableId, instanceId) },
    startMatch(tableId: string) { useShopStore().startMatch(tableId) },
    finishMatch(tableId: string) { useShopStore().finishMatch(tableId) },

    // --- Staff Actions ---
    hireWorker(workerId: string) { return useStaffStore().hireWorker(workerId) },
    changeWorkerDuty(instanceId: string, duty: any) { useStaffStore().changeWorkerDuty(instanceId, duty) },
    terminateWorker(instanceId: string) { useStaffStore().terminateWorker(instanceId) },

    /**
     * Tích hợp loadSave từ tất cả các module
     */
    loadSave() {
      const saved = localStorage.getItem('tcg-shop-save')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          useStatsStore().loadStats(parsed)
          useInventoryStore().loadInventory(parsed)
          useShopStore().loadShop(parsed)
          useStaffStore().loadStaff(parsed)
        } catch (e) {
          console.error("Lỗi khi đọc file save", e)
        }
      }
    },

    /**
     * Tích hợp saveGame cho App.vue
     */
    saveGame() {
      const stats = useStatsStore()
      const inv = useInventoryStore()
      const shop = useShopStore()
      
      const saveData = {
        money: stats.money,
        level: stats.level,
        currentExp: stats.currentExp,
        expansionLevel: stats.expansionLevel,
        currentDay: stats.currentDay,
        shopInventory: inv.shopInventory,
        personalBinder: inv.personalBinder,
        placedShelves: shop.placedShelves,
        placedTables: shop.placedTables,
        placedCashiers: shop.placedCashiers,
        purchasedFurniture: shop.purchasedFurniture,
        shopState: shop.shopState
      }
      localStorage.setItem('tcg-shop-save', JSON.stringify(saveData))
    },

    /**
     * Tích hợp startNewDay từ tất cả các module
     */
    startNewDay() {
      const statsStore = useStatsStore()
      const shopStore = useShopStore()
      const staffStore = useStaffStore()

      const totalSalary = staffStore.getTotalSalary()
      statsStore.startNewDay(totalSalary)
      
      shopStore.waitingCustomers = 0
      shopStore.waitingQueue = []
      
      // Reset trạng thái các bàn chơi
      Object.values(shopStore.placedTables).forEach(table => {
        table.occupants = [null, null]
        table.matchStartedAt = null
      })
      this.saveGame()
    }
  }
})
