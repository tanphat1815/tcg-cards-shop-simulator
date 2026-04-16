import { defineStore } from 'pinia'
import { useInventoryStore } from './inventoryStore'
import { type StockItemInfo, SET_BLACKLIST } from '../config'
import { dbService } from '../../api/services/dbService'

const API_CACHE_VERSION = 'v4-sqlite'

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
    'base': 'GENERATION I',
    'gym': 'GENERATION I',
    'neo': 'GENERATION I',
    'lc': 'GENERATION I',
    'ecard': 'GENERATION I',
    'ex': 'GENERATION III',
    'dp': 'GENERATION IV',
    'pl': 'GENERATION IV',
    'hgss': 'GENERATION IV',
    'col': 'GENERATION IV',
    'bw': 'GENERATION V',
    'xy': 'GENERATION VI',
    'sm': 'GENERATION VII',
    'swsh': 'GENERATION VIII',
    'sv': 'GENERATION IX',
    'tcgp': 'SPECIAL COLLECTIONS'
  }
  return names[seriesId] || 'OTHER SERIES'
}

/**
 * Helper to safely parse JSON fields from SQLite
 */
const processCardRow = (row: any) => {
  if (!row) return row
  const card = { ...row }
  
  // Parse các trường JSON thô từ SQLite
  const jsonFields = ['types', 'attacks', 'abilities', 'weaknesses', 'resistances', 'pricing']
  jsonFields.forEach(field => {
    if (typeof card[field] === 'string' && card[field].trim() !== '') {
      try {
        card[field] = JSON.parse(card[field])
      } catch (e) {
        // Fallback: Trả về mảng rỗng hoặc null tùy trường
        card[field] = ['types', 'attacks', 'abilities', 'weaknesses', 'resistances'].includes(field) ? [] : null
      }
    }
  })

  return card
}

const buildPrice = (value: number) => Number(value.toFixed(2))

export interface TcgSetSummary {
  id: string;
  name: string;
  serie: { id: string; name: string };
  cardCount: number;
  releasedAt?: string;
  boosters?: string[];
}

export const useApiStore = defineStore('api', {
  state: () => ({
    sets: [] as TcgSetSummary[],
    shopItems: {} as Record<string, StockItemInfo>,
    isLoading: false,
    error: '',
    setCardsCache: {} as Record<string, any[]>, 
  }),
  getters: {
    sortedShopItems: (state) => Object.values(state.shopItems).sort((a, b) => {
      if (a.requiredLevel !== b.requiredLevel) return a.requiredLevel - b.requiredLevel
      return a.name.localeCompare(b.name)
    })
  },
  actions: {
    async initSeriesShop() {
      // 1. First try to load from LocalStorage
      this.loadFromStorage()

      if (Object.keys(this.shopItems).length > 0) {
        this.mergeShopItemsIntoInventory()
        return
      }

      this.isLoading = true

      try {
        console.log('[ApiStore] Starting SQLite Shop initialization...')
        
        // Fetch ALL sets and series from SQLite
        const rows = await dbService.query(`
          SELECT s.*, ser.name as serieName 
          FROM sets s 
          JOIN series ser ON s.serieId = ser.id
          ORDER BY s.id ASC
        `);

        if (rows && rows.length > 0) {
          this.sets = rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            serie: { id: row.serieId, name: row.serieName },
            cardCount: row.cardCount,
            boosters: []
          }));
          
          this.shopItems = this.generateShopItemsFromSets(this.sets)
          this.mergeShopItemsIntoInventory()
          this.saveToStorage()
        }
      } catch (e) {
        this.error = 'Failed to initialize Local Database Shop data'
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
          if (parsed.version !== API_CACHE_VERSION) {
            localStorage.removeItem('tcg-shop-api-cache')
            return
          }
          this.sets = parsed.sets || []
          this.shopItems = parsed.shopItems || {}
          this.setCardsCache = parsed.setCardsCache || {}
        }
      } catch (e) {
        console.warn('[ApiStore] Failed to load cache:', e)
      }
    },

    generateShopItemsFromSets(sets: TcgSetSummary[]) {
      const items: Record<string, StockItemInfo> = {}
      
      sets.forEach((set, index) => {
        if (SET_BLACKLIST.includes(set.id)) return

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
          buyPrice: buildPrice(packPrice * 64 * 0.85),
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

    async ensureCardInCache(cardId: string) {
      for (const setCards of Object.values(this.setCardsCache)) {
        if (setCards.find((c: any) => c.id === cardId)) return true
      }

      const rows = await dbService.query('SELECT * FROM cards WHERE id = ?', [cardId]);
      if (rows && rows.length > 0) {
        const card = processCardRow(rows[0]);
        const setId = card.set_id || 'misc';
        if (!this.setCardsCache[setId]) this.setCardsCache[setId] = [];
        this.setCardsCache[setId].push(card);
        this.saveToStorage();
        return true
      }
      return false
    },

    async loadSetCards(setId: string): Promise<any[]> {
      if (this.setCardsCache[setId]) return this.setCardsCache[setId]

      const rows = await dbService.query('SELECT * FROM cards WHERE set_id = ?', [setId]);
      const cards = (rows || []).map(processCardRow);
      this.setCardsCache[setId] = cards;
      return cards
    },

    async getWeightedRandomCardsFromSet(setId: string, count: number = 6) {
      // Logic mở pack: Sử dụng SQL RANDOM() siêu tốc
      const rows = await dbService.query(
        'SELECT * FROM cards WHERE set_id = ? ORDER BY RANDOM() LIMIT ?', 
        [setId, count]
      );
      
      const cards = (rows || []).map(processCardRow);

      if (!this.setCardsCache[setId]) this.setCardsCache[setId] = [];
      for (const card of cards) {
        if (!this.setCardsCache[setId].find((c: any) => c.id === card.id)) {
          this.setCardsCache[setId].push(card)
        }
      }
      this.saveToStorage()
      return cards
    },
  }
})
