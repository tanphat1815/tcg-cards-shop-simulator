import { defineStore } from 'pinia'
import cardsData from '../assets/data/cards.json'
import { getRequiredExp, XP_REWARDS } from '../config/leveling'
import { STOCK_ITEMS, FURNITURE_ITEMS } from '../config/shopData'

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
  itemId: string | null;
  quantity: number;
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
      shelf1: { id: 'shelf1', slots: Array(48).fill(null).map(() => ({ itemId: null, quantity: 0 })) } as ShelfData,
      shelf2: { id: 'shelf2', slots: Array(48).fill(null).map(() => ({ itemId: null, quantity: 0 })) } as ShelfData
    } as Record<string, ShelfData>,
    activeShelfId: null as string | null,
    showShelfMenu: false,
    shopState: 'CLOSED' as 'OPEN' | 'CLOSED',
    waitingCustomers: 0,
    waitingQueue: [] as number[],
    isOpeningPack: false,
    currentPack: [] as CardData[],
    allCards: cardsData as CardData[],
    shopItems: STOCK_ITEMS,
    // Online Shop
    showOnlineShop: false,
    purchasedFurniture: {} as Record<string, number>,
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
          this.purchasedFurniture = parsed.purchasedFurniture ?? {}
          if (parsed.placedShelves) {
            // Check backward compatibility
            const sampleSlot = parsed.placedShelves['shelf1']?.slots[0]
            if (sampleSlot && typeof sampleSlot.cardId !== 'undefined') {
              console.warn("Detected old save format for shelves. Wiping shelves to apply new Data Model.")
            } else {
              this.placedShelves = parsed.placedShelves;
            }
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
        
        // XP Reward: 5 XP (Assume standard Pack/Box reward or derive from price)
        this.gainExp(5)
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

      const slot = shelf.slots[slotIndex]
      const itemData = this.shopItems[itemId]
      if (!itemData) return
      const maxQty = Math.floor(32 / itemData.volume)

      // Xử lý ném hàng cũ vào kho nếu khác loại
      if (slot.itemId && slot.itemId !== itemId) {
        if (!this.shopInventory[slot.itemId]) this.shopInventory[slot.itemId] = 0
        this.shopInventory[slot.itemId] += slot.quantity
        slot.itemId = null
        slot.quantity = 0
      }

      if (this.shopInventory[itemId] > 0) {
        if (slot.itemId === null) {
          slot.itemId = itemId
          slot.quantity = 1
          this.shopInventory[itemId]--
          if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
        } else if (slot.itemId === itemId && slot.quantity < maxQty) {
          slot.quantity++
          this.shopInventory[itemId]--
          if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
        }
      }
    },
    clearShelfSlot(shelfId: string, slotIndex: number) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return
      
      const slot = shelf.slots[slotIndex]
      if (slot.itemId) {
        if (!this.shopInventory[slot.itemId]) this.shopInventory[slot.itemId] = 0
        this.shopInventory[slot.itemId] += slot.quantity
        slot.itemId = null
        slot.quantity = 0
      }
    },
    autoFillShelf(itemId: string, startSlotIndex: number = 0) {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      
      const itemData = this.shopItems[itemId]
      if (!itemData) return
      const maxQty = Math.floor(32 / itemData.volume)
      
      for (let i = startSlotIndex; i < shelf.slots.length; i++) {
        if (this.shopInventory[itemId] && this.shopInventory[itemId] > 0) {
          const slot = shelf.slots[i]
          
          if (slot.itemId === null) {
            slot.itemId = itemId
            slot.quantity = 0
          }
          
          if (slot.itemId === itemId) {
            const spaceLeft = maxQty - slot.quantity
            if (spaceLeft > 0) {
              const amountToAdd = Math.min(spaceLeft, this.shopInventory[itemId])
              slot.quantity += amountToAdd
              this.shopInventory[itemId] -= amountToAdd
              if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
            }
          }
        } else {
          break;
        }
      }
    },
    clearEntireShelf() {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      
      for (let i = 0; i < shelf.slots.length; i++) {
        this.clearShelfSlot(shelf.id, i)
      }
    },
    npcTakeItemFromSlot(shelfId: string) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return null
      
      const filledSlots = shelf.slots.map((s, idx) => ({ s, idx })).filter(item => item.s.itemId !== null && item.s.quantity > 0)
      if (filledSlots.length > 0) {
        const randIndex = Math.floor(Math.random() * filledSlots.length)
        const slot = filledSlots[randIndex]
        const itemId = slot.s.itemId!
        
        shelf.slots[slot.idx].quantity--
        if (shelf.slots[slot.idx].quantity <= 0) {
          shelf.slots[slot.idx].itemId = null
        }
        
        this.dailyStats.itemsSold++
        return itemId
      }
      return null
    },
    buyStock(itemId: string, amount: number = 1) {
      const itemData = STOCK_ITEMS[itemId]
      if (!itemData) return false
      
      const totalCost = itemData.buyPrice * amount
      if (this.money < totalCost) return false
      if (this.level < itemData.requiredLevel) return false
      
      this.spendMoney(totalCost)
      if (!this.shopInventory[itemId]) this.shopInventory[itemId] = 0
      this.shopInventory[itemId] += amount
      return true
    },
    buyFurniture(furnitureId: string) {
      const furnitureData = FURNITURE_ITEMS[furnitureId]
      if (!furnitureData) return false
      
      if (this.money < furnitureData.buyPrice) return false
      if (this.level < furnitureData.requiredLevel) return false
      
      this.spendMoney(furnitureData.buyPrice)
      if (!this.purchasedFurniture[furnitureId]) this.purchasedFurniture[furnitureId] = 0
      this.purchasedFurniture[furnitureId]++
      return true
    },
    unboxItem(boxId: string) {
      const box = this.shopItems[boxId]
      if (!box || box.type !== 'box' || !box.contains) return
      
      if (this.shopInventory[boxId] > 0) {
         this.shopInventory[boxId]--
         if (this.shopInventory[boxId] === 0) delete this.shopInventory[boxId]
         
         const innerId = box.contains.itemId
         const innerAmount = box.contains.amount
         
         if (!this.shopInventory[innerId]) this.shopInventory[innerId] = 0
         this.shopInventory[innerId] += innerAmount
      }
    },
    tearPack(packId: string) {
      if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return
      
      let weights = { Common: 65, Uncommon: 30, Rare: 5 } // pack_basic
      if (packId === 'pack_rare') {
        weights = { Common: 15, Uncommon: 70, Rare: 15 } // Adjusted based on request
      } else if (packId === 'silver_pack') {
        weights = { Common: 40, Uncommon: 45, Rare: 15 }
      } else if (packId === 'golden_pack') {
        weights = { Common: 10, Uncommon: 40, Rare: 50 }
      }

      this.shopInventory[packId]--
      if (this.shopInventory[packId] === 0) delete this.shopInventory[packId]

      const pulledCards: CardData[] = []
      for (let i = 0; i < 8; i++) { // Generate 8 cards
        const rand = Math.random() * 100
        let targetRarity = 'Common'
        if (rand <= weights.Rare) {
           targetRarity = 'Rare'
        } else if (rand <= weights.Rare + weights.Uncommon) {
           targetRarity = 'Uncommon'
        }
        
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
        // Recurse in case of massive XP
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
