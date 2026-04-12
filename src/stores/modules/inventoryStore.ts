import { defineStore } from 'pinia'
import cardsData from '../../assets/data/cards.json'
import { STOCK_ITEMS } from '../../config/shopData'
import { XP_REWARDS } from '../../config/leveling'
import { useStatsStore } from './statsStore'

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
  }),
  actions: {
    /**
     * Nhập hàng vào kho của shop.
     * @param itemId ID mặt hàng cần mua.
     * @param amount Số lượng nhập về.
     */
    buyStock(itemId: string, amount: number = 1) {
      const statsStore = useStatsStore()
      const itemData = STOCK_ITEMS[itemId]
      if (!itemData) return false

      const totalCost = itemData.buyPrice * amount
      if (!statsStore.spendMoney(totalCost)) return false
      if (statsStore.level < itemData.requiredLevel) return false

      if (!this.shopInventory[itemId]) this.shopInventory[itemId] = 0
      this.shopInventory[itemId] += amount
      return true
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
     * - Tính toán ngẫu nhiên 8 lá bài dựa trên trọng số hiếm (Weights) của từng loại Pack.
     * - Thêm bài vào Binder cá nhân và thưởng XP cho người chơi.
     */
    tearPack(packId: string) {
      const statsStore = useStatsStore()
      if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return

      // Cấu hình tỷ lệ rơi thẻ dựa trên loại pack
      let weights = { Common: 65, Uncommon: 30, Rare: 5 } // Mặc định: Pack Basic
      if (packId === 'pack_rare') {
        weights = { Common: 15, Uncommon: 70, Rare: 15 }
      } else if (packId === 'silver_pack') {
        weights = { Common: 40, Uncommon: 45, Rare: 15 }
      } else if (packId === 'golden_pack') {
        weights = { Common: 10, Uncommon: 40, Rare: 50 }
      }

      this.shopInventory[packId]--
      if (this.shopInventory[packId] === 0) delete this.shopInventory[packId]

      const pulledCards: any[] = []
      // Mỗi pack luôn có 8 lá bài
      for (let i = 0; i < 8; i++) {
        const rand = Math.random() * 100
        let targetRarity = 'Common'
        
        // Xác định độ hiếm dựa trên con số ngẫu nhiên
        if (rand <= weights.Rare) {
            targetRarity = 'Rare'
        } else if (rand <= weights.Rare + weights.Uncommon) {
            targetRarity = 'Uncommon'
        }

        const possibleCards = this.allCards.filter((c: any) => c.rarity === targetRarity)
        const cardPool = possibleCards.length > 0 ? possibleCards : this.allCards
        const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)]

        pulledCards.push(randomCard)

        // Cập nhật Binder cá nhân
        if (!this.personalBinder[randomCard.id]) {
          this.personalBinder[randomCard.id] = 0
        }
        this.personalBinder[randomCard.id]++

        // Thưởng XP dựa trên độ hiếm của thẻ vừa xé được
        if (randomCard.rarity === 'Rare') statsStore.gainExp(XP_REWARDS.OPEN_PACK_RARE)
        else if (randomCard.rarity === 'Uncommon') statsStore.gainExp(XP_REWARDS.OPEN_PACK_UNCOMMON)
        else statsStore.gainExp(XP_REWARDS.OPEN_PACK_COMMON)
      }
      
      this.currentPack = pulledCards
      this.isOpeningPack = true
    },

    /**
     * Dọn dẹp trạng thái sau khi người chơi xem xong các lá bài vừa mở.
     */
    closePackOpening() {
      this.isOpeningPack = false
      this.currentPack = []
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