export const API_CONFIG = {
  TCGDEX: {
    BASE_URL: 'https://api.tcgdex.net/v2/en',
    TIMEOUT: 15000,
    DEFAULT_SERIES: 'swsh',
    ENDPOINTS: {
      SERIES: (id: string) => `/series/${id}`,
      SET: (id: string) => `/sets/${id}`,
      CARD_DETAILS: (id: string) => `/cards/${id}`,
    }
  }
};
