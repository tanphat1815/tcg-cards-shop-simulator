import { defineStore } from 'pinia'
import cardsData from '../assets/data/cards.json'
import { getRequiredExp, XP_REWARDS } from '../config/leveling'

export interface CardData {
  id: string
  name: string
  hp: number
  type: string
  rarity: string
  marketPrice: number
  imageKey: string
}

export interface ShelfSlot {
  cardId: string | null;
}

export interface ShelfData {
  id: string;
  slots: ShelfSlot[]; // 48 slots
}

export const useGameStore = defineStore('game', {
  state: () => ({
    money: 1000,
    shopInventory: {} as Record<string, number>, // itemId -> quantity
    personalBinder: {} as Record<string, number>, // cardId -> quantity
    placedShelves: {
      shelf1: { id: 'shelf1', slots: Array(48).fill(null).map(() => ({ cardId: null })) } as ShelfData,
      shelf2: { id: 'shelf2', slots: Array(48).fill(null).map(() => ({ cardId: null })) } as ShelfData
    } as Record<string, ShelfData>,
    activeShelfId: null as string | null,
    showShelfMenu: false,
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingCustomers: 0,
    waitingQueue: [] as number[],
    isOpeningPack: false,
    currentPack: [] as CardData[],
    allCards: cardsData as CardData[],
    shopItems: {
      'basic_pack': { id: 'basic_pack', name: 'Booster Pack Thường', buyPrice: 10, sellPrice: 15, isPack: true }
    } as Record<string, { id: string, name: string, buyPrice: number, sellPrice: number, isPack: boolean }>,
    // Leveling
    level: 1,
    currentExp: 0,
    showLevelUpNext: false,
    dailyStats: {
      revenue: 0,
      customersServed: 0,
      itemsSold: 0
    }
  }),
  getters: {
    requiredExp: (state) => getRequiredExp(state.level),
  },
  actions: {
    loadSave() {
      const saved = localStorage.getItem('tcg-shop-save')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          this.money = parsed.money ?? 1000
          this.shopInventory = parsed.shopInventory ?? {}
          this.personalBinder = parsed.personalBinder ?? {}
          if (parsed.placedShelves) {
            this.placedShelves = parsed.placedShelves;
          }
          this.currentDay = parsed.currentDay ?? 1
          this.timeInMinutes = parsed.timeInMinutes ?? 480
          this.shopState = parsed.shopState ?? 'OPEN'
          this.level = parsed.level ?? 1
          this.currentExp = parsed.currentExp ?? 0
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
        this.dailyStats.customersServed++
        this.dailyStats.revenue += price
        
        // XP Reward: 5 XP per Pack (we only have packs for now)
        this.gainExp(XP_REWARDS.SELL_PACK)
      }
    },
    openShelfManagement(shelfId: string) {
      if (!this.placedShelves[shelfId]) return
      this.activeShelfId = shelfId
      this.showShelfMenu = true
    },
    closeShelfManagement() {
      this.activeShelfId = null
      this.showShelfMenu = false
    },
    moveToShelfSlot(itemId: string, slotIndex: number) {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return

      const existingItem = shelf.slots[slotIndex].cardId
      if (existingItem) {
        if (!this.shopInventory[existingItem]) this.shopInventory[existingItem] = 0
        this.shopInventory[existingItem]++
      }

      if (this.shopInventory[itemId] > 0) {
        this.shopInventory[itemId]--
        if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
        shelf.slots[slotIndex].cardId = itemId
      } else {
        shelf.slots[slotIndex].cardId = null
      }
    },
    clearShelfSlot(shelfId: string, slotIndex: number) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return
      
      const itemId = shelf.slots[slotIndex].cardId
      if (itemId) {
        shelf.slots[slotIndex].cardId = null
        if (!this.shopInventory[itemId]) this.shopInventory[itemId] = 0
        this.shopInventory[itemId]++
      }
    },
    autoFillShelf(itemId: string) {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      
      for (let i = 0; i < shelf.slots.length; i++) {
        if (this.shopInventory[itemId] > 0 && shelf.slots[i].cardId === null) {
          this.shopInventory[itemId]--
          if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
          shelf.slots[i].cardId = itemId
        }
      }
    },
    clearEntireShelf() {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      
      for (let i = 0; i < shelf.slots.length; i++) {
        const itemId = shelf.slots[i].cardId
        if (itemId) {
          shelf.slots[i].cardId = null
          if (!this.shopInventory[itemId]) this.shopInventory[itemId] = 0
          this.shopInventory[itemId]++
        }
      }
    },
    npcTakeItemFromSlot(shelfId: string) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return null
      
      const filledSlots = shelf.slots.map((s, idx) => ({ s, idx })).filter(item => item.s.cardId !== null)
      if (filledSlots.length > 0) {
        const randIndex = Math.floor(Math.random() * filledSlots.length)
        const slot = filledSlots[randIndex]
        const itemId = slot.s.cardId
        shelf.slots[slot.idx].cardId = null
        this.dailyStats.itemsSold++
        return itemId
      }
      return null
    },
    buyPackToInventory() {
      const PACK_PRICE = 10
      if (this.money < PACK_PRICE) {
        alert("Không đủ tiền nhập Pack!")
        return
      }
      this.spendMoney(PACK_PRICE)
      if (!this.shopInventory['basic_pack']) this.shopInventory['basic_pack'] = 0
      this.shopInventory['basic_pack']++
    },
    tearPack(packId: string) {
      if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return
      
      // Consume 1 pack
      this.shopInventory[packId]--
      if (this.shopInventory[packId] === 0) delete this.shopInventory[packId]

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
        
        // Add single cards directly to personal binder
        if (!this.personalBinder[randomCard.id]) {
          this.personalBinder[randomCard.id] = 0
        }
        this.personalBinder[randomCard.id]++

        // XP Reward from opening
        if (randomCard.rarity === 'Rare') this.gainExp(XP_REWARDS.OPEN_PACK_RARE)
        else if (randomCard.rarity === 'Uncommon') this.gainExp(XP_REWARDS.OPEN_PACK_UNCOMMON)
        else this.gainExp(XP_REWARDS.OPEN_PACK_COMMON)
      }
      this.currentPack = pulledCards
      this.isOpeningPack = true
    },
    gainExp(amount: number) {
      this.currentExp += amount
      const req = getRequiredExp(this.level)
      if (this.currentExp >= req) {
        this.level++
        this.currentExp = this.currentExp - req
        this.showLevelUpNext = true
        // If still over, recurse
        this.gainExp(0)
      }
    },
    closePackOpening() {
      this.isOpeningPack = false
      this.currentPack = []
    },
    tickTime(minutes: number) {
      if (this.shopState === 'OPEN') {
        this.timeInMinutes += minutes
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
    }
  }
})
