import { useStatsStore } from '../stores/modules/statsStore'
import { useInventoryStore } from '../stores/modules/inventoryStore'
import { useShopStore } from '../stores/modules/shopStore'
import { useStaffStore } from '../stores/modules/staffStore'

/**
 * Hệ thống quản lý lưu trữ và tải dữ liệu (Save/Load System).
 * Tách biệt logic lưu trữ khỏi Store để dễ bảo trì.
 */
export const saveSystem = {
  /**
   * Thu thập dữ liệu từ tất cả các Store và lưu vào localStorage.
   */
  saveGame() {
    const stats = useStatsStore()
    const inventory = useInventoryStore()
    const shop = useShopStore()
    const staff = useStaffStore()

    const saveData = {
      // Stats
      money: stats.money,
      level: stats.level,
      currentExp: stats.currentExp,
      currentDay: stats.currentDay,
      timeInMinutes: stats.timeInMinutes,
      
      // Inventory
      shopInventory: inventory.shopInventory,
      personalBinder: inventory.personalBinder,
      
      // Shop & Furniture
      placedShelves: shop.placedShelves,
      placedTables: shop.placedTables,
      placedCashiers: shop.placedCashiers,
      purchasedFurniture: shop.purchasedFurniture,
      expansionLevel: shop.expansionLevel,
      settings: shop.settings,
      
      // Staff
      hiredWorkers: staff.hiredWorkers,
      
      version: '2.0.0',
      timestamp: Date.now()
    }

    localStorage.setItem('tcg-shop-save-v2', JSON.stringify(saveData))
    console.log('[SaveSystem] Game saved successfully.')
  },

  /**
   * Tải dữ liệu từ localStorage và phân bổ vào các Store tương ứng.
   * Hỗ trợ migration từ phiên bản cũ (v1).
   */
  loadGame() {
    const stats = useStatsStore()
    const inventory = useInventoryStore()
    const shop = useShopStore()
    const staff = useStaffStore()

    const rawSaveV2 = localStorage.getItem('tcg-shop-save-v2')
    const rawSaveV1 = localStorage.getItem('tcg-shop-save') // Bản cũ

    let data: any = null

    if (rawSaveV2) {
      data = JSON.parse(rawSaveV2)
    } else if (rawSaveV1) {
      console.warn('[SaveSystem] Detected legacy save (v1). Migrating...')
      data = JSON.parse(rawSaveV1)
    }

    if (data) {
      try {
        // Stats
        stats.money = data.money ?? 1000
        stats.level = data.level ?? 1
        stats.currentExp = data.currentExp ?? 0
        stats.currentDay = data.currentDay ?? 1
        stats.timeInMinutes = data.timeInMinutes ?? 480

        // Inventory
        inventory.shopInventory = data.shopInventory ?? {}
        inventory.personalBinder = data.personalBinder ?? {}

        // Shop & Furniture
        shop.placedShelves = data.placedShelves ?? {}
        shop.placedTables = data.placedTables ?? {}
        shop.placedCashiers = data.placedCashiers ?? shop.placedCashiers
        shop.purchasedFurniture = data.purchasedFurniture ?? {}
        shop.expansionLevel = data.expansionLevel ?? 0
        if (data.settings) shop.settings = { ...shop.settings, ...data.settings }

        // Migration cho tọa độ nội thất (nếu từ bản cũ 1.x)
        if (rawSaveV1 && !rawSaveV2) {
           this.migrateFurnitureCoordinates(shop)
        }

        // Staff
        staff.hiredWorkers = data.hiredWorkers ?? []

        console.log('[SaveSystem] Game loaded successfully.')
        return true
      } catch (e) {
        console.error('[SaveSystem] Failed to parse save data.', e)
      }
    }
    return false
  },

  /**
   * Hỗ trợ dịch chuyển tọa độ đồ đạc từ hệ thống cũ sang hệ thống shop mở rộng mới.
   */
  migrateFurnitureCoordinates(shop: any) {
    const migrate = (obj: any) => {
      if (obj.x < 500) { obj.x += 900; obj.y += 900; }
    }
    Object.values(shop.placedShelves).forEach(migrate)
    Object.values(shop.placedTables).forEach(migrate)
    Object.values(shop.placedCashiers).forEach(migrate)
  }
}
