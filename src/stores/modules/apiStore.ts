import { defineStore } from 'pinia'
import { useInventoryStore } from './inventoryStore'
import type { StockItemInfo } from '../../config/shopData'
import { apiService, type TcgSetSummary } from '../../services/apiService'

const sanitizeId = (source: string) => source.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()

const createRequiredLevel = (index: number, cardCount?: number, releasedAt?: string) => {
  const yearMatch = typeof releasedAt === 'string' ? releasedAt.match(/(\d{4})/) : null
  const year = yearMatch ? Number(yearMatch[1]) : undefined

  if (cardCount && cardCount <= 60) return 1
  if (year && year <= 2018) return 1

  const requiredLevels = [1, 3, 5, 7, 10, 12, 14, 16, 18, 20]
  return requiredLevels[Math.min(index, requiredLevels.length - 1)]
}

const buildPrice = (value: number) => Number(value.toFixed(2))

export const useApiStore = defineStore('api', {
  state: () => ({
    sets: [] as TcgSetSummary[],
    shopItems: {} as Record<string, StockItemInfo>,
    isLoading: false,
    error: '',
    setCardsCache: {} as Record<string, any[]>, // Cache cho cards của từng set
  }),
  getters: {
    sortedShopItems: (state) => Object.values(state.shopItems).sort((a, b) => {
      if (a.requiredLevel !== b.requiredLevel) return a.requiredLevel - b.requiredLevel
      return a.name.localeCompare(b.name)
    })
  },
  actions: {
    async initSeriesShop(seriesId = 'swsh') {
      // 1. First try to load from LocalStorage to avoid UI blink
      this.loadFromStorage()

      if (this.sets.length > 0) {
        // We already have data, but we might want to refresh metadata merge
        this.mergeShopItemsIntoInventory()
        return
      }

      await this.loadSeriesSets(seriesId)
      if (this.sets.length > 0) {
        this.shopItems = this.generateShopItemsFromSets(this.sets)
        this.mergeShopItemsIntoInventory()
        this.saveToStorage()
      }
    },

    saveToStorage() {
      try {
        const data = {
          sets: this.sets,
          shopItems: this.shopItems,
          setCardsCache: this.setCardsCache
        }
        localStorage.setItem('tcg-shop-api-cache', JSON.stringify(data))
      } catch (e) {
        console.warn('[ApiStore] Failed to save cache:', e)
      }
    },

    loadFromStorage() {
      try {
        const saved = localStorage.getItem('tcg-shop-api-cache')
        if (saved) {
          const parsed = JSON.parse(saved)
          this.sets = parsed.sets || []
          this.shopItems = parsed.shopItems || {}
          this.setCardsCache = parsed.setCardsCache || {}
          console.log('[ApiStore] Restored data from cache:', Object.keys(this.shopItems).length, 'items')
        }
      } catch (e) {
        console.warn('[ApiStore] Failed to load cache:', e)
      }
    },

    async loadSeriesSets(seriesId: string) {
      this.isLoading = true
      this.error = ''

      const result = await apiService.getSeriesSets(seriesId)

      if (result.error) {
        this.error = result.error
      } else if (result.data) {
        this.sets = result.data.map((set: any) => ({
          id: set.id,
          name: set.name,
          cardCount: set.cardCount,
          releasedAt: set.releasedAt || set.releaseDate || set.released_at,
          boosters: Array.isArray(set.boosters) ? set.boosters : []
        }))
      }

      this.isLoading = false
    },

    generateShopItemsFromSets(sets: TcgSetSummary[]) {
      const items: Record<string, StockItemInfo> = {}
      sets.forEach((set, index) => {
        const slug = sanitizeId(set.id || set.name || `set_${index}`)
        const boxId = `box_${slug}`
        const packId = `pack_${slug}`
        const boxPrice = buildPrice(40 + Math.random() * 20)
        const packPrice = buildPrice(boxPrice / 32)
        const requiredLevel = createRequiredLevel(index, set.cardCount?.total || 0, set.releasedAt)

        // Store original API set ID for pack opening
        const sourceSetId = set.id || slug

        items[packId] = {
          id: packId,
          name: `${set.name} Booster Pack`,
          buyPrice: packPrice,
          sellPrice: buildPrice(packPrice * 1.6),
          requiredLevel,
          type: 'pack',
          volume: 1,
          description: `Pack của bộ ${set.name}. Mở ra 5 thẻ bài ngẫu nhiên từ set.`,
          sourceSetId // Store original set ID
        }

        items[boxId] = {
          id: boxId,
          name: `${set.name} Booster Box (32 Packs)`,
          buyPrice: boxPrice,
          sellPrice: buildPrice(boxPrice * 1.4),
          requiredLevel: Math.max(requiredLevel, 3),
          type: 'box',
          volume: 8,
          contains: { itemId: packId, amount: 32 },
          description: `Hộp ${set.name} gồm 32 Booster Pack. Giá tốt để nhập số lượng lớn.`,
          sourceSetId // Store original set ID
        }
      })
      return items
    },

    mergeShopItemsIntoInventory() {
      const inventoryStore = useInventoryStore()
      inventoryStore.mergeShopItems(this.shopItems)
    },

    /**
     * Đảm bảo card có trong cache, nếu không có sẽ fetch lẻ
     */
    async ensureCardInCache(cardId: string) {
      // 1. Kiểm tra cache hiện có
      for (const setCards of Object.values(this.setCardsCache)) {
        if (setCards.find((c: any) => c.id === cardId)) return true
      }

      // 2. Nếu không thấy, fetch từ API
      const result = await apiService.getCardDetails(cardId)
      if (result.data) {
        const card = result.data
        // Giả định card.set.id tồn tại hoặc dùng "misc"
        const setId = (card as any).set?.id || 'misc'
        if (!this.setCardsCache[setId]) {
          this.setCardsCache[setId] = []
        }
        if (!this.setCardsCache[setId].find((c: any) => c.id === card.id)) {
          this.setCardsCache[setId].push(card)
        }
        this.saveToStorage()
        return true
      }
      return false
    },

    async loadSetCards(setId: string): Promise<any[]> {
      if (this.setCardsCache[setId]) {
        return this.setCardsCache[setId]
      }

      const result = await apiService.getSetCards(setId)
      if (result.error) {
        console.error('Error loading set cards:', result.error)
        return []
      }

      const cards = result.data || []
      this.setCardsCache[setId] = cards
      return cards
    },

    /**
     * Tự động lưu cache mỗi khi có dữ liệu mới được fetch
     */
    async getWeightedRandomCardsFromSet(setId: string, count: number = 8) {
      const result = await apiService.getWeightedRandomCardsFromSet(setId, count)
      if (result.error) {
        console.error('Error getting random cards:', result.error)
        return []
      }

      const cards = result.data || []

      // Ensure pulled cards are cached for later lookup in Binder
      if (!this.setCardsCache[setId]) {
        this.setCardsCache[setId] = []
      }
      for (const card of cards) {
        if (!this.setCardsCache[setId].find((c: any) => c.id === card.id)) {
          this.setCardsCache[setId].push(card)
        }
      }
      
      // Save updated cache to storage
      this.saveToStorage()

      return cards
    },
  }
})
