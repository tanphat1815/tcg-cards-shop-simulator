import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CardData {
  id: string
  name: string
  supertype?: string
  image?: string
  rarity?: string
  category?: string
  hp?: string
  types?: string[]
  evolveFrom?: string
  stage?: string
  description?: string
  retreatCost?: number
  abilities?: Array<{
    name: string
    text?: string
    effect?: string
    type?: string
  }>
  attacks?: Array<{
    name: string
    damage?: string
    text?: string
    effect?: string
    cost?: string[]
  }>
  weaknesses?: Array<{ type: string, value: string }>
  resistances?: Array<{ type: string, value: string }>
  artist?: string
  number?: string
  set_id?: string
  set_name?: string
  set_cardCount?: number
  series_id?: string
  series_name?: string
  tcgplayer_id?: string
  pricing?: {
    tcgplayer?: any
    cardmarket?: any
  }
}

export const useCardDetailStore = defineStore('cardDetail', () => {
  const isOpen = ref(false)
  const selectedCard = ref<CardData | null>(null)

  function openCard(card: any) {
    selectedCard.value = card
    isOpen.value = true
    document.body.style.overflow = 'hidden'
  }

  function closeCard() {
    isOpen.value = false
    // Delay resetting card data for smooth transition out if needed
    setTimeout(() => {
      selectedCard.value = null
    }, 300)
    document.body.style.overflow = ''
  }

  return {
    isOpen,
    selectedCard,
    openCard,
    closeCard
  }
})
