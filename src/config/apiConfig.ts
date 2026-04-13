/**
 * API Configuration
 * Centralized configuration for all external API endpoints and settings.
 */

export const API_CONFIG = {
  TCGDEX: {
    BASE_URL: '/api/tcgdex', // Proxied through Vite
    SDK_ENDPOINT: '/api/tcgdex',
    ENDPOINTS: {
      SERIES: (seriesId: string) => `/series/${seriesId}`,
      SET: (setId: string) => `/sets/${setId}`,
      CARD_DETAILS: (cardId: string) => `/cards/${cardId}`,
    },
    DEFAULT_SERIES: 'swsh', // Sword & Shield
    TIMEOUT: 10000, // 10 seconds
  },
} as const

export type ApiConfig = typeof API_CONFIG