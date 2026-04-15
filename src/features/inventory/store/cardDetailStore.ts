import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface CardData {
  id: string
  name: string
  image?: string
  rarity?: string
  category?: string
  hp?: string
  types?: string[]
  attacks?: Array<{
    name: string
    damage?: string
    text?: string
    cost?: string[]
  }>
  weaknesses?: Array<{ type: string, value: string }>
  retreat?: number
  description?: string
  effect?: string
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
