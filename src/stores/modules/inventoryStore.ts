import { defineStore } from 'pinia'
import cardsData from '../../assets/data/cards.json'
import { STOCK_ITEMS } from '../../config/shopData'
import type { StockItemInfo } from '../../config/shopData'
import { XP_REWARDS } from '../../config/leveling'
import { useStatsStore } from './statsStore'
import { useApiStore } from './apiStore'
import { useGameStore } from '../gameStore'

/**
 * InventoryStore - Quản lý dòng chảy hàng hóa và bộ sưu tập thẻ bài.
 * 
 * Các trách nhiệm chính:
 * - Kho hàng (Shop Inventory): Lưu trữ các vật phẩm thương mại (Box, Pack) chờ xếp lên kệ.
 * - Sưu tập (Personal Binder): Lưu trữ các thẻ bài cá nhân mà người chơi sở hữu sau khi xé pack.
 * - Gacha Mechanics: Xử lý logic xé thẻ (tearPack) với tỷ lệ hiếm (Rarity) khác nhau.
 * - Chuyển đổi hàng hóa: Logic khui thùng (unboxItem) để chia nhỏ thùng hàng thành các pack lẻ.
 */
export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    /** Hàng hóa thương mại có trong kho: itemId -> số lượng */
    shopInventory: {} as Record<string, number>, 
    /** Bộ sưu tập thẻ bài cá nhân: cardId -> số lượng */
    personalBinder: {} as Record<string, number>, 
    /** Toàn bộ dữ liệu thẻ bài có trong Game */
    allCards: cardsData as any[], 
    /** Cấu hình các loại mặt hàng có thể nhập về */
    shopItems: STOCK_ITEMS,
    
    // Trạng thái Gacha UI
    isOpeningPack: false,
    /** Danh sách thẻ bài vừa nhận được từ việc xé pack */
    currentPack: [] as any[],
    /** Lưu trữ pack cuối cùng đã xé để debug */
    lastPackPulled: [] as any[], 
  }),
  actions: {
    /**
     * Nhập hàng vào kho của shop.
     * @param itemId ID mặt hàng cần mua.
     * @param amount Số lượng nhập về.
     */
    buyStock(itemId: string, amount: number = 1) {
      const statsStore = useStatsStore()
      const itemData = this.shopItems[itemId]
      if (!itemData) return false

      const totalCost = itemData.buyPrice * amount
      if (!statsStore.spendMoney(totalCost)) return false
      if (statsStore.level < itemData.requiredLevel) return false

      if (!this.shopInventory[itemId]) this.shopInventory[itemId] = 0
      this.shopInventory[itemId] += amount
      return true
    },

    /**
     * Thêm bộ dữ liệu Shop mới vào danh sách shopItems hiện có.
     */
    mergeShopItems(shopItems: Record<string, StockItemInfo>) {
      this.shopItems = {
        ...STOCK_ITEMS,
        ...shopItems
      }
    },

    /**
     * Khui một thùng hàng (Box) để lấy các gói nhỏ (Pack) bên trong.
     * Thường dùng khi người chơi muốn xé pack thẻ bài lẻ từ một thùng hàng vừa nhập.
     */
    unboxItem(boxId: string) {
      const box = this.shopItems[boxId]
      if (!box || box.type !== 'box' || !box.contains) return

      if (this.shopInventory[boxId] > 0) {
         this.shopInventory[boxId]--
         if (this.shopInventory[boxId] === 0) delete this.shopInventory[boxId]

         const innerId = box.contains.itemId
         const innerAmount = box.contains.amount

         if (!this.shopInventory[innerId]) this.shopInventory[innerId] = 0
         this.shopInventory[innerId] += innerAmount
      }
    },

    /**
     * Logic "Xé Pack" (Gacha): 
     * - Trừ 1 pack từ kho hàng.
     * - Tính toán ngẫu nhiên 8 lá bài dựa trên trọng số hiếm (Weights) từ API TCGdex.
     * - Thêm bài vào Binder cá nhân và thưởng XP cho người chơi.
     * OPTIMIZATION: Chỉ load random cards thay vì toàn bộ set
     */
    async tearPack(packId: string) {
      const statsStore = useStatsStore()
      const apiStore = useApiStore()

      if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return

      // Get the original setId from shop items instead of parsing packId
      const packItem = apiStore.shopItems[packId]
      if (!packItem) {
        console.error(`Pack item not found: ${packId}`)
        return
      }

      // Use sourceSetId which is the original API set ID
      const setId = packItem.sourceSetId || packId.replace('pack_', '')
      console.log(`[TearPack] Opening pack ${packId} with setId: ${setId}`)

      // OPTIMIZATION: Get weighted random cards directly
      const randomCardsResult = await apiStore.getWeightedRandomCardsFromSet(setId, 8)

      if (!randomCardsResult || randomCardsResult.length === 0) {
        console.error('Failed to get random cards from set:', setId)
        return
      }

      const pulledCards: any[] = randomCardsResult

      this.shopInventory[packId]--
      if (this.shopInventory[packId] === 0) delete this.shopInventory[packId]

      // Thêm vào binder và thưởng XP
      for (const card of pulledCards) {
        if (!this.personalBinder[card.id]) {
          this.personalBinder[card.id] = 0
        }
        this.personalBinder[card.id]++

        // Thưởng XP dựa trên độ hiếm
        if (card.rarity === 'Rare' || card.rarity === 'Ultra Rare' || card.rarity === 'Secret Rare') {
          statsStore.gainExp(XP_REWARDS.OPEN_PACK_RARE)
        } else {
          statsStore.gainExp(XP_REWARDS.OPEN_PACK_COMMON)
        }
      }

      // Hiển thị kết quả xé pack
      this.lastPackPulled = pulledCards
      console.log('Pulled cards:', pulledCards.map(c => `${c.name} (${c.rarity})`))

      this.currentPack = pulledCards
      this.isOpeningPack = true
    },

    /**
     * Dọn dẹp trạng thái sau khi người chơi xem xong các lá bài vừa mở.
     */
    closePackOpening() {
      this.isOpeningPack = false
      this.currentPack = []

      // Auto-save after collecting cards
      const gameStore = useGameStore()
      gameStore.saveGame()
    },

    /**
     * Khôi phục kho hàng và bộ sưu tập từ bản lưu.
     */
    loadInventory(parsed: any) {
      this.shopInventory = parsed.shopInventory ?? {}
      this.personalBinder = parsed.personalBinder ?? {}
    }
  }
})