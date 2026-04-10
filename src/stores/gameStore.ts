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
    binder: {} as Record<string, number>, // cardId -> quantity
    shelves: {
      shelf1: null as ShelfItem | null,
      shelf2: null as ShelfItem | null
    },
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingCustomers: 0,
    waitingQueue: [] as number[],
    isOpeningPack: false,
    currentPack: [] as CardData[],
    allCards: cardsData as CardData[],
    // Day cycle
    currentDay: 1,
    timeInMinutes: 480, // 8:00 AM
    showEndDayModal: false,
    showBinderMenu: false,
    dailyStats: {
      revenue: 0,
      customersServed: 0,
      itemsSold: 0
    }
  }),
  actions: {
    loadSave() {
      const saved = localStorage.getItem('tcg-shop-save')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          this.money = parsed.money ?? 1000
          this.inventory = parsed.inventory ?? {}
          this.binder = parsed.binder ?? {}
          this.shelves = parsed.shelves ?? { shelf1: null, shelf2: null }
          this.currentDay = parsed.currentDay ?? 1
          this.timeInMinutes = parsed.timeInMinutes ?? 480
          this.shopState = parsed.shopState ?? 'OPEN'
        } catch (e) {
          console.error("Lỗi khi đọc file save", e)
        }
      }
    },
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
        // Cập nhật stats
        this.dailyStats.customersServed++
        this.dailyStats.revenue += price
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
        this.dailyStats.itemsSold++
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
      this.currentPack = pulledCards
      this.isOpeningPack = true
      return pulledCards
    },
    closePackOpening() {
      this.isOpeningPack = false
      this.currentPack = []
    },
    tickTime(minutes: number) {
      if (this.shopState === 'OPEN') {
        this.timeInMinutes += minutes
        // 8:00 PM = 20 * 60 = 1200
        if (this.timeInMinutes >= 1200) {
          this.timeInMinutes = 1200
          this.shopState = 'CLOSED'
        }
      }
    },
    startNewDay() {
      this.currentDay++
      this.timeInMinutes = 480 // 8:00 AM
      this.shopState = 'OPEN'
      this.showEndDayModal = false
      this.dailyStats = { revenue: 0, customersServed: 0, itemsSold: 0 }
    },
    moveToBinder(cardId: string) {
      if (this.inventory[cardId] > 0) {
        this.inventory[cardId]--
        if (this.inventory[cardId] === 0) delete this.inventory[cardId]
        
        if (!this.binder[cardId]) this.binder[cardId] = 0
        this.binder[cardId]++
      }
    },
    moveToInventory(cardId: string) {
      if (this.binder[cardId] > 0) {
        this.binder[cardId]--
        if (this.binder[cardId] === 0) delete this.binder[cardId]
        
        if (!this.inventory[cardId]) this.inventory[cardId] = 0
        this.inventory[cardId]++
      }
    }
  }
})
