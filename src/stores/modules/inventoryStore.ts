import { defineStore } from 'pinia'
import cardsData from '../../assets/data/cards.json'
import { STOCK_ITEMS } from '../../config/shopData'
import { XP_REWARDS } from '../../config/leveling'
import { useStatsStore } from './statsStore'

/**
 * Store quản lý kho hàng và bộ sưu tập cá nhân
 */
export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    shopInventory: {} as Record<string, number>, // itemId -> quantity
    personalBinder: {} as Record<string, number>, // cardId -> quantity
    allCards: cardsData as any[], // Sẽ import CardData từ types
    shopItems: STOCK_ITEMS,
    isOpeningPack: false,
    currentPack: [] as any[], // CardData[]
  }),
  actions: {
    /**
     * Mua hàng vào kho
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
     * Mở hộp
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
     * Xé pack
     */
    tearPack(packId: string) {
      const statsStore = useStatsStore()
      if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return

      let weights = { Common: 65, Uncommon: 30, Rare: 5 } // pack_basic
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
      for (let i = 0; i < 8; i++) {
        const rand = Math.random() * 100
        let targetRarity = 'Common'
        if (rand <= weights.Rare) {
           targetRarity = 'Rare'
        } else if (rand <= weights.Rare + weights.Uncommon) {
           targetRarity = 'Uncommon'
        }

        const possibleCards = this.allCards.filter((c: any) => c.rarity === targetRarity)
        const cardPool = possibleCards.length > 0 ? possibleCards : this.allCards
        const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)]

        pulledCards.push(randomCard)

        // Add single cards directly to personal binder
        if (!this.personalBinder[randomCard.id]) {
          this.personalBinder[randomCard.id] = 0
        }
        this.personalBinder[randomCard.id]++

        // XP Reward from opening
        if (randomCard.rarity === 'Rare') statsStore.gainExp(XP_REWARDS.OPEN_PACK_RARE)
        else if (randomCard.rarity === 'Uncommon') statsStore.gainExp(XP_REWARDS.OPEN_PACK_UNCOMMON)
        else statsStore.gainExp(XP_REWARDS.OPEN_PACK_COMMON)
      }
      this.currentPack = pulledCards
      this.isOpeningPack = true
    },
    /**
     * Đóng overlay mở pack
     */
    closePackOpening() {
      this.isOpeningPack = false
      this.currentPack = []
    },
    /**
     * Load dữ liệu từ save (phần inventory)
     */
    loadInventory(parsed: any) {
      this.shopInventory = parsed.shopInventory ?? {}
      this.personalBinder = parsed.personalBinder ?? {}
    }
  }
})