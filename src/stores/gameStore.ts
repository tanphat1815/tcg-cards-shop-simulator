import { defineStore } from 'pinia'
import cardsData from '../assets/data/cards.json'
import { getRequiredExp, XP_REWARDS } from '../config/leveling'
import { STOCK_ITEMS, FURNITURE_ITEMS } from '../config/shopData'
import { WORKERS, SPEED_TO_MS } from '../config/workerData'
import { EXPANSIONS_LOT_A } from '../config/expansionData'

export interface CardData {
  id: string
  name: string
  hp: number
  type: string
  rarity: string
  marketPrice: number
  imageKey: string
}

export type WorkerDuty = 'NONE' | 'CASHIER' | 'STOCKER'

export interface HiredWorker {
  instanceId: string;
  workerId: string;
  duty: WorkerDuty;
}

export interface ShelfTier {
  itemId: string | null;  // Which item fills this tier (null = empty, all slots same type)
  slots: (string | null)[];  // Each slot: itemId or null
  maxSlots: number;          // 32 for packs, 4 for boxes
}

export interface ShelfData {
  id: string;
  furnitureId: string; // ID from FURNITURE_ITEMS
  x: number;
  y: number;
  tiers: ShelfTier[]; // 3 tiers
}

const createEmptyTier = (): ShelfTier => ({ itemId: null, slots: [], maxSlots: 0 })
const createShelf = (id: string, furnitureId: string, x: number, y: number): ShelfData => ({
  id,
  furnitureId,
  x,
  y,
  tiers: [createEmptyTier(), createEmptyTier(), createEmptyTier()]
})

export interface PlayTableData {
  id: string;
  furnitureId: string;
  x: number;
  y: number;
  occupants: (string | null)[]; // instanceIds of NPCs [seat0, seat1]
  matchStartedAt: number | null; // global game time / timestamp
}

const createPlayTable = (id: string, furnitureId: string, x: number, y: number): PlayTableData => ({
  id,
  furnitureId,
  x: x,
  y: y,
  occupants: [null, null],
  matchStartedAt: null
})

export const useGameStore = defineStore('game', {
  state: () => ({
    money: 1000,
    shopInventory: {} as Record<string, number>, // itemId -> quantity
    personalBinder: {} as Record<string, number>, // cardId -> quantity
    placedShelves: {} as Record<string, ShelfData>,
    placedTables: {} as Record<string, PlayTableData>,
    activeShelfId: null as string | null,
    showShelfMenu: false,
    showBinderMenu: false,
    showBuildMenu: false,
    isBuildMode: false,
    buildItemId: null as string | null,
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
    // Staff
    hiredWorkers: [] as HiredWorker[],
    // Leveling
    level: 1,
    currentExp: 0,
    showLevelUpNext: false,
    dailyStats: {
      revenue: 0,
      customersServed: 0,
      itemsSold: 0
    },
    // New Settings
    showSettings: false,
    settings: {
      showExpansionPreview: true,
      expansionPreviewStyle: 'GLOW' as 'BLUEPRINT' | 'GLOW'
    },
    // Missing state properties causing TS errors
    currentDay: 1,
    timeInMinutes: 480, // 8:00 AM
    showEndDayModal: false,
    expansionLevel: 0,
    cashierPosition: { x: 1200, y: 1100 }, // Start at 1200, 1100 relative to world (0,0) - Inside 1000,1000 shop
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
            // Check for legacy array format or missing properties
            const firstShelf = Object.values(parsed.placedShelves)[0] as any
            if (firstShelf && Array.isArray(firstShelf.tiers) && typeof firstShelf.x !== 'undefined') {
               this.placedShelves = parsed.placedShelves
            } else {
               console.warn('Incompatible shelf data detected. Resetting shelves for Build Mode.')
               this.placedShelves = {}
            }
          }
          if (parsed.placedTables) {
             this.placedTables = parsed.placedTables
          }
          if (parsed.settings) {
            this.settings = { ...this.settings, ...parsed.settings }
          }
          if (parsed.cashierPosition) {
            this.cashierPosition = parsed.cashierPosition
            // Migration: if x < 500, it's likely the old (100,100) anchor system
            if (this.cashierPosition.x < 500) {
              this.cashierPosition.x += 900
              this.cashierPosition.y += 900
            }
          }
          
          if (parsed.placedShelves) {
            this.placedShelves = parsed.placedShelves
            Object.values(this.placedShelves).forEach(s => {
              if (s.x < 500) { s.x += 900; s.y += 900; }
            })
          }
          
          if (parsed.placedTables) {
            this.placedTables = parsed.placedTables
            Object.values(this.placedTables).forEach(t => {
              if (t.x < 500) { t.x += 900; t.y += 900; }
            })
          }
          this.timeInMinutes = parsed.timeInMinutes ?? 480
          this.shopState = parsed.shopState ?? 'OPEN'
          this.level = parsed.level ?? 1
          this.currentExp = parsed.currentExp ?? 0
          this.hiredWorkers = parsed.hiredWorkers ?? []
          this.expansionLevel = parsed.expansionLevel ?? 0
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
    // --- Tier-based shelf actions ---
    moveToTierSlot(itemId: string, tierIndex: number) {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      const itemData = this.shopItems[itemId]
      if (!itemData) return
      if (this.shopInventory[itemId] <= 0) return

      const tier = shelf.tiers[tierIndex]
      const isBox = itemData.type === 'box'
      const maxSlots = isBox ? 4 : 32

      // Tier is empty: claim it for this item type
      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      // Tier type mismatch: reject
      if (tier.itemId !== itemId) return
      // Tier is full: reject
      if (tier.slots.length >= tier.maxSlots) return

      tier.slots.push(itemId)
      this.shopInventory[itemId]--
      if (this.shopInventory[itemId] === 0) delete this.shopInventory[itemId]
    },
    fillTier(itemId: string, tierIndex: number) {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      const itemData = this.shopItems[itemId]
      if (!itemData) return

      const tier = shelf.tiers[tierIndex]
      const isBox = itemData.type === 'box'
      const maxSlots = isBox ? 4 : 32

      if (tier.itemId === null) {
        tier.itemId = itemId
        tier.maxSlots = maxSlots
        tier.slots = []
      }
      if (tier.itemId !== itemId) return

      const spaceLeft = tier.maxSlots - tier.slots.length
      const available = this.shopInventory[itemId] ?? 0
      const toAdd = Math.min(spaceLeft, available)

      for (let i = 0; i < toAdd; i++) {
        tier.slots.push(itemId)
      }
      this.shopInventory[itemId] -= toAdd
      if (this.shopInventory[itemId] <= 0) delete this.shopInventory[itemId]
    },
    clearTier(shelfId: string, tierIndex: number) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return
      const tier = shelf.tiers[tierIndex]
      if (!tier.itemId) return

      if (!this.shopInventory[tier.itemId]) this.shopInventory[tier.itemId] = 0
      this.shopInventory[tier.itemId] += tier.slots.length
      tier.itemId = null
      tier.slots = []
      tier.maxSlots = 0
    },
    clearEntireShelf() {
      if (!this.activeShelfId) return
      const shelf = this.placedShelves[this.activeShelfId]
      if (!shelf) return
      shelf.tiers.forEach((_, i) => this.clearTier(shelf.id, i))
    },
    npcTakeItemFromSlot(shelfId: string) {
      const shelf = this.placedShelves[shelfId]
      if (!shelf) return null

      // Find tiers that have items
      const filledTiers = shelf.tiers.map((t, idx) => ({ t, idx })).filter(x => x.t.itemId && x.t.slots.length > 0)
      if (filledTiers.length === 0) return null

      const picked = filledTiers[Math.floor(Math.random() * filledTiers.length)]
      const tier = picked.t
      const itemId = tier.itemId!

      tier.slots.pop()
      if (tier.slots.length === 0) {
        tier.itemId = null
        tier.maxSlots = 0
      }

      this.dailyStats.itemsSold++
      return itemId
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
    // --- Build Mode Actions ---
    startBuildMode(furnitureId: string) {
      this.buildItemId = furnitureId
      this.isBuildMode = true
      this.showBuildMenu = false
    },
    cancelBuildMode() {
      this.isBuildMode = false
      this.buildItemId = null
    },
    placePlayTable(x: number, y: number) {
      if (!this.buildItemId) return
      const id = 'table_' + Date.now()
      const newTable = createPlayTable(id, this.buildItemId, x, y)
      this.placedTables[id] = newTable
      // Note: buildItemId is cleaned up in placeFurniture
    },
    placeFurniture(x: number, y: number) {
      const furnitureId = this.buildItemId
      if (!furnitureId) return
      
      const isTable = furnitureId === 'play_table'
      
      if (isTable) {
        this.placePlayTable(x, y)
      } else {
        const id = 'shelf_' + Date.now()
        this.placedShelves[id] = createShelf(id, furnitureId, x, y)
      }
      
      // Remove from purchased
      if (this.purchasedFurniture[furnitureId] > 0) {
        this.purchasedFurniture[furnitureId]--
        if (this.purchasedFurniture[furnitureId] === 0) {
          delete this.purchasedFurniture[furnitureId]
        }
      }
      
      this.cancelBuildMode()
    },
    // --- Staff Management ---
    hireWorker(workerId: string) {
      const data = WORKERS.find(w => w.id === workerId)
      if (!data) return false
      if (this.money < data.hiringFee) return false
      if (this.level < data.levelUnlocked) return false
      
      this.money -= data.hiringFee
      this.hiredWorkers.push({
        instanceId: `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        workerId: workerId,
        duty: 'NONE'
      })
      return true
    },
    changeWorkerDuty(instanceId: string, duty: WorkerDuty) {
      const worker = this.hiredWorkers.find(w => w.instanceId === instanceId)
      if (!worker) return
      
      // If setting to CASHIER, unassign previous cashier
      if (duty === 'CASHIER') {
        this.hiredWorkers.forEach(w => {
          if (w.duty === 'CASHIER') w.duty = 'NONE'
        })
      }
      
      worker.duty = duty
    },
    terminateWorker(instanceId: string) {
      this.hiredWorkers = this.hiredWorkers.filter(w => w.instanceId !== instanceId)
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
      // Deduct worker salaries
      let totalSalary = 0
      this.hiredWorkers.forEach(hw => {
        const data = WORKERS.find(w => w.id === hw.workerId)
        if (data) totalSalary += data.salary
      })
      
      // Deduct rent
      let totalRent = 50 // Base rent
      for (let i = 0; i < this.expansionLevel; i++) {
        totalRent += EXPANSIONS_LOT_A[i].rentIncrease
      }
      this.money -= totalRent

      this.currentDay++
      this.timeInMinutes = 480 // 8:00 AM
      this.shopState = 'OPEN'
      this.showEndDayModal = false
      this.dailyStats = { revenue: 0, customersServed: 0, itemsSold: 0 }
    },
    buyExpansion() {
      const nextId = this.expansionLevel + 1
      const config = EXPANSIONS_LOT_A.find(e => e.id === nextId)
      if (!config) return false // Max level
      
      if (this.money < config.cost) return false
      if (this.level < config.requiredLevel) return false
      
      this.money -= config.cost
      this.expansionLevel = nextId
      return true
    },
    // --- Play Table Actions ---
    joinTable(tableId: string, instanceId: string): number | null {
      const table = this.placedTables[tableId]
      if (!table) return null
      
      const seatIndex = table.occupants.indexOf(null)
      if (seatIndex !== -1) {
        table.occupants[seatIndex] = instanceId
        return seatIndex
      }
      return null
    },
    startMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table && table.occupants.every(o => o !== null)) {
         table.matchStartedAt = Date.now()
       }
    },
    finishMatch(tableId: string) {
       const table = this.placedTables[tableId]
       if (table) {
         table.matchStartedAt = null
         table.occupants = [null, null]
       }
    }
  }
})
