import { defineStore } from 'pinia'
import cardsData from '../../assets/data/cards.json'
import { STOCK_ITEMS } from '../../config/shopData'
import type { CardData } from '../../types/game'
import { useStatsStore } from './statsStore'
import { useShopStore } from './shopStore'
import { XP_REWARDS } from '../../config/leveling'

/**
 * Store quản lý kho hàng, trưng bày và xé thẻ bài.
 */
export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    shopInventory: {} as Record<string, number>, // itemId -> quantity
    personalBinder: {} as Record<string, number>, // cardId -> quantity (thẻ cá nhân)
    isOpeningPack: false,
    currentPack: [] as CardData[],
    allCards: cardsData as CardData[],
    shopItems: STOCK_ITEMS,
  }),

  actions: {
    /**
     * Mua hàng nhập kho.
     */
    buyStock(itemId: string, amount: number = 1) {
      const statsStore = useStatsStore()
      const itemData = this.shopItems[itemId]
      if (!itemData) return false
      
      const totalCost = itemData.buyPrice * amount
      if (statsStore.money < totalCost) return false
      if (statsStore.level < itemData.requiredLevel) return false
      
      statsStore.spendMoney(totalCost)
      this.shopInventory[itemId] = (this.shopInventory[itemId] || 0) + amount
      return true
    },

    /**
     * Xé hộp (Unbox) để lấy các pack bên trong.
     */
    unboxItem(boxId: string) {
      const box = this.shopItems[boxId]
      if (!box || box.type !== 'box' || !box.contains) return
      
      if (this.shopInventory[boxId] > 0) {
        this.shopInventory[boxId]--
        if (this.shopInventory[boxId] === 0) delete this.shopInventory[boxId]
        
        const { itemId, amount } = box.contains
        this.shopInventory[itemId] = (this.shopInventory[itemId] || 0) + amount
      }
    },

    /**
     * Mở một Pack thẻ bài và nhận 8 thẻ ngẫu nhiên.
     */
    tearPack(packId: string) {
      if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return
      const statsStore = useStatsStore()

      // Tỷ lệ may mắn cho từng loại Pack
      let weights = { Common: 65, Uncommon: 30, Rare: 5 }
      if (packId === 'pack_rare') weights = { Common: 15, Uncommon: 70, Rare: 15 }
      else if (packId === 'silver_pack') weights = { Common: 40, Uncommon: 45, Rare: 15 }
      else if (packId === 'golden_pack') weights = { Common: 10, Uncommon: 40, Rare: 50 }

      this.shopInventory[packId]--
      if (this.shopInventory[packId] === 0) delete this.shopInventory[packId]

      const pulledCards: CardData[] = []
      for (let i = 0; i < 8; i++) {
        const rand = Math.random() * 100
        let targetRarity = 'Common'
        if (rand <= weights.Rare) targetRarity = 'Rare'
        else if (rand <= weights.Rare + weights.Uncommon) targetRarity = 'Uncommon'
        
        const possibleCards = this.allCards.filter(c => c.rarity === targetRarity)
        const randomCard = (possibleCards.length > 0 ? possibleCards : this.allCards)[Math.floor(Math.random() * (possibleCards.length || this.allCards.length))]
        
        pulledCards.push(randomCard)
        this.personalBinder[randomCard.id] = (this.personalBinder[randomCard.id] || 0) + 1

        // Cộng XP khi mở thẻ
        if (randomCard.rarity === 'Rare') statsStore.gainExp(XP_REWARDS.OPEN_PACK_RARE)
        else if (randomCard.rarity === 'Uncommon') statsStore.gainExp(XP_REWARDS.OPEN_PACK_UNCOMMON)
        else statsStore.gainExp(XP_REWARDS.OPEN_PACK_COMMON)
      }

      this.currentPack = pulledCards
      this.isOpeningPack = true
    },

    /**
     * Đóng overlay xé thẻ bài.
     */
    closePackOpening() {
      this.isOpeningPack = false
      this.currentPack = []
    },

    /**
     * Thu hồi toàn bộ vật phẩm từ một tầng kệ về kho.
     */
    addItemsToInventory(itemId: string, count: number) {
        this.shopInventory[itemId] = (this.shopInventory[itemId] || 0) + count;
    },

    /**
     * Di chuyển 1 vật phẩm từ kho lên một slot trên tầng kệ.
     */
    moveToTierSlot(itemId: string, tierIndex: number, shelfId: string) {
      const shopStore = useShopStore()
      const shelf = shopStore.placedShelves[shelfId]
      if (!shelf) return

      const itemData = this.shopItems[itemId]
      if (!itemData || (this.shopInventory[itemId] || 0) <= 0) return

      const tier = shelf.tiers[tierIndex]
      const maxSlots = itemData.type === 'box' ? 4 : 32

      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      if (tier.itemId !== itemId || tier.slots.length >= tier.maxSlots) return

      tier.slots.push(itemId)
      this.shopInventory[itemId]--
      if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
    },

    /**
     * Lấp đầy một tầng kệ bằng vật phẩm đang chọn từ kho.
     */
    fillTier(itemId: string, tierIndex: number, shelfId: string) {
      const shopStore = useShopStore()
      const shelf = shopStore.placedShelves[shelfId]
      if (!shelf) return

      const itemData = this.shopItems[itemId]
      if (!itemData) return

      const tier = shelf.tiers[tierIndex]
      const maxSlots = itemData.type === 'box' ? 4 : 32

      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      if (tier.itemId !== itemId) return

      const spaceLeft = tier.maxSlots - tier.slots.length
      const available = this.shopInventory[itemId] ?? 0
      const toAdd = Math.min(spaceLeft, available)

      for (let i = 0; i < toAdd; i++) {
        tier.slots.push(itemId)
      }
      this.shopInventory[itemId] -= toAdd
      if (this.shopInventory[itemId] <= 0) delete this.shopInventory[itemId]
    },

    /**
     * Xóa sạch một tầng kệ và trả hàng về kho.
     */
    clearTier(shelfId: string, tierIndex: number) {
      const shopStore = useShopStore()
      const shelf = shopStore.placedShelves[shelfId]
      if (!shelf) return
      
      const tier = shelf.tiers[tierIndex]
      if (!tier.itemId) return

      this.addItemsToInventory(tier.itemId, tier.slots.length)
      tier.itemId = null
      tier.slots = []
      tier.maxSlots = 0
    },

    /**
     * Khách hàng lấy 1 vật phẩm ngẫu nhiên từ kệ hàng.
     */
    npcTakeItemFromSlot(shelfId: string) {
      const shopStore = useShopStore()
      const statsStore = useStatsStore()
      const shelf = shopStore.placedShelves[shelfId]
      if (!shelf) return null

      const filledTiers = shelf.tiers.map((t: any, idx: number) => ({ t, idx })).filter((x: any) => x.t.itemId && x.t.slots.length > 0)
      if (filledTiers.length === 0) return null

      const picked = filledTiers[Math.floor(Math.random() * filledTiers.length)]
      const tier = picked.t
      const itemId = tier.itemId!

      tier.slots.pop()
      if (tier.slots.length === 0) {
        tier.itemId = null
        tier.maxSlots = 0
      }

      statsStore.dailyStats.itemsSold++
      return itemId
    }
  }
})
