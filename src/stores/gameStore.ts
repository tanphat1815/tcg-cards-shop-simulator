import { defineStore } from 'pinia'
import { useStatsStore } from './modules/statsStore'
import { useInventoryStore } from './modules/inventoryStore'
import { useShopStore } from './modules/shopStore'
import { useStaffStore } from './modules/staffStore'

/**
 * GameStore (Facade): Cổng giao tiếp chính kết hợp tất cả các module store.
 * Duy trì API cũ để đảm bảo tính tương thích với các thành phần UI và Phaser hiện tại.
 */
/**
 * GameStore (Facade Pattern) - Trung tâm điều phối dữ liệu của toàn bộ ứng dụng.
 * 
 * Tại sao cần Facade Store:
 * 1. Tập trung hóa API: Các Scene Phaser hoặc Component Vue chỉ cần import một store duy nhất 
 *    để truy cập mọi dữ liệu thay vì import 5-6 module nhỏ.
 * 2. Đảm bảo tính tương thích: Giữ nguyên cấu trúc API cũ trong khi logic thực tế đã được 
 *    tách nhỏ vào các sub-modules (Stats, Shop, Staff, Inventory).
 * 3. Quản lý trạng thái liên kết: Xử lý các nghiệp vụ phức tạp liên quan đến nhiều module 
 *    như Save/Load Game hoặc bắt đầu ngày mới (StartNewDay).
 */
export const useGameStore = defineStore('game', {
  state: () => ({
    // Facade không lưu trữ state trực tiếp, chỉ đóng vai trò ủy quyền (Delegation).
    // Để tương thích với việc destructuring trong App.vue (nếu có), 
    // ta nên tránh dùng facade để lưu trữ, nhưng có thể cung cấp getters/setters.
  }),
  
  /**
   * Getters: Ánh xạ (Map) các thuộc tính từ các store con để truy cập dễ dàng.
   */
  getters: {
    // === Stats & Progress (Modules: statsStore) ===
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

    // === Inventory & Cards (Modules: inventoryStore) ===
    shopInventory: () => useInventoryStore().shopInventory,
    personalBinder: () => useInventoryStore().personalBinder,
    allCards: () => useInventoryStore().allCards,
    shopItems: () => useInventoryStore().shopItems,
    isOpeningPack: () => useInventoryStore().isOpeningPack,
    currentPack: () => useInventoryStore().currentPack,

    // === Shop & Furniture (Modules: shopStore) ===
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
    waitingQueue: () => useShopStore().waitingQueue,

    // === Staff & Workers (Modules: staffStore) ===
    hiredWorkers: () => useStaffStore().hiredWorkers,

    // === Derived Stats ===
    requiredExp: () => useStatsStore().requiredExp,
    waitingCustomers: () => useShopStore().waitingCustomers,
  },

  /**
   * Actions: Điểm đến (Endpoint) cho toàn bộ lệnh logic trong game.
   */
  actions: {
    // --- UI State Setters ---
    setShowOnlineShop(val: boolean) { useShopStore().showOnlineShop = val },
    setShowBuildMenu(val: boolean) { useShopStore().showBuildMenu = val },
    setShowBinderMenu(val: boolean) { useShopStore().showBinderMenu = val },
    setShowSettings(val: boolean) { useStatsStore().showSettings = val },
    setBuildMode(val: boolean) { useShopStore().isBuildMode = val },
    setEditMode(val: boolean) { useShopStore().isEditMode = val },
    toggleEditMode() { useShopStore().toggleEditMode() },

    // --- Stats & Economy Actions ---
    addMoney(amount: number) { useStatsStore().addMoney(amount) },
    spendMoney(amount: number) { return useStatsStore().spendMoney(amount) },
    gainExp(amount: number) { useStatsStore().gainExp(amount) },
    tickTime(minutes: number) { useStatsStore().tickTime(minutes) },
    buyExpansion() { return useStatsStore().buyExpansion() },

    // --- Inventory Management ---
    buyStock(itemId: string, amount: number = 1) { return useInventoryStore().buyStock(itemId, amount) },
    unboxItem(boxId: string) { useInventoryStore().unboxItem(boxId) },
    tearPack(packId: string) { useInventoryStore().tearPack(packId) },
    closePackOpening() { useInventoryStore().closePackOpening() },

    // --- Shop Logistics & NPC Interaction ---
    /** Mở/Đóng cửa hàng */
    setShopState(newState: 'OPEN' | 'CLOSED') { useShopStore().setShopState(newState) },
    /** Phục vụ khách hàng tại quầy thu ngân */
    serveCustomer() { return useShopStore().serveCustomer() },
    /** Buộc kết thúc ngày (đóng cửa và hiện báo cáo) */
    forceEndDay() { useShopStore().forceEndDay() },
    /** Thêm khách hàng vào hàng chờ thanh toán */
    addWaitingCustomer(price: number, instanceId: string) { useShopStore().addWaitingCustomer(price, instanceId) },
    openShelfManagement(shelfId: string) { useShopStore().openShelfManagement(shelfId) },
    closeShelfManagement() { useShopStore().closeShelfManagement() },
    moveToTierSlot(itemId: string, tierIndex: number) { useShopStore().moveToTierSlot(itemId, tierIndex) },
    fillTier(itemId: string, tierIndex: number) { useShopStore().fillTier(itemId, tierIndex) },
    clearTier(shelfId: string, tierIndex: number) { useShopStore().clearTier(shelfId, tierIndex) },
    clearEntireShelf() { useShopStore().clearEntireShelf() },
    /** NPC lấy một món đồ ngẫu nhiên từ kệ */
    npcTakeItemFromSlot(shelfId: string) { return useShopStore().npcTakeItemFromSlot(shelfId) },
    
    // --- Furniture & Construction ---
    buyFurniture(furnitureId: string) { return useShopStore().buyFurniture(furnitureId) },
    startBuildMode(furnitureId: string) { useShopStore().startBuildMode(furnitureId) },
    cancelBuildMode() { useShopStore().cancelBuildMode() },
    placePlayTable(x: number, y: number) { return useShopStore().placePlayTable(x, y) },
    /** Bắt đầu đặt một món đồ vào Scene Phaser */
    placeFurniture(x: number, y: number, rotation: number = 0) { return useShopStore().placeFurniture(x, y, rotation) },
    /** Thu hồi đồ vật từ Scene về kho */
    pickUpFurniture(instanceId: string, type: 'shelf' | 'table' | 'cashier') { return useShopStore().pickUpFurniture(instanceId, type) },
    warehouseFurniture() { useShopStore().warehouseFurniture() },

    // --- Table & Match Logic ---
    joinTable(tableId: string, instanceId: string): number | null { return useShopStore().joinTable(tableId, instanceId) },
    startMatch(tableId: string) { useShopStore().startMatch(tableId) },
    finishMatch(tableId: string) { useShopStore().finishMatch(tableId) },

    // --- Staff Management ---
    hireWorker(workerId: string) { return useStaffStore().hireWorker(workerId) },
    /**
     * Thay đổi nhiệm vụ nhân viên và gán vào quầy thu ngân cụ thể.
     */
    changeWorkerDuty(instanceId: string, duty: any, targetDeskId?: string) { 
      useStaffStore().changeWorkerDuty(instanceId, duty, targetDeskId) 
    },
    terminateWorker(instanceId: string) { useStaffStore().terminateWorker(instanceId) },

    /**
     * Tích hợp loadSave từ tất cả các module.
     * Khôi phục toàn bộ trạng thái game từ LocalStorage.
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
          console.error("Lỗi nghiêm trọng khi đọc file save", e)
        }
      }
    },

    /**
     * Tích hợp saveGame: Tổng hợp dữ liệu từ các store con và lưu xuống LocalStorage.
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
     * startNewDay: Xử lý các thủ tục cuối ngày và bắt đầu ngày mới.
     * - Trừ lương nhân viên.
     * - Refresh trạng thái các bàn và khách hàng.
     * - Tăng biến đếm ngày.
     */
    startNewDay() {
      const statsStore = useStatsStore()
      const shopStore = useShopStore()
      const staffStore = useStaffStore()

      // 1. Tính toán và trừ lương nhân viên
      const totalSalary = staffStore.getTotalSalary()
      statsStore.startNewDay(totalSalary)
      
      // 2. Refresh hệ thống khách hàng
      shopStore.waitingCustomers = 0
      shopStore.waitingQueue = []
      
      // 3. Giải phóng toàn bộ ghế trên các bàn chơi
      Object.values(shopStore.placedTables).forEach(table => {
        table.occupants = [null, null]
        table.matchStartedAt = null
      })

      // 4. Tự động lưu game
      this.saveGame()
    }
  }
})
