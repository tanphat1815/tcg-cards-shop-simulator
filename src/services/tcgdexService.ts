import TCGdex from '@tcgdex/sdk'

// Initialize SDK properly according to documentation
// Use default endpoint (official TCGdex API) - don't override with custom endpoints
const tcgdex = new TCGdex('en')

export const getTcgdexClient = () => tcgdex

// Use proper SDK methods as per documentation
export const getCard = async (cardId: string) => {
  return await tcgdex.card.get(cardId)
}

export const getSet = async (setId: string) => {
  return await tcgdex.set.get(setId)
}

export const getSerie = async (serieId: string) => {
  return await tcgdex.serie.get(serieId)
}

export const getSerieSets = async (serieId: string) => {
  const serie = await getSerie(serieId)
  return serie?.sets || []
}

export const getRandomCard = async () => {
  return await tcgdex.random.card()
}

export const getRandomCardFromSet = async (setId: string) => {
  // Get set first, then pick random card from it
  const set = await getSet(setId)
  if (set && set.cards && set.cards.length > 0) {
    const randomIndex = Math.floor(Math.random() * set.cards.length)
    const cardSummary = set.cards[randomIndex]
    return await cardSummary.getCard()
  }
  throw new Error('No cards found in set')
}
