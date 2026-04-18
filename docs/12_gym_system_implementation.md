# Module 12: Gym System Implementation Blueprint
# Hệ thống Bản đồ Overworld & Thách đấu Gym Leader

> **Dành cho:** Junior AI Coder — Blind Execution  
> **Tech Stack:** Vue 3 · Pinia · Phaser 3 · TypeScript · TailwindCSS  
> **Kiến trúc:** Feature-Based, Giao tiếp 1 chiều (Vue Action → Pinia → Phaser Listen)  
> **Ngày soạn:** 2026-04-18  

---

## 1. SƠ ĐỒ CẤU TRÚC FILE

### 1.1 Files Tạo Mới

```
src/features/gym/
├── types/
│   └── index.ts                    # GymLeader, GymBuilding, TownArea interfaces
├── store/
│   └── gymStore.ts                 # Pinia store — state gym, deck generation logic
├── components/
│   └── GymOverlay.vue              # Vue popup khi Player chạm Gym
└── managers/
    └── TownManager.ts              # Phaser Manager — vẽ Town, spawn buildings

src/assets/images/
└── gym_building.svg                # Asset cơ bản tòa nhà Gym (tạo mới bằng SVG thuần)
```

### 1.2 Files Cần Chỉnh Sửa

| File | Loại thay đổi | Nội dung thay đổi |
|---|---|---|
| `src/game/MainScene.ts` | Thêm import + gọi manager | Khởi tạo `TownManager`, xử lý scene transition Shop ↔ Town |
| `src/App.vue` | Thêm component | Import và mount `GymOverlay` |
| `src/features/shop-ui/store/gameStore.ts` | Thêm getter/action | Expose `gymStore` façade cho Phaser và Vue |
| `src/features/battle/store/battleStore.ts` | Thêm action overload | `openBattle(gymLeaderId?: string)` để load deck Gym Leader |

---

## 2. STEP-BY-STEP IMPLEMENTATION

---

### Bước 1: Tạo Types (`src/features/gym/types/index.ts`)

**Mục đích:** Định nghĩa hợp đồng dữ liệu cho toàn bộ module Gym.  
**Input:** Không có.  
**Output:** Các interface được export, dùng bởi `gymStore.ts`, `TownManager.ts`, `GymOverlay.vue`.

```typescript
// src/features/gym/types/index.ts

/** Các hệ năng lượng có thể xuất hiện ở Gym */
export type GymType =
  | 'Fire' | 'Water' | 'Grass' | 'Lightning'
  | 'Psychic' | 'Fighting' | 'Darkness' | 'Metal'

/** Thông tin đầy đủ một Gym Leader */
export interface GymLeader {
  id: string                   // Unique ID vd: 'gym_fire_01'
  name: string                 // Tên hiển thị vd: 'Blaze Master'
  type: GymType                // Hệ chuyên dùng
  difficultyLevel: number      // Level tối thiểu để thách đấu (1-80)
  badgeName: string            // Tên huy hiệu khi thắng vd: 'Ember Badge'
  rewardMoney: number          // Tiền thưởng khi thắng
  rewardExp: number            // XP thưởng khi thắng
  isDefeated: boolean          // Đã bị đánh bại chưa
  townX: number                // Tọa độ X trong Town scene (world coords)
  townY: number                // Tọa độ Y trong Town scene (world coords)
  generatedDeck: any[]         // Deck 5 thẻ đã được generate (raw card data)
}

/** Trạng thái khu vực Town */
export interface TownAreaState {
  isPlayerInTown: boolean           // Player đang ở Town hay Shop
  activeGymId: string | null        // Gym đang hiển thị overlay (null = không có)
  gymLeaders: GymLeader[]           // Danh sách toàn bộ Gym Leaders
}
```

---

### Bước 2: Tạo SVG Asset Tòa Nhà Gym (`src/assets/images/gym_building.svg`)

**Mục đích:** Cung cấp sprite đơn giản để Phaser render Gym building.  
**Lưu ý:** File SVG đơn giản, không dùng external fonts.

```xml
<!-- src/assets/images/gym_building.svg -->
<svg width="64" height="80" xmlns="http://www.w3.org/2000/svg">
  <!-- Thân tòa nhà -->
  <rect x="4" y="24" width="56" height="52" fill="#4a5568" rx="2"/>
  <!-- Mái nhà tam giác -->
  <polygon points="0,24 32,4 64,24" fill="#2d3748"/>
  <!-- Cửa chính -->
  <rect x="22" y="52" width="20" height="24" fill="#2c5282" rx="2"/>
  <!-- Cửa sổ trái -->
  <rect x="8" y="36" width="14" height="12" fill="#bee3f8" rx="1"/>
  <!-- Cửa sổ phải -->
  <rect x="42" y="36" width="14" height="12" fill="#bee3f8" rx="1"/>
  <!-- Ký hiệu "G" trên mái -->
  <text x="32" y="18" text-anchor="middle" fill="#f6e05e" font-size="12" font-weight="bold" font-family="monospace">G</text>
</svg>
```

---

### Bước 3: Tạo Pinia Store (`src/features/gym/store/gymStore.ts`)

**Mục đích:** Quản lý toàn bộ state Gym System. Chứa logic sinh Deck Gym Leader.  
**Input:** `apiStore.shopItems`, `apiStore.setCardsCache`, `useStatsStore().level`  
**Output:** `gymLeaders[]` với `generatedDeck[]` đã được fill.

```typescript
// src/features/gym/store/gymStore.ts
import { defineStore } from 'pinia'
import type { GymLeader, GymType, TownAreaState } from '../types'
import { useStatsStore } from '../../stats/store/statsStore'
import { useApiStore } from '../../inventory/store/apiStore'
import { EnvironmentManager } from '../../environment/managers/EnvironmentManager'

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

  for (const [itemId, item] of Object.entries(apiStore.shopItems as Record<string, any>)) {
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
```

---

### Bước 4: Tạo Town Manager (`src/features/gym/managers/TownManager.ts`)

**Mục đích:** Phaser Manager vẽ khu vực Town, spawn Gym building sprites, phát hiện va chạm Player–Gym.  
**Input:** Phaser Scene, `gymStore` (đọc state, KHÔNG ghi từ Phaser).  
**Output:** Tín hiệu state change qua `gymStore.enterGym()` / `gymStore.exitGym()`.

```typescript
// src/features/gym/managers/TownManager.ts
import Phaser from 'phaser'
import { useGymStore } from '../store/gymStore'
import { DEPTH } from '../../environment/config'

interface GymBuilding {
  gymId: string
  sprite: Phaser.Physics.Arcade.Sprite
  label: Phaser.GameObjects.Text
  detectionZone: Phaser.GameObjects.Zone
}

export class TownManager {
  private scene: Phaser.Scene
  private townGraphics!: Phaser.GameObjects.Graphics
  private gymBuildings: GymBuilding[] = []
  private lastNearGymId: string | null = null

  // Town bắt đầu từ x=3000 để không đè Shop
  static readonly TOWN_START_X = 3000
  static readonly TOWN_START_Y = 0
  static readonly TOWN_WIDTH = 2000
  static readonly TOWN_HEIGHT = 1500

  public gymGroup!: Phaser.Physics.Arcade.StaticGroup

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.gymGroup = scene.physics.add.staticGroup()
  }

  /** Vẽ nền Town và đặt các Gym buildings */
  initializeTown() {
    this.drawTownBackground()
    this.spawnGymBuildings()
  }

  private drawTownBackground() {
    const { TOWN_START_X, TOWN_START_Y, TOWN_WIDTH, TOWN_HEIGHT } = TownManager
    const g = this.scene.add.graphics().setDepth(DEPTH.FLOOR)
    this.townGraphics = g

    // Nền cỏ xanh đậm
    g.fillStyle(0x2d6a2d)
    g.fillRect(TOWN_START_X, TOWN_START_Y, TOWN_WIDTH, TOWN_HEIGHT)

    // Đường nhựa ngang
    g.fillStyle(0x718096)
    g.fillRect(TOWN_START_X, TOWN_START_Y + 450, TOWN_WIDTH, 80)
    g.fillRect(TOWN_START_X, TOWN_START_Y + 750, TOWN_WIDTH, 80)

    // Đường nhựa dọc
    g.fillRect(TOWN_START_X + 300, TOWN_START_Y, 80, TOWN_HEIGHT)
    g.fillRect(TOWN_START_X + 700, TOWN_START_Y, 80, TOWN_HEIGHT)
    g.fillRect(TOWN_START_X + 1100, TOWN_START_Y, 80, TOWN_HEIGHT)

    // Biển báo khu vực
    this.scene.add.text(
      TOWN_START_X + TOWN_WIDTH / 2,
      TOWN_START_Y + 30,
      '🏙️ GYM TOWN',
      { fontSize: '28px', color: '#f6e05e', fontStyle: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 16, y: 8 } }
    ).setOrigin(0.5).setDepth(DEPTH.UI_TEXT)
  }

  private spawnGymBuildings() {
    const gymStore = useGymStore()

    for (const leader of gymStore.gymLeaders) {
      const sprite = this.gymGroup.create(leader.townX, leader.townY, 'gym_building') as Phaser.Physics.Arcade.Sprite
      sprite.setDepth(DEPTH.FURNITURE)
      sprite.setData('gymId', leader.id)

      // Màu tint theo hệ
      sprite.setTint(this.getTypeColor(leader.type))

      // Label tên Gym Leader
      const label = this.scene.add.text(
        leader.townX,
        leader.townY - 55,
        `${leader.name}\n[${leader.type}] Lv.${leader.difficultyLevel}`,
        {
          fontSize: '11px',
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 6, y: 3 },
          align: 'center',
        }
      ).setOrigin(0.5).setDepth(DEPTH.UI_TEXT)

      if (leader.isDefeated) {
        sprite.setAlpha(0.5)
        label.setText(label.text + '\n✅ DEFEATED')
      }

      // Detection zone: 80px radius xung quanh building
      const zone = this.scene.add.zone(leader.townX, leader.townY, 80, 80)
      this.scene.physics.add.existing(zone, true)

      this.gymBuildings.push({ gymId: leader.id, sprite, label, detectionZone: zone })
    }
  }

  /**
   * Gọi mỗi frame từ update() trong MainScene.
   * Phát hiện player đứng gần Gym nào → cập nhật gymStore.
   * ⚠️ KHÔNG dùng Vue reactivity ở đây. Chỉ gọi store actions.
   */
  update(playerX: number, playerY: number) {
    const gymStore = useGymStore()
    let nearestGymId: string | null = null

    for (const building of this.gymBuildings) {
      const dist = Phaser.Math.Distance.Between(
        playerX, playerY,
        building.sprite.x, building.sprite.y
      )
      if (dist < 80) {
        nearestGymId = building.gymId
        break
      }
    }

    // Chỉ gọi store action khi thực sự thay đổi (tránh gọi mỗi frame)
    if (nearestGymId !== this.lastNearGymId) {
      this.lastNearGymId = nearestGymId
      if (nearestGymId) {
        gymStore.enterGym(nearestGymId)
      } else {
        gymStore.exitGym()
      }
    }
  }

  /** Làm tươi lại sprite (gọi sau khi defeat Gym) */
  refreshBuildingState() {
    const gymStore = useGymStore()
    for (const building of this.gymBuildings) {
      const leader = gymStore.gymLeaders.find(g => g.id === building.gymId)
      if (leader?.isDefeated) {
        building.sprite.setAlpha(0.5)
      }
    }
  }

  private getTypeColor(type: string): number {
    const colors: Record<string, number> = {
      Fire: 0xff6b35,
      Water: 0x4299e1,
      Grass: 0x48bb78,
      Lightning: 0xecc94b,
      Psychic: 0xed64a6,
      Fighting: 0xed8936,
      Darkness: 0x553c9a,
      Metal: 0xa0aec0,
    }
    return colors[type] ?? 0xffffff
  }

  destroy() {
    this.townGraphics?.destroy()
    this.gymBuildings.forEach(b => {
      b.label.destroy()
      b.detectionZone.destroy()
    })
    this.gymBuildings = []
  }
}
```

---

### Bước 5: Tạo GymOverlay Component (`src/features/gym/components/GymOverlay.vue`)

**Mục đích:** Hiển thị thông tin Gym và nút "Thách đấu" khi Player đứng gần.  
**Input:** `gymStore.activeGym` (computed từ store).  
**Output:** Gọi `gymStore.generateDeckForGym()` → `battleStore.openBattleWithDeck()`.

```vue
<!-- src/features/gym/components/GymOverlay.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGymStore } from '../store/gymStore'
import { useBattleStore } from '../../battle/store/battleStore'
import EnhancedButton from '../../shared/components/EnhancedButton.vue'

const gymStore = useGymStore()
const battleStore = useBattleStore()
const isGenerating = ref(false)

const gym = computed(() => gymStore.activeGym)
const isVisible = computed(() => !!gym.value && !battleStore.isOpen)

const typeEmoji: Record<string, string> = {
  Fire: '🔥', Water: '💧', Grass: '🌿', Lightning: '⚡',
  Psychic: '🔮', Fighting: '👊', Darkness: '🌑', Metal: '⚙️',
}

async function handleChallenge() {
  if (!gym.value || gym.value.isDefeated) return
  isGenerating.value = true

  try {
    const deck = await gymStore.generateDeckForGym(gym.value.id)
    // Mở battle với deck được sinh sẵn (openBattleWithDeck là action mới thêm vào battleStore)
    battleStore.openBattleWithDeck(deck, gym.value.id)
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <Transition name="gym-slide">
    <div v-if="isVisible" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] pointer-events-auto">
      <div class="bg-gray-900/95 backdrop-blur border-2 border-indigo-500/60 rounded-2xl p-6 shadow-2xl min-w-[320px] max-w-md">
        <div class="flex items-start gap-4 mb-4">
          <div class="text-4xl">{{ typeEmoji[gym!.type] ?? '🏟️' }}</div>
          <div class="flex-grow">
            <h2 class="text-xl font-black text-white">{{ gym!.name }}</h2>
            <p class="text-sm text-indigo-300 font-bold">{{ gym!.type }} Type Gym</p>
            <p class="text-xs text-gray-400">Yêu cầu: Level {{ gym!.difficultyLevel }}</p>
          </div>
          <div v-if="gym!.isDefeated" class="bg-green-500/20 border border-green-500/40 text-green-400 px-3 py-1 rounded-full text-xs font-black">
            ✅ DEFEATED
          </div>
        </div>

        <div class="text-xs text-gray-400 mb-4 border-t border-gray-700/50 pt-3">
          🏅 Phần thưởng: <span class="text-yellow-400 font-bold">${{ gym!.rewardMoney }}</span>
          &nbsp;·&nbsp; <span class="text-blue-400 font-bold">+{{ gym!.rewardExp }} XP</span>
        </div>

        <div class="flex gap-3">
          <EnhancedButton
            variant="secondary"
            size="md"
            @click="gymStore.exitGym()"
          >
            Bỏ qua
          </EnhancedButton>
          <EnhancedButton
            variant="danger"
            size="md"
            fullWidth
            :loading="isGenerating"
            :disabled="gym!.isDefeated"
            @click="handleChallenge"
          >
            {{ gym!.isDefeated ? '✅ Đã Đánh Bại' : '⚔️ Thách Đấu!' }}
          </EnhancedButton>
        </div>

        <p class="text-[10px] text-gray-600 mt-3 text-center">
          Nhấn [E] hoặc di chuyển ra xa để đóng
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.gym-slide-enter-active, .gym-slide-leave-active { transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1); }
.gym-slide-enter-from, .gym-slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
```

---

### Bước 6: Chỉnh sửa `battleStore.ts` — Thêm action `openBattleWithDeck`

**Mục đích:** Cho phép Battle bắt đầu với deck được cung cấp sẵn (thay vì user chọn từ binder).  
**Vị trí thêm:** Trong phần `actions` của `battleStore.ts`, sau action `openSetup()`.

```typescript
// THÊM vào actions của battleStore.ts

/**
 * Mở Battle Arena với deck do Gym Leader cung cấp sẵn.
 * Bỏ qua màn hình SETUP, vào thẳng BATTLE.
 * @param enemyDeck Deck 5 thẻ đã được gymStore generate
 * @param gymId ID của Gym Leader (để mark defeated sau khi thắng)
 */
openBattleWithDeck(enemyDeck: any[], gymId: string) {
  // Validation: cần player có ít nhất 1 thẻ trong binder
  const { useInventoryStore } = await import('../../inventory/store/inventoryStore')
  const { useApiStore } = await import('../../inventory/store/apiStore')
  const inventoryStore = useInventoryStore()
  const apiStore = useApiStore()

  // Lấy deck player từ binder (lấy tối đa 5 thẻ đầu tiên)
  const binderCardIds = Object.keys(inventoryStore.personalBinder).slice(0, 5)
  if (binderCardIds.length === 0) {
    this.addLog('⚠️ Bạn chưa có thẻ bài trong Binder! Hãy mở Pack trước.', 'system')
    return
  }

  const playerCards: any[] = []
  for (const cardId of binderCardIds) {
    for (const setCards of Object.values(apiStore.setCardsCache)) {
      const found = (setCards as any[]).find((c: any) => c.id === cardId)
      if (found) { playerCards.push(found); break }
    }
  }

  this.isOpen = true
  this.currentGymId = gymId  // Lưu lại để mark defeated khi thắng
  this.mode = 'BASIC'
  this.phase = 'BATTLE'
  this.currentTurn = 'player'
  this.turnNumber = 1
  this.hasAttachedEnergyThisTurn = false
  this.selectedAttackIndex = null
  this.isEnemyThinking = false
  this.logs = []
  this.winner = null

  // Khởi tạo đội player từ binder
  this.playerTeam = [
    ...playerCards.map((card, i) => BattleLogic.createBattleCard(card, i)),
    ...Array(Math.max(0, 5 - playerCards.length)).fill(null),
  ]

  // Khởi tạo đội Gym Leader từ deck được generate
  const validEnemyDeck = enemyDeck.filter(Boolean).slice(0, 5)
  this.enemyTeam = [
    ...validEnemyDeck.map((card, i) => BattleLogic.createBattleCard(card, i)),
    ...Array(Math.max(0, 5 - validEnemyDeck.length)).fill(null),
  ]

  this.addLog('🏟️ Trận đấu Gym bắt đầu!', 'system')
  this.addLog(`Pokémon của bạn: ${this.playerTeam[0]?.name} lên tiền tuyến!`, 'info')
  this.addLog(`Gym Leader: ${this.enemyTeam[0]?.name} lên tiền tuyến!`, 'info')

  useGameStore().pauseGame()
},
```

**QUAN TRỌNG:** Thêm `currentGymId: null as string | null` vào `state()` của battleStore.  
**QUAN TRỌNG:** Trong action `checkAndSetWinner()`, khi `winner === 'player'` và `this.currentGymId`, gọi:
```typescript
const { useGymStore } = await import('../../gym/store/gymStore')
useGymStore().defeatGymLeader(this.currentGymId)
this.currentGymId = null
```

---

### Bước 7: Chỉnh sửa `MainScene.ts`

**Mục đích:** Integrate TownManager, xử lý Player di chuyển ra Town, preload asset Gym.  
**Thay đổi cụ thể:**

**7a. Trong `preload()`** — Thêm sau dòng load cashier:
```typescript
// THÊM vào preload()
import gymBuildingImg from '../assets/images/gym_building.svg'
this.load.image('gym_building', gymBuildingImg)
```

**7b. Import TownManager** — Thêm vào đầu file:
```typescript
import { TownManager } from '../features/gym/managers/TownManager'
import { useGymStore } from '../features/gym/store/gymStore'
```

**7c. Khai báo property** — Thêm sau `staffManager`:
```typescript
public townManager!: TownManager
```

**7d. Trong `create()`** — Thêm sau `this.staffManager = new StaffManager(this)`:
```typescript
// Initialize Town
this.townManager = new TownManager(this)
this.townManager.initializeTown()

// Initialize Gym Leaders (chỉ lần đầu)
const gymStore = useGymStore()
gymStore.initializeGymLeaders()

// Mở rộng World Bounds để bao gồm Town
this.physics.world.setBounds(0, 0, 5500, 3000)
this.cameras.main.setBounds(0, 0, 5500, 3000)
```

**7e. Trong `update()`** — Thêm vào cuối hàm, sau `this.updateEditOverlay`:
```typescript
// Update Town Manager (detect Gym proximity)
if (this.townManager) {
  this.townManager.update(this.player.x, this.player.y)
}
```

**7f. Thêm transition vùng Town/Shop** — Thêm private method:
```typescript
private handleAreaTransition() {
  const gymStore = useGymStore()
  const isInTownX = this.player.x > TownManager.TOWN_START_X - 100

  if (isInTownX !== gymStore.isPlayerInTown) {
    gymStore.setPlayerInTown(isInTownX)
  }
}
```
Gọi `this.handleAreaTransition()` ở cuối `update()`.

---

### Bước 8: Chỉnh sửa `App.vue` — Thêm GymOverlay

**Mục đích:** Mount GymOverlay vào UI layer.  
**Vị trí:** Thêm import và component tag.

```vue
<!-- Thêm vào <script setup> -->
import GymOverlay from './features/gym/components/GymOverlay.vue'
```

```vue
<!-- Thêm vào <template>, sau <BattleArena /> -->
<GymOverlay />
```

---

### Bước 9: Chỉnh sửa `gameStore.ts` — Expose Gym Façade

**Mục đích:** Consistent với kiến trúc Façade hiện tại.  
**Thêm vào getters:**

```typescript
// Gym System
gymLeaders: () => useGymStore().gymLeaders,
activeGym: () => useGymStore().activeGym,
isPlayerInTown: () => useGymStore().isPlayerInTown,
```

**Thêm vào actions:**
```typescript
initGymLeaders() { useGymStore().initializeGymLeaders() },
```

---

### Bước 10: Chỉnh sửa `gameStore.ts` — Save/Load Gym State

**Trong `saveGame()`**, thêm vào `saveData`:
```typescript
gymLeaders: useFurnitureStore, // <-- ĐỌC KỸ: dùng useGymStore()
gymLeaders: useGymStore().gymLeaders,
```

**Trong `loadSave()`**, sau dòng `useStaffStore().loadStaff(parsed)`:
```typescript
useGymStore().loadGymState(parsed)
```

---

## 3. CORE LOGIC SNIPPETS — THUẬT TOÁN SINH DECK GYM LEADER

### Mô tả Thuật toán

```
INPUT:
  - gym.type            (vd: 'Fire')
  - gym.difficultyLevel (vd: 15)
  - playerLevel         (từ statsStore)
  - apiStore.shopItems  (tất cả pack/box đang có trong game)
  - apiStore.setCardsCache (thẻ đã được cached)

CONSTRAINTS:
  - MAX_LEVEL_OFFSET = 5
  - Chỉ lấy pack có requiredLevel <= playerLevel + MAX_LEVEL_OFFSET
  - Ưu tiên thẻ cùng hệ (gym.type), fallback Colorless, fallback bất kỳ

OUTPUT:
  - deck: any[] (5 phần tử, là raw card data từ SQLite)
```

### Flowchart Logic

```
START
  │
  ▼
Lọc shopItems → chỉ lấy item.type === 'pack'
  │              VÀ item.requiredLevel <= playerLevel + 5
  │
  ▼
Với mỗi pack hợp lệ → load setCardsCache[sourceSetId]
  │
  ▼
Phân loại thẻ:
  ├─ card.types.includes(gym.type)  → validCards[]
  └─ card.types = ['Colorless'] | []  → colorlessCards[]
  (bỏ qua thẻ không có HP hoặc không có attacks)
  │
  ▼
Xáo trộn validCards → lấy tối đa 5
  │
  ▼
Nếu deck.length < 5 → bổ sung từ colorlessCards (xáo trộn)
  │
  ▼
Nếu vẫn < 5 → fallback: lấy bất kỳ thẻ nào từ toàn bộ cache (có HP + attacks)
  │
  ▼
RETURN deck.slice(0, 5)
```

### Reference Implementation (đã có trong Bước 3)

```typescript
// Đây là hàm standalone buildGymLeaderDeck() ở cuối gymStore.ts
// Junior AI Coder: COPY NGUYÊN VẸN, không thay đổi logic lọc level.

const MAX_LEVEL_OFFSET = 5 // ← Không được thay đổi hằng số này

if (item.requiredLevel > playerLevel + MAX_LEVEL_OFFSET) continue  // ← RULE BẮT BUỘC
```

### Edge Cases cần xử lý

| Tình huống | Xử lý |
|---|---|
| Cache rỗng (player mới, chưa unlock set nào) | `apiStore.loadSetCards(setId)` để force-load |
| Không đủ 5 thẻ cùng hệ | Bổ sung từ Colorless pool |
| Colorless cũng không đủ | Lấy bất kỳ thẻ nào từ toàn bộ cache |
| `generatedDeck.length === 5` | Return cache, không generate lại |
| Gym Leader đã bị defeat | `isDefeated = true`, sprite alpha 0.5, nút disable |

---

## 4. CHECKLIST & QUY TẮC BẮT BUỘC

### ✅ Kiến Trúc

- [ ] **Không import chéo module**: `gymStore` KHÔNG được import trực tiếp từ `furnitureStore`, `inventoryStore` hay `battleStore` ở module level. Dùng lazy import (`await import(...)`) hoặc gọi bên trong function.
- [ ] **TownManager chỉ gọi Store Actions**: `TownManager.ts` được phép gọi `gymStore.enterGym()` và `gymStore.exitGym()`. **Tuyệt đối không** đọc Vue `ref()` hay `computed()` bên trong Phaser Manager.
- [ ] **Không dùng Vue reactivity cho tọa độ Phaser**: Tọa độ `player.x`, `player.y`, sprite positions là số nguyên thô, không được wrap bằng `ref()` hay `reactive()`.
- [ ] **Store subscription cleanup**: Mọi `store.$subscribe()` đăng ký trong `create()` phải được thêm vào `this.storeUnsubscribers.push(...)` để cleanup khi scene shutdown.

### ✅ Phaser Conventions

- [ ] **Luôn check `scene.cameras.main` tồn tại** trước khi gọi `refreshEnvironment()` (xem pattern đã có trong `EnvironmentManager.ts`).
- [ ] **World Bounds**: Sau khi mở rộng sang Town, gọi `this.physics.world.setBounds(0, 0, 5500, 3000)` VÀ `this.cameras.main.setBounds(...)` với cùng giá trị.
- [ ] **Depth ordering**: Gym buildings dùng `DEPTH.FURNITURE` (=10), labels dùng `DEPTH.UI_TEXT` (=21) — không tạo giá trị DEPTH mới.
- [ ] **StaticGroup cho Gym buildings**: Gym buildings là static vật thể (không di chuyển) → dùng `physics.add.staticGroup()`, không dùng dynamic group.

### ✅ Vue & Pinia

- [ ] **GymOverlay dùng Teleport nếu cần z-index cao**: Nếu có z-index conflict, wrap content bằng `<Teleport to="body">`.
- [ ] **`openBattleWithDeck` là async-safe**: Dùng dynamic import để tránh circular dependency với `inventoryStore`.
- [ ] **Save/Load đầy đủ**: `gymLeaders[]` (bao gồm `isDefeated` và `generatedDeck`) phải được serialized trong `saveGame()` và loaded trong `loadSave()`.
- [ ] **`initializeGymLeaders()` idempotent**: Phải check `if (this.gymLeaders.length > 0) return` để không overwrite save data.

### ✅ TypeScript

- [ ] **`currentGymId` trong battleStore state**: Phải khai báo `currentGymId: null as string | null` trong `state()` trước khi dùng trong `openBattleWithDeck`.
- [ ] **Type import**: Chỉ dùng `import type { ... }` cho interface/type, không dùng value import cho types.
- [ ] **No `any` ở signatures public**: Các public method của `TownManager` và `gymStore` actions phải có type rõ ràng. `any[]` cho `generatedDeck` là chấp nhận được do dữ liệu từ SQLite.

### ✅ Assets

- [ ] **SVG file phải tự-chứa (self-contained)**: Không reference external font hay external URL trong SVG.
- [ ] **Phaser image key unique**: Key `'gym_building'` phải khác với các key hiện có (`'player'`, `'npc'`, `'shelf'`, `'cashier'`).

### ✅ Testing thủ công trước khi commit

- [ ] Chạy `npm run dev`, mở Shop bình thường — không bị lỗi.
- [ ] Di chuyển player sang phải tới x > 2900 — Town background hiện ra.
- [ ] Đứng gần Gym building — GymOverlay popup hiện ra với đúng tên và hệ.
- [ ] Bấm "Thách Đấu" — Battle Arena mở với đội Gym Leader (5 thẻ) và đội Player.
- [ ] Thắng trận — Gym building chuyển alpha 0.5, money/XP được cộng.
- [ ] Refresh trang — Gym state `isDefeated` vẫn giữ nguyên (test save/load).

---

## 5. THỨ TỰ THỰC HIỆN KHUYẾN NGHỊ

```
Bước 1 → Bước 2 → Bước 3 (gymStore, không cần Phaser)
     ↓
Bước 4 (TownManager, cần Bước 1 types xong)
     ↓
Bước 5 (GymOverlay Vue component)
     ↓
Bước 6 (battleStore extension — chỉnh sửa file cũ)
     ↓
Bước 7 (MainScene — integrate TownManager)
     ↓
Bước 8 → Bước 9 → Bước 10 (App.vue, gameStore, save/load)
     ↓
Manual Testing Checklist
```

---

## 6. PHỤ LỤC — MAPPING FILE DEPENDENCIES

```
gymStore.ts
  ├── imports: statsStore, apiStore
  └── exported to: TownManager, GymOverlay, battleStore, gameStore

TownManager.ts
  ├── imports: gymStore (actions only), Phaser, DEPTH config
  └── used by: MainScene

GymOverlay.vue
  ├── imports: gymStore, battleStore, EnhancedButton
  └── mounted in: App.vue

battleStore.ts (modified)
  ├── new state: currentGymId
  ├── new action: openBattleWithDeck()
  └── modified: checkAndSetWinner() → defeatGymLeader()

MainScene.ts (modified)
  ├── new import: TownManager, gymStore
  ├── new property: townManager
  ├── modified: preload(), create(), update()
  └── new method: handleAreaTransition()
```

---

*Blueprint được soạn bởi System Architect — Version 1.0.0*  
*Mọi thay đổi logic thuật toán phải được review trước khi implement.*