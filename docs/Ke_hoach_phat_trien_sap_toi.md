# Kế hoạch Phát triển Dự án TCG Cards Shop Webgame

## Tổng quan
Dự án đang trong giai đoạn tích hợp API TCGdex để cung cấp dữ liệu thật cho shop và pack opening. Bước 1 (API integration) đã hoàn thành cơ bản, giờ chuyển sang bước 2 và các bước tiếp theo.

## Các Bước Phát triển Sắp tới

### Bước 2: Hoàn thiện Logic Xé Pack với Dữ liệu Thật từ SDK
**Mục tiêu:** Implement hệ thống xé pack sử dụng thuật toán weighted random selection với data thật từ TCGdex SDK.

**Chi tiết:**
- [ ] Cập nhật `inventoryStore.ts` để sử dụng data từ `apiStore.loadSetCards(setId)`
- [ ] Implement thuật toán weighted random selection theo rarity:
  - Common/Uncommon: ~62.5%
  - Rare: 18.8%
  - Double/Ultra Rare: ~8.5-20.9%
  - Illustration Rare: 11.20%
  - Special Illustration Rare: 1.23%
  - Mega Hyper Rare/Ghost: 0.06%
- [ ] Thêm logic phân loại cards theo rarity từ TCGdex data
- [ ] Test pack opening với các sets khác nhau (fut2020, swsh1, etc.)
- [ ] Optimize performance: tránh fetch quá nhiều cards cùng lúc, sử dụng caching

**Files cần chỉnh sửa:**
- `src/stores/modules/inventoryStore.ts` (tearPack function)
- `src/stores/modules/apiStore.ts` (loadSetCards function)
- `src/services/apiService.ts` (getSetCards optimization)

### Bước 3: Implement Hệ thống Battle/NPC AI
**Mục tiêu:** Thêm logic battle cơ bản và AI cho NPC để tăng tính tương tác.

**Chi tiết Implementation:**

#### **3.1 Core Battle System Setup**
**Files cần tạo:**
- `src/game/managers/BattleManager.ts` - Core battle logic
- `src/stores/modules/battleStore.ts` - Battle state management
- `src/types/battle.ts` - Battle-related TypeScript interfaces

**Functions cần thêm:**
```typescript
// BattleManager.ts
class BattleManager {
  startBattle(playerDeck: Card[], npcDeck: Card[]): BattleState
  processTurn(action: BattleAction): BattleResult
  calculateDamage(attacker: Card, defender: Card, attack: Attack): number
  checkWinCondition(): BattleOutcome
  endBattle(): void
}

// battleStore.ts
const useBattleStore = defineStore('battle', {
  state: () => ({
    currentBattle: null as BattleState | null,
    battleHistory: [] as BattleResult[],
    isInBattle: false
  }),
  actions: {
    initBattle(playerDeck: Card[], opponentId: string)
    executeAction(action: BattleAction)
    forfeitBattle()
  }
})
```

**Flow hoạt động:**
1. Player tương tác với NPC → trigger battle challenge
2. `NPCManager` tạo battle request với deck ngẫu nhiên
3. `BattleManager.startBattle()` khởi tạo battle state
4. Player chọn actions qua UI → `battleStore.executeAction()`
5. `BattleManager.processTurn()` xử lý logic và trả về kết quả
6. UI update dựa trên battle state changes
7. Battle kết thúc → rewards và stats update

#### **3.2 NPC AI System**
**Files cần tạo/chỉnh sửa:**
- `src/game/managers/NPCManager.ts` - NPC behavior và AI logic
- `src/game/ai/NpcAiEngine.ts` - AI decision making
- `src/config/npcData.ts` - NPC definitions và personalities

**Functions cần thêm:**
```typescript
// NPCManager.ts
class NPCManager {
  createNPC(type: NPCType, position: Vector2): NPC
  updateNPC(npc: NPC, delta: number): void
  handleInteraction(player: Player, npc: NPC): InteractionResult
  triggerBattle(npc: NPC): BattleRequest
}

// NpcAiEngine.ts
class NpcAiEngine {
  decideAction(battleState: BattleState, difficulty: Difficulty): BattleAction
  evaluateCard(card: Card, context: BattleContext): number
  predictPlayerAction(battleHistory: BattleAction[]): BattleAction[]
}
```

**Flow hoạt động:**
1. `NPCManager` spawn NPCs với random positions và behaviors
2. Mỗi frame, `updateNPC()` gọi AI engine để decide actions
3. AI state machine: IDLE → WANDER → INTERACT → BATTLE
4. Trong battle: AI analyze board state → choose optimal action
5. Difficulty scaling: Easy (random), Normal (basic strategy), Hard (advanced tactics)

#### **3.3 Battle UI Components**
**Files cần tạo:**
- `src/components/battle/BattleScreen.vue` - Main battle interface
- `src/components/battle/CardSlot.vue` - Individual card display
- `src/components/battle/EnergyCounter.vue` - Energy management
- `src/components/battle/HealthBar.vue` - HP display với animations
- `src/components/battle/BattleLog.vue` - Action history

**Functions cần thêm:**
```vue
<!-- BattleScreen.vue -->
<template>
  <div v-if="battleStore.isInBattle" class="battle-overlay">
    <BattleField :battle="battleStore.currentBattle" />
    <PlayerHand :cards="playerHand" @play-card="onPlayCard" />
    <BattleControls @end-turn="onEndTurn" @forfeit="onForfeit" />
  </div>
</template>

<script setup>
const battleStore = useBattleStore()
const onPlayCard = (cardId: string, target?: string) => {
  battleStore.executeAction({ type: 'PLAY_CARD', cardId, target })
}
</script>
```

**Flow hoạt động:**
1. Battle start → `BattleScreen` mount với initial state
2. Player interactions → emit events to `battleStore`
3. Store actions → call `BattleManager` methods
4. Manager returns results → store updates state
5. Reactive UI updates hiển thị changes
6. Battle end → cleanup và return to game

#### **3.4 Integration với TCGdex Data**
**Files cần chỉnh sửa:**
- `src/services/apiService.ts` - Thêm battle-related API calls
- `src/stores/modules/inventoryStore.ts` - Deck selection logic

**Functions cần thêm:**
```typescript
// apiService.ts
getCardDetails(cardId: string): Promise<TcgCard>
getCardAttacks(card: TcgCard): Attack[]
calculateWeaknessMultiplier(attackerType: string, defenderTypes: string[]): number

// inventoryStore.ts
selectDeckForBattle(deckId: string): Card[]
validateDeck(deck: Card[]): ValidationResult
getRandomNpcDeck(npcType: NPCType): Card[]
```

**Flow hoạt động:**
1. Battle init → Load card details từ API cache
2. Parse attacks, weaknesses từ TCGdex data
3. Calculate damage dựa trên type matchups
4. Apply status effects và abilities
5. Update battle state với real card stats

#### **3.5 State Management & Persistence**
**Files cần tạo:**
- `src/stores/modules/npcStore.ts` - NPC state tracking
- `src/utils/battleSerializer.ts` - Battle state save/load

**Functions cần thêm:**
```typescript
// npcStore.ts
const useNpcStore = defineStore('npcs', {
  state: () => ({
    activeNpcs: [] as NPC[],
    defeatedNpcs: new Set<string>(),
    npcRelationships: {} as Record<string, number>
  }),
  actions: {
    spawnNpc(type: NPCType)
    removeNpc(npcId: string)
    updateRelationship(npcId: string, change: number)
  }
})
```

**Flow hoạt động:**
1. Game load → Restore NPC states từ localStorage
2. NPC interactions → Update relationships và defeated status
3. Battle results → Persist progress và unlockables
4. Daily reset → Refresh NPC positions và challenges

**Dependencies cần thêm:**
- State machine library (xstate) cho AI
- Animation library (gsap/framer-motion) cho battle effects
- Sound effects cho battle actions

**Testing Strategy:**
- Unit tests cho BattleManager logic
- Integration tests cho NPC AI decisions  
- UI tests cho battle flow
- Performance tests với complex battles

**Risks & Mitigations:**
- Complex state management → Use Pinia plugins cho persistence
- Performance với many cards → Implement virtualization
- Balance issues → A/B testing với different AI difficulties

### Bước 4: Refactor MainScene.ts Theo Kế hoạch
**Mục tiêu:** Chia nhỏ MainScene.ts (1400+ dòng) thành các managers nhỏ hơn.

**Chi tiết:**
- [ ] Tách logic environment (tường, sàn) vào `EnvironmentManager.ts`
- [ ] Tách logic furniture (kệ, bàn) vào `FurnitureManager.ts`
- [ ] Tách logic build mode vào `BuildManager.ts`
- [ ] Tách logic staff vào `StaffManager.ts`
- [ ] MainScene.ts chỉ giữ orchestration và init

**Files cần tạo:**
- `src/game/managers/EnvironmentManager.ts`
- `src/game/managers/FurnitureManager.ts`
- `src/game/managers/BuildManager.ts`
- `src/game/managers/StaffManager.ts`


### Bước 5: Tối ưu hóa Performance và Tài nguyên
**Mục tiêu:** Đảm bảo game chạy mượt với nhiều assets.

**Chi tiết:**
- [ ] Implement lazy loading cho card images
- [ ] Setup CDN cho assets (card images)
- [ ] Convert images to WebP/AVIF format
- [ ] Optimize draw calls với InstancedMesh (nếu chuyển sang 3D)
- [ ] Add LOD (Level of Detail) cho distant objects

**Files cần tạo/chỉnh sửa:**
- `src/utils/assetManager.ts`
- `vite.config.ts` (CDN proxy)
- `src/components/CardImage.vue` (lazy loading)

### Bước 6: Thêm Features Nâng cao
**Mục tiêu:** Mở rộng gameplay với các tính năng mới.

**Chi tiết:**
- [ ] Multiplayer: Supabase integration cho shared market
- [ ] Achievements và progression system
- [ ] Card collection management (binders, decks)
- [ ] Daily challenges và events
- [ ] Sound effects và background music

**Files cần tạo:**
- `src/stores/modules/marketStore.ts`
- `src/stores/modules/achievementStore.ts`
- `src/components/MarketView.vue`

### Bước 7: Testing và Polish
**Mục tiêu:** Đảm bảo stability và user experience.

**Chi tiết:**
- [ ] Unit tests cho core logic
- [ ] Performance testing với nhiều cards/NPCs
- [ ] UI/UX improvements
- [ ] Bug fixes và edge cases
- [ ] Mobile responsiveness

### Bước 8: Deployment và Launch
**Mục tiêu:** Chuẩn bị cho production.

**Chi tiết:**
- [ ] Setup production build
- [ ] Deploy to Vercel/Netlify
- [ ] Setup analytics (Google Analytics)
- [ ] Community feedback và iteration

## Dependencies và Tech Stack
- Vue 3 + TypeScript + Vite
- Phaser.js (2D rendering)
- Pinia (state management)
- TCGdex SDK (@tcgdex/sdk)
- Supabase (future multiplayer)
- CDN (Cloudflare/ImageKit)

## Risk Assessment
- **Legal:** Đảm bảo không sử dụng IP Pokémon (sử dụng generic TCG system)
- **Performance:** Monitor FPS với nhiều entities
- **Data:** Handle API rate limits và caching
- **Browser compatibility:** Test trên multiple browsers

## Timeline Estimate
- Bước 2-3: 2-3 tuần
- Bước 4-5: 1-2 tuần  
- Bước 6-7: 2-3 tuần
- Bước 8-9: 1 tuần

## Notes
- Ưu tiên performance optimization sớm
- Test thường xuyên với real TCGdex data
- Backup code trước mỗi major refactor
- Document API changes và breaking changes