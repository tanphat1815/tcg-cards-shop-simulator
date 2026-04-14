/**
 * API Service Layer
 * Centralized service for all external API calls with error handling and caching.
 */

import { API_CONFIG } from '../features/inventory/config/apiConfig'
import { getSet, getCard, getSerie } from './tcgdexService'

interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface TcgSetSummary {
  id: string
  name: string
  cardCount?: {
    total: number
    official: number
  }
  releasedAt?: string
  boosters?: Array<{ artwork_front?: string }>
  logo?: string
  symbol?: string
}

export interface TcgSeries {
  id: string
  name: string
  logo?: string
  sets: TcgSetSummary[]
  releaseDate?: string
  firstSet?: TcgSetSummary
  lastSet?: TcgSetSummary
}

export interface TcgSet {
  id: string
  name: string
  logo?: string
  symbol?: string
  cardCount: {
    total: number
    official: number
  }
  cards: Array<{
    id: string
    name: string
    image: string
    localId: string
  }>
  releaseDate?: string
  serie?: {
    id: string
    name: string
  }
  legal?: {
    standard: boolean
    expanded: boolean
  }
}

export interface TcgCard {
  id: string
  name: string
  hp?: number
  types?: string[]
  weaknesses?: Array<{ type: string; value: string }>
  attacks?: Array<{ name: string; damage: string }>
  rarity?: string
  images?: { small?: string; large?: string }
  image?: string
  pricing?: {
    cardmarket?: {
      updated?: string
      unit?: string
      avg?: number
      low?: number
      trend?: number
      avg1?: number
      avg7?: number
      avg30?: number
      'avg-holo'?: number
      'low-holo'?: number
      'trend-holo'?: number
      'avg1-holo'?: number
      'avg7-holo'?: number
      'avg30-holo'?: number
    }
    tcgplayer?: {
      updated?: string
      unit?: string
      normal?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      reverse?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      holofoil?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      'reverse-holofoil'?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      '1st-edition'?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      '1st-edition-holofoil'?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      unlimited?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
      'unlimited-holofoil'?: {
        lowPrice?: number
        midPrice?: number
        highPrice?: number
        marketPrice?: number
        directLowPrice?: number
      }
    }
  }
  updated?: string
}

class ApiService {
  private cache = new Map<string, any>()

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TCGDEX.TIMEOUT)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async makeRequest<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return { data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { error: errorMessage }
    }
  }

  private async makeSdkRequest<T>(executor: () => Promise<T>): Promise<ApiResponse<T>> {
    try {
      const data = await executor()
      return { data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SDK request failed'
      console.error('[API SDK Error]', errorMessage, error)
      return { error: errorMessage }
    }
  }

  async getSeriesSets(seriesId: string = API_CONFIG.TCGDEX.DEFAULT_SERIES): Promise<ApiResponse<TcgSetSummary[]>> {
    const cacheKey = `series_${seriesId}`

    if (this.cache.has(cacheKey)) {
      return { data: this.cache.get(cacheKey) }
    }

    // Try SDK first with the correct method (getSerie)
    const sdkResult = await this.makeSdkRequest<any>(async () => {
      return await getSerie(seriesId)
    })

    if (sdkResult.data && sdkResult.data.sets && Array.isArray(sdkResult.data.sets)) {
      const sets = sdkResult.data.sets
      this.cache.set(cacheKey, sets)
      return { data: sets }
    }

    // Fallback to direct API call via proxy
    const url = `${API_CONFIG.TCGDEX.BASE_URL}${API_CONFIG.TCGDEX.ENDPOINTS.SERIES(seriesId)}`
    const result = await this.makeRequest<TcgSeries>(url)

    if (result.data && result.data.sets && Array.isArray(result.data.sets)) {
      this.cache.set(cacheKey, result.data.sets)
      return { data: result.data.sets }
    }

    return { error: result.error || 'Invalid series response format' }
  }

  async getSetCards(setId: string): Promise<ApiResponse<TcgCard[]>> {
    const cacheKey = `set_cards_${setId}`

    if (this.cache.has(cacheKey)) {
      return { data: this.cache.get(cacheKey) }
    }

    // OPTIMIZATION: Use SDK to get set with full card data
    const sdkResult = await this.makeSdkRequest<any>(async () => {
      const set = await getSet(setId)
      return set
    })

    if (sdkResult.data && sdkResult.data.cards && Array.isArray(sdkResult.data.cards)) {
      // Get full card details for all cards in parallel (much faster than sequential)
      const fullCardsPromises = sdkResult.data.cards.map(async (cardSummary: any) => {
        try {
          // Use getCardDetails which has caching
          const cardResult = await this.getCardDetails(cardSummary.id)
          return cardResult.data
        } catch (error) {
          console.warn(`Failed to load card ${cardSummary.id}:`, error)
          return null
        }
      })

      // Wait for all cards to load in parallel
      const fullCards = (await Promise.all(fullCardsPromises)).filter(card => card !== null) as TcgCard[]

      this.cache.set(cacheKey, fullCards)
      return { data: fullCards }
    }

    // Fallback to direct API call (should rarely be used now)
    const url = `${API_CONFIG.TCGDEX.BASE_URL}${API_CONFIG.TCGDEX.ENDPOINTS.SET(setId)}`
    const result = await this.makeRequest<TcgSet>(url)

    if (result.data && result.data.cards && Array.isArray(result.data.cards)) {
      // For fallback, still load in parallel but limit concurrency to avoid overwhelming API
      const fullCards: TcgCard[] = []
      const batchSize = 10 // Load 10 cards at a time

      for (let i = 0; i < result.data.cards.length; i += batchSize) {
        const batch = result.data.cards.slice(i, i + batchSize)
        const batchPromises = batch.map(cardSummary => this.getCardDetails(cardSummary.id))
        const batchResults = await Promise.all(batchPromises)

        for (const cardResult of batchResults) {
          if (cardResult.data) {
            fullCards.push(cardResult.data)
          }
        }
      }

      this.cache.set(cacheKey, fullCards)
      return { data: fullCards }
    }

    return { error: result.error || 'Failed to fetch set cards' }
  }

  async getRandomCardsFromSet(setId: string, count: number = 8): Promise<ApiResponse<TcgCard[]>> {
    // OPTIMIZATION: Random directly from set response cards without fetching each card details
    const setResult = await this.makeSdkRequest<any>(async () => {
      return await getSet(setId)
    })

    if (setResult.error) {
      console.error(`[API] Failed to fetch set ${setId}:`, setResult.error)
      return { error: `Failed to fetch set: ${setResult.error}` }
    }

    if (!setResult.data) {
      console.error(`[API] No data returned for set ${setId}`)
      return { error: 'No data returned from set API' }
    }

    // Try to get cards - SDK might return different structures
    let cardSummaries = setResult.data.cards

    if (!cardSummaries && setResult.data.Card) {
      cardSummaries = setResult.data.Card
    }

    if (!Array.isArray(cardSummaries)) {
      console.error(`[API] Set ${setId} has no cards array. Data keys:`, Object.keys(setResult.data))
      return { error: `No cards found in set ${setId}` }
    }

    // Select random card summaries directly (already has id, name, image)
    const selectedSummaries = this.selectRandomItems(cardSummaries, count)

    // Convert summaries to cards (they already have all needed info)
    const cards: TcgCard[] = selectedSummaries.map((summary: any) => ({
      id: summary.id,
      name: summary.name,
      image: summary.image || '',
    }))

    return { data: cards }
  }

  private selectRandomItems<T>(items: T[], count: number): T[] {
    if (items.length <= count) return [...items]

    const selected = new Set<T>()
    while (selected.size < count) {
      const randomIndex = Math.floor(Math.random() * items.length)
      selected.add(items[randomIndex])
    }
    return Array.from(selected)
  }

  async getWeightedRandomCardsFromSet(setId: string, count: number = 8): Promise<ApiResponse<TcgCard[]>> {
    // OPTIMIZATION: Get all cards from set and select weighted without fetching each card
    const setResult = await this.makeSdkRequest<any>(async () => {
      return await getSet(setId)
    })

    if (setResult.error) {
      console.error(`[API] Failed to fetch set ${setId}:`, setResult.error)
      return { error: `Failed to fetch set: ${setResult.error}` }
    }

    if (!setResult.data) {
      console.error(`[API] No data returned for set ${setId}`)
      return { error: 'No data returned from set API' }
    }

    // Try to get cards - SDK might return different structures
    let allCards = setResult.data.cards

    if (!allCards && setResult.data.Card) {
      // Fallback: some APIs use different property names
      allCards = setResult.data.Card
    }

    if (!Array.isArray(allCards)) {
      console.error(`[API] Set ${setId} has no cards array. Data keys:`, Object.keys(setResult.data))
      return { error: `No cards found in set ${setId}` }
    }

    if (allCards.length === 0) {
      console.error(`[API] Set ${setId} has empty cards array`)
      return { error: `Set ${setId} has no cards` }
    }

    // Filter cards having images only
    const cardsWithImages = allCards.filter((card: any) => card.image)
    
    if (cardsWithImages.length === 0) {
      console.warn(`[API] Set ${setId} has no cards with images, falling back to all cards`)
    }
    const pool = cardsWithImages.length > 0 ? cardsWithImages : allCards

    // Select cards
    // NOTE: Since getSet only returns summaries (no rarity), 
    // selection here is effectively uniform.
    const selectedSummaries = this.selectRandomItems(pool, count)

    // Parallel fetch full details for selected cards
    const fullCardsPromises = selectedSummaries.map(summary => this.getCardDetails((summary as any).id))
    const results = await Promise.all(fullCardsPromises)
    
    const selectedCards = results
      .map(r => r.data)
      .filter(Boolean) as TcgCard[]

    return { data: selectedCards }
  }


  async getCardDetails(cardId: string): Promise<ApiResponse<TcgCard>> {
    const cacheKey = `card_${cardId}`

    if (this.cache.has(cacheKey)) {
      return { data: this.cache.get(cacheKey) }
    }

    const sdkResult = await this.makeSdkRequest<any>(async () => {
      return await getCard(cardId)
    })

    if (sdkResult.data) {
      this.cache.set(cacheKey, sdkResult.data)
      return { data: sdkResult.data }
    }

    const url = `${API_CONFIG.TCGDEX.BASE_URL}${API_CONFIG.TCGDEX.ENDPOINTS.CARD_DETAILS(cardId)}`
    const result = await this.makeRequest<TcgCard>(url)

    if (result.data) {
      this.cache.set(cacheKey, result.data)
    }

    return result
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }
}


// Export singleton instance
export const apiService = new ApiService()

// Export types for use in other modules
export type { ApiResponse }