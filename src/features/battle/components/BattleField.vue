<script setup lang="ts">
/**
 * BattleField.vue
 * Render 10 lá bài theo layout Classic Pokémon TCG Playmat:
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  ENEMY SIDE  (đảo ngược, nền trắng/xám)                │
 * │  [Prize x6] [Active]  [Bench x4]  [Deck] [Discard]     │
 * ├──────────────────────── Pokéball ───────────────────────┤
 * │  PLAYER SIDE (nền đỏ)                                   │
 * │  [Prize x6] [Active]  [Bench x4]  [Deck] [Discard]     │
 * └─────────────────────────────────────────────────────────┘
 *
 * Tất cả thẻ bài đều có disableTilt=true để bảo vệ FPS.
 * Click → retreat (bench player) / không hành động (enemy, active)
 * Right-Click → Xem chi tiết thẻ bài
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '../store/battleStore'
import { useCardDetailStore } from '../../inventory/store/cardDetailStore'
import { BattleLogic } from '../managers/BattleLogic'
import PokemonCard3D from '../../shared/components/PokemonCard3D.vue'
import type { BattleCard } from '../types'

const store = useBattleStore()
const cardDetailStore = useCardDetailStore()

const {
  playerTeam, enemyTeam,
  playerBench, enemyBench,
  playerActive, enemyActive,
  canAct,
  playerAliveCount, enemyAliveCount,
} = storeToRefs(store)

// ── Helpers ─────────────────────────────────────────────────────
function hpPercent(card: BattleCard | null): number {
  if (!card) return 0
  return BattleLogic.getHpPercent(card)
}

function hpColor(card: BattleCard | null): string {
  return BattleLogic.getHpColor(hpPercent(card))
}

function cardWidth(isActive: boolean): string {
  return isActive ? '90px' : '68px'
}

// ── Interactions ─────────────────────────────────────────────────
function onViewDetail(card: BattleCard) {
  if (card.rawCardData) {
    cardDetailStore.openCard(card.rawCardData)
  } else {
    // Fallback: construct minimal card data
    cardDetailStore.openCard({
      id: card.id,
      name: card.name,
      image: card.image,
      hp: String(card.hp),
      types: card.types,
      attacks: card.attacks,
      weaknesses: card.weaknesses,
      resistances: card.resistances,
      rarity: card.rarity,
    })
  }
}

// Click trên Bench player → Rút lui
function onPlayerBenchClick(card: BattleCard, benchIndex: number) {
  if (!canAct.value) return
  if (card.isKnockedOut) return
  store.retreat(benchIndex)
}

// Right-click → Xem chi tiết
function onCardRightClick(card: BattleCard) {
  onViewDetail(card)
}

// Đếm Prize Cards: mỗi Pokémon KO của địch = 1 prize (tối đa 6)
const playerPrizesWon = computed(() =>
  Math.min(6, (enemyTeam.value.filter(c => c?.isKnockedOut).length))
)
const enemyPrizesWon = computed(() =>
  Math.min(6, (playerTeam.value.filter(c => c?.isKnockedOut).length))
)
</script>

<template>
  <div class="battlefield">

    <!-- ───────── ENEMY SIDE (top, flipped) ───────── -->
    <div class="side enemy-side">
      <!-- Row trên: Prize Cards + Bench + Deck/Discard -->
      <div class="side-row bench-row">
        <!-- Prize Cards (Left) -->
        <div class="prize-zone enemy-prize">
          <div class="zone-label">PRIZE<br>CARDS</div>
          <div class="prize-slots">
            <div
              v-for="i in 6"
              :key="'ep-' + i"
              class="prize-card"
              :class="{ won: i <= enemyPrizesWon }"
            >
              <span v-if="i <= enemyPrizesWon">❌</span>
              <span v-else>?</span>
            </div>
          </div>
        </div>

        <!-- Enemy Bench (4 cards) -->
        <div class="bench-zone">
          <div class="zone-label">BENCH</div>
          <div class="bench-cards">
            <div
              v-for="(card, idx) in enemyBench"
              :key="'eb-' + idx"
              class="bench-slot"
              :class="{ 'has-card': !!card, 'knocked-out': card?.isKnockedOut }"
              @contextmenu.prevent="card && !card.isKnockedOut && onCardRightClick(card)"
            >
              <template v-if="card && !card.isKnockedOut">
                <PokemonCard3D
                  :card="card.rawCardData ?? card"
                  :width="cardWidth(false)"
                  :disable-tilt="true"
                  :is-hit="card.isHit"
                />
                <div class="mini-hp-bar">
                  <div class="mini-hp-fill"
                    :style="{ width: hpPercent(card) + '%', background: hpColor(card) }">
                  </div>
                </div>
              </template>
              <div v-else class="slot-ghost enemy-ghost">
                <span>{{ card?.isKnockedOut ? '💀' : '' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Deck + Discard (Right) -->
        <div class="deck-discard-zone">
          <div class="deck-slot">
            <div class="slot-box">DECK</div>
          </div>
          <div class="discard-slot">
            <div class="slot-box">DISCARD</div>
          </div>
        </div>
      </div>

      <!-- Enemy Active -->
      <div class="active-row">
        <div class="stadium-label">STADIUM</div>
        <div class="active-zone enemy-active">
          <div class="zone-label">ACTIVE</div>
          <div
            class="active-card"
            :class="{ 'knocked-out': enemyActive?.isKnockedOut }"
            @contextmenu.prevent="enemyActive && !enemyActive.isKnockedOut && onCardRightClick(enemyActive)"
          >
            <template v-if="enemyActive && !enemyActive.isKnockedOut">
              <PokemonCard3D
                :card="enemyActive.rawCardData ?? enemyActive"
                :width="cardWidth(true)"
                :disable-tilt="true"
                :is-hit="enemyActive.isHit"
              />
              <div class="hp-bar-container">
                <div class="hp-bar-track">
                  <div
                    class="hp-bar-fill"
                    :style="{ width: hpPercent(enemyActive) + '%', background: hpColor(enemyActive) }"
                  ></div>
                </div>
                <span class="hp-label">{{ enemyActive.currentHp }}/{{ enemyActive.hp }}</span>
              </div>
              <div class="card-name-label">{{ enemyActive.name }}</div>
              <!-- Energy badges -->
              <div v-if="enemyActive.attachedEnergies.length > 0" class="energy-badges">
                <span v-for="(_e,ei) in enemyActive.attachedEnergies" :key="ei" class="energy-badge">⚡</span>
              </div>
            </template>
            <div v-else class="slot-ghost">
              <span>{{ enemyActive?.isKnockedOut ? '💀' : '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ───────── CENTER DIVIDER ───────── -->
    <div class="center-divider">
      <div class="pokeball-icon">
        <div class="pokeball-upper"></div>
        <div class="pokeball-lower"></div>
        <div class="pokeball-center"></div>
      </div>
      <div class="alive-counts">
        <span class="enemy-count">👾 {{ enemyAliveCount }} còn sống</span>
        <span class="divider-line">|</span>
        <span class="player-count">👤 {{ playerAliveCount }} còn sống</span>
      </div>
    </div>

    <!-- ───────── PLAYER SIDE (bottom, red) ───────── -->
    <div class="side player-side">

      <!-- Player Active -->
      <div class="active-row">
        <div class="active-zone player-active">
          <div class="zone-label">ACTIVE</div>
          <div
            class="active-card"
            :class="{ 'knocked-out': playerActive?.isKnockedOut }"
            @contextmenu.prevent="playerActive && !playerActive.isKnockedOut && onCardRightClick(playerActive)"
          >
            <template v-if="playerActive && !playerActive.isKnockedOut">
              <PokemonCard3D
                :card="playerActive.rawCardData ?? playerActive"
                :width="cardWidth(true)"
                :disable-tilt="true"
                :is-hit="playerActive.isHit"
              />
              <div class="hp-bar-container">
                <div class="hp-bar-track">
                  <div
                    class="hp-bar-fill"
                    :style="{ width: hpPercent(playerActive) + '%', background: hpColor(playerActive) }"
                  ></div>
                </div>
                <span class="hp-label">{{ playerActive.currentHp }}/{{ playerActive.hp }}</span>
              </div>
              <div class="card-name-label">{{ playerActive.name }}</div>
              <div v-if="playerActive.attachedEnergies.length > 0" class="energy-badges">
                <span v-for="(_e,ei) in playerActive.attachedEnergies" :key="ei" class="energy-badge">⚡</span>
              </div>
            </template>
            <div v-else class="slot-ghost">
              <span>{{ playerActive?.isKnockedOut ? '💀' : '—' }}</span>
            </div>
          </div>
        </div>
        <div class="stadium-label">STADIUM</div>
      </div>

      <!-- Row dưới: Prize Cards + Bench + Deck/Discard -->
      <div class="side-row bench-row">
        <!-- Prize Cards (Left) -->
        <div class="prize-zone player-prize">
          <div class="zone-label">PRIZE<br>CARDS</div>
          <div class="prize-slots">
            <div
              v-for="i in 6"
              :key="'pp-' + i"
              class="prize-card"
              :class="{ won: i <= playerPrizesWon }"
            >
              <span v-if="i <= playerPrizesWon">⭐</span>
              <span v-else>?</span>
            </div>
          </div>
        </div>

        <!-- Player Bench (4 cards, click = retreat) -->
        <div class="bench-zone">
          <div class="zone-label">
            BENCH
            <span class="bench-hint" v-if="canAct">(click → rút lui)</span>
          </div>
          <div class="bench-cards">
            <div
              v-for="(card, idx) in playerBench"
              :key="'pb-' + idx"
              class="bench-slot player-bench-slot"
              :class="{
                'has-card': !!card,
                'knocked-out': card?.isKnockedOut,
                'can-retreat': canAct && card && !card.isKnockedOut,
              }"
              @click="card && !card.isKnockedOut && onPlayerBenchClick(card, idx)"
              @contextmenu.prevent="card && !card.isKnockedOut && onCardRightClick(card)"
            >
              <template v-if="card && !card.isKnockedOut">
                <PokemonCard3D
                  :card="card.rawCardData ?? card"
                  :width="cardWidth(false)"
                  :disable-tilt="true"
                  :is-hit="card.isHit"
                />
                <div class="mini-hp-bar">
                  <div class="mini-hp-fill"
                    :style="{ width: hpPercent(card) + '%', background: hpColor(card) }">
                  </div>
                </div>
                <div class="retreat-overlay" v-if="canAct">
                  <span>🔄 Rút lui</span>
                </div>
              </template>
              <div v-else class="slot-ghost player-ghost">
                <span>{{ card?.isKnockedOut ? '💀' : '' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Deck + Discard (Right) -->
        <div class="deck-discard-zone">
          <div class="deck-slot">
            <div class="slot-box player-slot-box">DECK</div>
          </div>
          <div class="discard-slot">
            <div class="slot-box player-slot-box">DISCARD</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Root layout ─── */
.battlefield {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  user-select: none;
}

/* ─── Sides ─── */
.side {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  gap: 6px;
}

.enemy-side {
  background: linear-gradient(180deg, rgba(226,232,240,0.06) 0%, rgba(148,163,184,0.04) 100%);
  border-bottom: none;
  flex: 1;
}

.player-side {
  background: linear-gradient(0deg, rgba(239,68,68,0.18) 0%, rgba(220,38,38,0.08) 100%);
  flex: 1;
}

/* ─── Center divider / Pokéball ─── */
.center-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
  background: rgba(0,0,0,0.3);
  border-top: 1px solid rgba(255,255,255,0.08);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  position: relative;
}

.pokeball-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.6);
  overflow: hidden;
  position: relative;
  box-shadow: 0 0 12px rgba(239,68,68,0.4);
}

.pokeball-upper {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  background: #dc2626;
}

.pokeball-lower {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 50%;
  background: white;
}

.pokeball-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  border: 3px solid rgba(255,255,255,0.8);
  z-index: 2;
  box-shadow: 0 0 0 2px #1e293b;
}

.alive-counts {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: #64748b;
}

.divider-line { color: #334155; }
.enemy-count { color: #7dd3fc; }
.player-count { color: #fca5a5; }

/* ─── Row layouts ─── */
.bench-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.active-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* ─── Prize Zone ─── */
.prize-zone {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex-shrink: 0;
}

.zone-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.2;
}

.prize-slots {
  display: grid;
  grid-template-columns: repeat(2, 28px);
  gap: 3px;
}

.prize-card {
  width: 28px;
  height: 38px;
  border: 1.5px dashed rgba(255,255,255,0.15);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.2);
  transition: all 0.3s;
}

.prize-card.won {
  border-color: #fbbf24;
  background: rgba(251,191,36,0.1);
  color: #fbbf24;
}

/* ─── Bench Zone ─── */
.bench-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bench-hint {
  font-weight: 400;
  color: #22c55e;
  font-size: 8px;
  text-transform: none;
  letter-spacing: 0;
}

.bench-cards {
  display: flex;
  gap: 5px;
  flex-wrap: nowrap;
  justify-content: center;
}

.bench-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8px;
  border: 1.5px dashed rgba(255,255,255,0.12);
  padding: 3px;
  min-width: 72px;
  transition: all 0.2s;
  overflow: hidden;
}

.bench-slot.has-card {
  border-style: solid;
  border-color: rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.2);
}

.bench-slot.knocked-out {
  opacity: 0.35;
  border-color: rgba(239,68,68,0.3);
}

.player-bench-slot.can-retreat:hover {
  border-color: #22c55e;
  background: rgba(34,197,94,0.08);
  cursor: pointer;
  transform: translateY(-2px);
}

.retreat-overlay {
  position: absolute;
  inset: 0;
  background: rgba(34,197,94,0.0);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  font-size: 10px;
  font-weight: 700;
  color: #86efac;
  pointer-events: none;
  border-radius: 6px;
}

.player-bench-slot.can-retreat:hover .retreat-overlay {
  opacity: 1;
  background: rgba(34,197,94,0.12);
}

/* ─── Active Zone ─── */
.active-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.active-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: context-menu;
}

.active-card.knocked-out { opacity: 0.3; }

/* ─── HP Bars ─── */
.hp-bar-container {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.hp-bar-track {
  flex: 1;
  height: 5px;
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease, background 0.4s ease;
}

.hp-label {
  font-size: 9px;
  color: #94a3b8;
  white-space: nowrap;
}

.mini-hp-bar {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 2px;
}

.mini-hp-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.card-name-label {
  font-size: 9px;
  font-weight: 600;
  color: #94a3b8;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.energy-badges {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 9px;
}

/* ─── Deck / Discard ─── */
.deck-discard-zone {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.slot-box {
  width: 52px;
  height: 70px;
  border: 1.5px dashed rgba(255,255,255,0.15);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  color: rgba(255,255,255,0.25);
  letter-spacing: 0.04em;
  text-align: center;
  background: rgba(0,0,0,0.15);
}

.player-slot-box {
  border-color: rgba(239,68,68,0.2);
  color: rgba(239,68,68,0.35);
}

/* ─── Stadium ─── */
.stadium-label {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.08em;
  text-align: center;
  border: 1px dashed rgba(255,255,255,0.1);
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
}

/* ─── Slot Ghost ─── */
.slot-ghost {
  width: 68px;
  height: 95px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: rgba(255,255,255,0.15);
  border: 1.5px dashed rgba(255,255,255,0.08);
  border-radius: 8px;
}

.enemy-ghost { border-color: rgba(148,163,184,0.1); }
.player-ghost { border-color: rgba(239,68,68,0.1); }
</style>
