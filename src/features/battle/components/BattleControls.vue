<script setup lang="ts">
/**
 * BattleControls.vue
 * Khu vực chọn đòn đánh, gắn năng lượng và nút hành động.
 * Tách riêng để tránh re-render BattleField khi controls thay đổi.
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '../store/battleStore'
import { BattleLogic } from '../managers/BattleLogic'
import EnergyIcon from '../../shared/components/EnergyIcon.vue'

const store = useBattleStore()
const {
  playerActive,
  selectedAttackIndex,
  canAct,
  mode,
  hasAttachedEnergyThisTurn,
  isEnemyThinking,
  phase,
} = storeToRefs(store)

const attacks = computed(() => playerActive.value?.attacks ?? [])

const ENERGY_TYPES = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Fairy', 'Colorless']

function selectAttack(idx: number) {
  if (!canAct.value) return
  store.selectedAttackIndex = idx === selectedAttackIndex.value ? null : idx
}

function confirmAttack() {
  if (selectedAttackIndex.value === null) return
  store.playerAttack(selectedAttackIndex.value)
}

function attachEnergy(energyType: string) {
  store.attachEnergy(0, energyType)
}

function canAttackBeUsed(attackIdx: number): boolean {
  if (!playerActive.value) return false
  if (mode.value === 'BASIC') return true
  return BattleLogic.canUseAttack(playerActive.value, playerActive.value.attacks[attackIdx])
}

const hpPercent = computed(() => {
  if (!playerActive.value) return 0
  return BattleLogic.getHpPercent(playerActive.value)
})

const hpColor = computed(() => BattleLogic.getHpColor(hpPercent.value))
</script>

<template>
  <div class="controls-panel">
    <!-- Trận đấu đang diễn ra -->
    <template v-if="phase === 'BATTLE'">

      <!-- HP Bar Active Pokémon -->
      <div v-if="playerActive" class="active-info">
        <div class="active-name">
          <span>⚔️ {{ playerActive.name }}</span>
          <span class="hp-text">{{ playerActive.currentHp }}/{{ playerActive.hp }} HP</span>
        </div>
        <div class="hp-bar-track">
          <div
            class="hp-bar-fill"
            :style="{ width: hpPercent + '%', background: hpColor }"
          ></div>
        </div>
      </div>

      <!-- Gắn Năng lượng (Chế độ ADVANCED) -->
      <div v-if="mode === 'ADVANCED' && canAct" class="energy-section">
        <div class="section-label">
          ⚡ Gắn Năng lượng
          <span v-if="hasAttachedEnergyThisTurn" class="used-badge">✓ Đã gắn</span>
        </div>
        <div class="energy-grid" v-if="!hasAttachedEnergyThisTurn">
          <button
            v-for="e in ENERGY_TYPES"
            :key="e"
            class="energy-chip"
            :title="e"
            @click="attachEnergy(e)"
          >
            <EnergyIcon :type="e" size="md" />
          </button>
        </div>
      </div>

      <!-- Đòn đánh -->
      <div class="attacks-section">
        <div class="section-label">🗡️ Chọn đòn đánh</div>
        <div class="attacks-list">
          <button
            v-for="(atk, idx) in attacks"
            :key="idx"
            class="attack-btn"
            :class="{
              'selected': selectedAttackIndex === idx,
              'cant-use': !canAttackBeUsed(idx),
              'disabled': !canAct || isEnemyThinking,
            }"
            :disabled="!canAct || isEnemyThinking"
            @click="selectAttack(idx)"
          >
            <div class="atk-header">
              <span class="atk-name">{{ atk.name }}</span>
              <span class="atk-dmg">{{ atk.damage }} DMG</span>
            </div>
            <div class="atk-cost">
              <template v-if="atk.cost.length > 0">
                <EnergyIcon v-for="(c, ci) in atk.cost" :key="ci" :type="c" size="sm" />
              </template>
              <span v-else class="free-atk">Miễn phí</span>
            </div>
            <div v-if="atk.text" class="atk-text">{{ atk.text }}</div>
          </button>
          <div v-if="attacks.length === 0" class="no-attacks">Pokémon này không có đòn đánh!</div>
        </div>
      </div>

      <!-- Nút xác nhận tấn công -->
      <button
        class="btn-attack"
        :disabled="selectedAttackIndex === null || !canAct || isEnemyThinking"
        @click="confirmAttack"
      >
        <span v-if="isEnemyThinking">🤖 Đối thủ đang đánh...</span>
        <span v-else-if="selectedAttackIndex !== null">⚔️ Tấn công!</span>
        <span v-else>← Chọn đòn đánh trước</span>
      </button>
    </template>

    <!-- Kết thúc trận -->
    <template v-else-if="phase === 'VICTORY' || phase === 'DEFEAT'">
      <div class="result-box" :class="phase === 'VICTORY' ? 'victory' : 'defeat'">
        <div class="result-icon">{{ phase === 'VICTORY' ? '🏆' : '💔' }}</div>
        <div class="result-text">{{ phase === 'VICTORY' ? 'Chiến thắng!' : 'Thất bại!' }}</div>
      </div>
      <button class="btn-close-battle btn-red" @click="store.closeBattle()">
        🚪 Thoát trận
      </button>
    </template>
  </div>
</template>

<style scoped>
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  padding: 4px 2px;
}

.active-info {
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.08);
}

.active-name {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 6px;
}

.hp-text { color: #94a3b8; font-size: 12px; }

.hp-bar-track {
  height: 6px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease, background 0.4s ease;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.used-badge {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: none;
  letter-spacing: 0;
}

.energy-section, .attacks-section {
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.06);
}

.energy-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.energy-chip {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.energy-chip:hover { background: rgba(255,255,255,0.12); transform: scale(1.1); }

.attacks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attack-btn {
  text-align: left;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.18s;
  color: #e2e8f0;
}

.attack-btn:hover:not(:disabled):not(.cant-use) {
  background: rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.4);
  transform: translateX(2px);
}

.attack-btn.selected {
  background: rgba(99,102,241,0.2);
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,0.25);
}

.attack-btn.cant-use {
  opacity: 0.4;
  cursor: not-allowed;
}

.attack-btn.disabled { cursor: not-allowed; opacity: 0.5; }

.atk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.atk-name { font-size: 13px; font-weight: 600; }
.atk-dmg  { font-size: 13px; font-weight: 700; color: #f87171; }
.atk-cost { display: flex; gap: 3px; margin: 4px 0; min-height: 18px; align-items: center; }
.free-atk { font-size: 11px; color: #10b981; font-weight: 700; }
.atk-text { font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.4; }

.no-attacks { font-size: 12px; color: #475569; font-style: italic; padding: 8px 0; }

.btn-attack {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}
.btn-attack:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.btn-attack:disabled { opacity: 0.4; cursor: not-allowed; }

.result-box {
  border-radius: 14px;
  padding: 24px;
  text-align: center;
  border: 2px solid;
}

.result-box.victory {
  background: rgba(34,197,94,0.1);
  border-color: rgba(34,197,94,0.3);
}

.result-box.defeat {
  background: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.3);
}

.result-icon { font-size: 48px; margin-bottom: 8px; }

.result-text {
  font-size: 24px;
  font-weight: 800;
  color: #e2e8f0;
}

.btn-close-battle {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-red {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
}

.btn-red:hover { opacity: 0.85; }
</style>
