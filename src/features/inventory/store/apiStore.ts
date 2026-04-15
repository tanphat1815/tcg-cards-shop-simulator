import { defineStore } from 'pinia'
import { useInventoryStore } from './inventoryStore'
import { useStatsStore } from '../../stats/store/statsStore'
import { useStaffStore } from '../../staff/store/staffStore'
import { STOCK_ITEMS, type StockItemInfo, SET_BLACKLIST } from '../config'
import { apiService, type TcgSetSummary } from '../../../services/apiService'

const API_CACHE_VERSION = 'v3'

const sanitizeId = (source: string) => source.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()

/**
 * Quy định Level mở khóa dựa trên Series ID chuẩn TCGdex
 */
const getRequiredLevel = (seriesId: string): number => {
  const mapping: Record<string, number> = {
    'base': 1, 'gym': 1, 'neo': 1, 'lc': 1, 'ecard': 1, // Gen 1
    'ex': 11, // Gen 3
    'dp': 21, 'pl': 21, 'hgss': 21, 'col': 21, // Gen 4
    'bw': 31, // Gen 5
    'xy': 41, // Gen 6
    'sm': 51, // Gen 7
    'swsh': 61, // Gen 8
    'sv': 71, // Gen 9
    'tcgp': 80, 'me': 80, 'misc': 80, 'pop': 80, 'tk': 80, 'mc': 80 // Special
  }
  return mapping[seriesId] || 80
}

/**
 * Ánh xạ Series ID sang Tên Thế hệ hiển thị
 */
const getGenerationName = (seriesId: string): string => {
  const names: Record<string, string> = {
    'base': 'GENERATION I', 'gym': 'GENERATION I', 'neo': 'GENERATION I', 'lc': 'GENERATION I', 'ecard': 'GENERATION I',
    'ex': 'GENERATION III',
    'dp': 'GENERATION IV', 'pl': 'GENERATION IV', 'hgss': 'GENERATION IV', 'col': 'GENERATION IV',
    'bw': 'GENERATION V',
    'xy': 'GENERATION VI',
    'sm': 'GENERATION VII',
    'swsh': 'GENERATION VIII',
    'sv': 'GENERATION IX',
    'tcgp': 'SPECIAL COLLECTIONS'
  }
  return names[seriesId] || 'OTHER SERIES'
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
    async initSeriesShop() {
      // 1. First try to load from LocalStorage to avoid UI blink
      this.loadFromStorage()

      if (Object.keys(this.shopItems).length > 0) {
        this.mergeShopItemsIntoInventory()
        return
      }

      // 2. Load all main series to build a full shop catalog
      const mainSeries = ['base', 'ex', 'dp', 'bw', 'xy', 'sm', 'swsh', 'sv']
      this.isLoading = true

      try {
        console.log('[ApiStore] Starting full shop initialization...')
        this.sets = [] // Reset sets before loading all series
        for (const sId of mainSeries) {
          console.log(`[ApiStore] Fetching series: ${sId}`)
          await this.loadSeriesSets(sId)
        }
        
        console.log(`[ApiStore] Loading complete. Total sets found: ${this.sets.length}`)
        this.shopItems = this.generateShopItemsFromSets(this.sets)
        this.mergeShopItemsIntoInventory()
        this.saveToStorage()
      } catch (e) {
        this.error = 'Failed to initialize Online Shop data'
        console.error(e)
      } finally {
        this.isLoading = false
      }
    },

    saveToStorage() {
      try {
        const data = {
          version: API_CACHE_VERSION,
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
          
          // Check version mismatch - Invalidate if old
          if (parsed.version !== API_CACHE_VERSION) {
            console.warn(`[ApiStore] Cache version mismatch (${parsed.version} vs ${API_CACHE_VERSION}). Clearing cache...`)
            localStorage.removeItem('tcg-shop-api-cache')
            return
          }

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
        const mappedSets = result.data.map((set: any) => ({
          id: set.id,
          name: set.name,
          // Đảm bảo có serie info, nếu API không trả về thì dùng seriesId truyền vào
          serie: set.serie || { id: seriesId, name: seriesId.toUpperCase() },
          cardCount: set.cardCount,
          releasedAt: set.releasedAt || set.releaseDate || set.released_at,
          boosters: Array.isArray(set.boosters) ? set.boosters : []
        }))
        this.sets.push(...mappedSets)
      }

      this.isLoading = false
    },

    generateShopItemsFromSets(sets: TcgSetSummary[]) {
      const items: Record<string, StockItemInfo> = {}
      
      sets.forEach((set, index) => {
        // Skip blacklisted sets
        if (SET_BLACKLIST.includes(set.id)) {
          console.log(`[ApiStore] Skipping blacklisted set: ${set.id} (${set.name})`)
          return
        }

        const slug = sanitizeId(set.id || set.name || `set_${index}`)
        const boxId = `box_${slug}`
        const packId = `pack_${slug}`
        
        const seriesId = set.serie?.id || 'misc'
        const generation = getGenerationName(seriesId)
        const requiredLevel = getRequiredLevel(seriesId)

        const boxPrice = buildPrice(40 + Math.random() * 20)
        const packPrice = buildPrice(boxPrice / 32)

        const sourceSetId = set.id || slug

        items[packId] = {
          id: packId,
          name: `${set.name} Booster Pack`,
          buyPrice: packPrice,
          sellPrice: buildPrice(packPrice * 1.6),
          requiredLevel,
          type: 'pack',
          volume: 1,
          description: `Pack của bộ ${set.name}. Thế hệ: ${generation}.`,
          sourceSetId,
          generation
        }

        items[boxId] = {
          id: boxId,
          name: `${set.name} Booster Box (64 Packs)`,
          buyPrice: buildPrice(packPrice * 64 * 0.85), // Chiết khấu sỉ
          sellPrice: buildPrice(packPrice * 64 * 1.4),
          requiredLevel: Math.max(requiredLevel, 5),
          type: 'box',
          volume: 16,
          contains: { itemId: packId, amount: 64 },
          description: `Hộp ${set.name} gồm 64 Booster Pack. Giá sỉ cực tốt.`,
          sourceSetId,
          generation
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
    async getWeightedRandomCardsFromSet(setId: string, count: number = 6) {
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
