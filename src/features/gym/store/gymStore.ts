import { defineStore } from 'pinia'
import type { GymLeader, TownAreaState } from '../types'
import { useStatsStore } from '../../stats/store/statsStore'
import { useApiStore } from '../../inventory/store/apiStore'

// ── Dữ liệu cứng cho 5 Gym Leaders ──────────────────────────────
const GYM_LEADER_TEMPLATES: Omit<GymLeader,
  'isDefeated' | 'townX' | 'townY' | 'generatedDeck'
>[] = [
  { id: 'gym_fire',      name: 'Blaze Master',   type: 'Fire',      difficultyLevel: 5,  badgeName: 'Ember Badge',   rewardMoney: 500,  rewardExp: 200 },
  { id: 'gym_water',     name: 'Tide Keeper',    type: 'Water',     difficultyLevel: 10, badgeName: 'Surf Badge',    rewardMoney: 800,  rewardExp: 350 },
  { id: 'gym_grass',     name: 'Grove Warden',   type: 'Grass',     difficultyLevel: 15, badgeName: 'Leaf Badge',    rewardMoney: 1200, rewardExp: 500 },
  { id: 'gym_lightning', name: 'Storm Caller',   type: 'Lightning', difficultyLevel: 25, badgeName: 'Bolt Badge',    rewardMoney: 2000, rewardExp: 800 },
  { id: 'gym_psychic',   name: 'Mind Oracle',    type: 'Psychic',   difficultyLevel: 40, badgeName: 'Vision Badge',  rewardMoney: 4000, rewardExp: 1500 },
]

// ── Tọa độ spawn cố định trong Town (World Coordinates) ─────────
// Town bắt đầu từ (3000, 0) để không đụng Shop space (0-3000 x 0-3000)
const GYM_SPAWN_POSITIONS = [
  { x: 3200, y: 300 },
  { x: 3500, y: 300 },
  { x: 3800, y: 300 },
  { x: 3350, y: 600 },
  { x: 3650, y: 600 },
]

export const useGymStore = defineStore('gym', {
  state: (): TownAreaState => ({
    isPlayerInTown: false,
    activeGymId: null,
    gymLeaders: [],
  }),

  getters: {
    activeGym: (state): GymLeader | null => {
      if (!state.activeGymId) return null
      return state.gymLeaders.find(g => g.id === state.activeGymId) ?? null
    },
    defeatedCount: (state): number =>
      state.gymLeaders.filter(g => g.isDefeated).length,
  },

  actions: {
    /**
     * Khởi tạo tất cả Gym Leaders. Gọi 1 lần khi game load.
     * Chỉ generate lại nếu chưa có dữ liệu (tránh overwrite save).
     */
    initializeGymLeaders() {
      if (this.gymLeaders.length > 0) return // Đã load từ save

      this.gymLeaders = GYM_LEADER_TEMPLATES.map((template, i) => ({
        ...template,
        isDefeated: false,
        townX: GYM_SPAWN_POSITIONS[i].x,
        townY: GYM_SPAWN_POSITIONS[i].y,
        generatedDeck: [],
      }))
    },

    /** Bật overlay khi Player đứng gần Gym */
    enterGym(gymId: string) {
      this.activeGymId = gymId
    },

    /** Tắt overlay */
    exitGym() {
      this.activeGymId = null
    },

    /** Đánh dấu đã thắng Gym Leader, thưởng tiền và XP */
    defeatGymLeader(gymId: string) {
      const gym = this.gymLeaders.find(g => g.id === gymId)
      if (!gym || gym.isDefeated) return

      gym.isDefeated = true
      const statsStore = useStatsStore()
      statsStore.addMoney(gym.rewardMoney)
      statsStore.gainExp(gym.rewardExp)
    },

    /** Toggle Player ở Town hay Shop */
    setPlayerInTown(value: boolean) {
      this.isPlayerInTown = value
    },

    /**
     * CORE: Sinh deck 5 thẻ cho một Gym Leader theo hệ và giới hạn level.
     * Xem chi tiết thuật toán ở Mục 3.
     */
    async generateDeckForGym(gymId: string): Promise<any[]> {
      const gym = this.gymLeaders.find(g => g.id === gymId)
      if (!gym) return []
      if (gym.generatedDeck.length === 5) return gym.generatedDeck // Cache

      const deck = await buildGymLeaderDeck(gym)
      gym.generatedDeck = deck
      return deck
    },

    /** Serialization cho save/load */
    loadGymState(parsed: any) {
      if (parsed?.gymLeaders?.length) {
        this.gymLeaders = parsed.gymLeaders
      }
    },
  },
})

// ════════════════════════════════════════════════════════════════
// CORE ALGORITHM: Sinh Deck Gym Leader (Xem chi tiết ở Mục 3)
// ════════════════════════════════════════════════════════════════
async function buildGymLeaderDeck(gym: GymLeader): Promise<any[]> {
  const apiStore = useApiStore()
  const statsStore = useStatsStore()
  const playerLevel = statsStore.level
  const MAX_LEVEL_OFFSET = 5 // Deck chỉ lấy từ pack có level <= playerLevel + 5

  // Bước A: Thu thập pool thẻ hợp lệ
  const validCards: any[] = []
  const colorlessCards: any[] = []

  for (const [_itemId, item] of Object.entries(apiStore.shopItems as Record<string, any>)) {
    if (item.type !== 'pack') continue
    // RULE: Giới hạn level
    if (item.requiredLevel > playerLevel + MAX_LEVEL_OFFSET) continue

    const setId = item.sourceSetId
    if (!setId) continue

    // Đảm bảo cards đã được load vào cache
    let setCards = apiStore.setCardsCache[setId]
    if (!setCards || setCards.length === 0) {
      setCards = await apiStore.loadSetCards(setId)
    }
    if (!setCards) continue

    for (const card of setCards) {
      // Chỉ lấy Pokémon có HP và đòn đánh
      if (!card.hp || !card.attacks?.length) continue

      const cardTypes: string[] = Array.isArray(card.types) ? card.types : []

      if (cardTypes.includes(gym.type)) {
        validCards.push(card)
      } else if (cardTypes.includes('Colorless') || cardTypes.length === 0) {
        colorlessCards.push(card)
      }
    }
  }

  // Bước B: Xáo trộn và lấy 5 thẻ
  const shuffle = <T>(arr: T[]): T[] =>
    arr.sort(() => Math.random() - 0.5)

  const shuffledMain = shuffle(validCards)
  const shuffledFallback = shuffle(colorlessCards)

  const deck: any[] = []

  // Ưu tiên lấy thẻ đúng hệ
  for (const card of shuffledMain) {
    if (deck.length >= 5) break
    deck.push(card)
  }

  // Nếu thiếu, fill bằng Colorless
  for (const card of shuffledFallback) {
    if (deck.length >= 5) break
    deck.push(card)
  }

  // Fallback cuối cùng: lấy bất kỳ thẻ nào từ cache nếu vẫn thiếu
  if (deck.length < 5) {
    const allCards = Object.values(apiStore.setCardsCache).flat()
    const filtered = shuffle(
      allCards.filter((c: any) => c.hp && c.attacks?.length && !deck.includes(c))
    )
    for (const card of filtered) {
      if (deck.length >= 5) break
      deck.push(card)
    }
  }

  return deck.slice(0, 5)
}
