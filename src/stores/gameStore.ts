import { defineStore } from 'pinia'
import cardsData from '../assets/data/cards.json'

export interface CardData {
  id: string
  name: string
  hp: number
  type: string
  rarity: string
  marketPrice: number
  imageKey: string
}

export interface ShelfItem {
  cardId: string;
  quantity: number;
}

export const useGameStore = defineStore('game', {
  state: () => ({
    money: 1000,
    inventory: {} as Record<string, number>, // cardId -> quantity
    shelves: {
      shelf1: null as ShelfItem | null,
      shelf2: null as ShelfItem | null
    },
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingCustomers: 0,
    waitingQueue: [] as number[],
    allCards: cardsData as CardData[]
  }),
  actions: {
    setShopState(newState: 'OPEN' | 'CLOSED') {
      this.shopState = newState
    },
    addMoney(amount: number) {
      this.money += amount
    },
    spendMoney(amount: number) {
      if (this.money >= amount) {
        this.money -= amount
        return true
      }
      return false
    },
    addWaitingCustomer(price: number) {
      this.waitingCustomers++
      this.waitingQueue.push(price)
    },
    serveCustomer() {
      if (this.waitingCustomers > 0) {
        this.waitingCustomers--
        const price = this.waitingQueue.shift() || 0
        this.addMoney(price)
      }
    },
    placeItemOnShelf(shelfId: 'shelf1' | 'shelf2') {
      const availableCardIds = Object.keys(this.inventory)
      if (availableCardIds.length === 0) return

      const currentShelf = this.shelves[shelfId]
      let cardToPlace = ''
      
      if (currentShelf && this.inventory[currentShelf.cardId]) {
        cardToPlace = currentShelf.cardId
      } else if (!currentShelf || currentShelf.quantity === 0) {
        cardToPlace = availableCardIds[0]
      } else {
        return
      }

      this.inventory[cardToPlace]--
      if (this.inventory[cardToPlace] === 0) {
        delete this.inventory[cardToPlace]
      }
      
      if (currentShelf && currentShelf.cardId === cardToPlace) {
        currentShelf.quantity++
      } else {
        this.shelves[shelfId] = { cardId: cardToPlace, quantity: 1 }
      }
    },
    npcTakeItemFromShelf(shelfId: 'shelf1' | 'shelf2') {
      const shelf = this.shelves[shelfId]
      if (shelf && shelf.quantity > 0) {
        const cardId = shelf.cardId
        shelf.quantity--
        if (shelf.quantity === 0) {
          this.shelves[shelfId] = null
        }
        return cardId
      }
      return null
    },
    openPack() {
      const PACK_PRICE = 10
      if (this.money < PACK_PRICE) {
        alert("Không đủ tiền mua Pack!")
        return []
      }
      this.spendMoney(PACK_PRICE)
      
      const pulledCards: CardData[] = []
      for (let i = 0; i < 5; i++) {
        const rand = Math.random() * 100
        let targetRarity = 'Common'
        if (rand <= 5) targetRarity = 'Rare'
        else if (rand <= 30) targetRarity = 'Uncommon'
        
        const possibleCards = this.allCards.filter(c => c.rarity === targetRarity)
        const cardPool = possibleCards.length > 0 ? possibleCards : this.allCards
        const randomCard = cardPool[Math.floor(Math.random() * cardPool.length)]
        
        pulledCards.push(randomCard)
        
        if (!this.inventory[randomCard.id]) {
          this.inventory[randomCard.id] = 0
        }
        this.inventory[randomCard.id]++
      }
      return pulledCards
    }
  }
})
