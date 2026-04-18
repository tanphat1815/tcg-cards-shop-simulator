<script setup lang="ts">
/**
 * BattleSetup.vue
 * Màn hình chọn Deck và Chế độ chơi trước khi bắt đầu trận.
 * - Zoom In/Out grid columns
 * - Help button ngay tại đây
 * - Selected cards phát sáng + lift lên
 */
import { ref, computed, onMounted } from 'vue'
import { useBattleStore } from '../store/battleStore'
import { useInventoryStore } from '../../inventory/store/inventoryStore'
import { useApiStore } from '../../inventory/store/apiStore'
import { useCardDetailStore } from '../../inventory/store/cardDetailStore'
import PokemonCard3D from '../../shared/components/PokemonCard3D.vue'
import type { BattleMode } from '../types'

const battleStore = useBattleStore()
const inventoryStore = useInventoryStore()
const apiStore = useApiStore()
const cardDetailStore = useCardDetailStore()

const selectedMode = ref<BattleMode>('BASIC')
const binderCards = ref<any[]>([])
const isLoading = ref(true)
const gridCols = ref(8) // Default 8 columns, adjustable via zoom

onMounted(async () => {
  isLoading.value = true
  const cardIds = Object.keys(inventoryStore.personalBinder)
  const cards: any[] = []

  for (const cardId of cardIds) {
    let found: any = null
    for (const setCards of Object.values(apiStore.setCardsCache)) {
      found = setCards.find((c: any) => c.id === cardId)
      if (found) break
    }
    if (!found) {
      await apiStore.ensureCardInCache(cardId)
      for (const setCards of Object.values(apiStore.setCardsCache)) {
        found = setCards.find((c: any) => c.id === cardId)
        if (found) break
      }
    }
    if (found) cards.push(found)
  }

  binderCards.value = cards
  isLoading.value = false
})

const isSelected = (cardId: string) =>
  battleStore.selectedDeckCards.some(c => c.id === cardId)

function toggleCard(card: any) {
  battleStore.toggleDeckCard(card)
}

function openCardDetail(card: any) {
  cardDetailStore.openCard(card)
}

function startBattle() {
  if (!battleStore.isDeckReady) return
  battleStore.confirmDeck(selectedMode.value)
}

function zoomIn() { if (gridCols.value > 3) gridCols.value-- }
function zoomOut() { if (gridCols.value < 8) gridCols.value++ }

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridCols.value}, minmax(0, 1fr))`
}))

const totalCards = computed(() => binderCards.value.length)
const selectedCount = computed(() => battleStore.selectedDeckCount)
</script>

<template>
  <div class="setup-screen">
    <!-- Header -->
    <div class="setup-header">
      <div class="setup-title">
        <span class="title-icon">🃏</span>
        <div>
          <h1>Chọn Đội hình</h1>
          <p>Chọn 1-5 Pokémon từ Binder của bạn để chiến đấu</p>
        </div>
      </div>
      <div class="header-right">
        <button class="btn-help" @click="battleStore.toggleHelp()" title="Xem hướng dẫn đánh bài">
          ❓ Hướng dẫn
        </button>
        <button class="btn-close" @click="battleStore.closeBattle()">✕ Thoát</button>
      </div>
    </div>

    <!-- Mode + Zoom row -->
    <div class="toolbar-section">
      <!-- Mode Selection -->
      <div class="mode-options">
        <span class="toolbar-label">⚙️ Chế độ:</span>
        <button
          class="mode-btn"
          :class="{ active: selectedMode === 'BASIC' }"
          @click="selectedMode = 'BASIC'"
        >
          <div class="mode-btn-content">
            <span class="mode-dot basic"></span>
            <div class="mode-text">
              <span class="mode-name">Cơ bản</span>
              <span class="mode-desc">Không cần năng lượng, tự do tấn công</span>
            </div>
          </div>
        </button>
        <button
          class="mode-btn"
          :class="{ active: selectedMode === 'ADVANCED' }"
          @click="selectedMode = 'ADVANCED'"
        >
          <div class="mode-btn-content">
            <span class="mode-dot advanced"></span>
            <div class="mode-text">
              <span class="mode-name">Nâng cao</span>
              <span class="mode-desc">Gắn năng lượng, cần đủ năng lượng để đánh</span>
            </div>
          </div>
        </button>
      </div>

      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <span class="toolbar-label">🔍 Cột:</span>
        <button class="zoom-btn" @click="zoomIn" :disabled="gridCols <= 3" title="Phóng to">➕</button>
        <span class="zoom-val">{{ gridCols }}</span>
        <button class="zoom-btn" @click="zoomOut" :disabled="gridCols >= 8" title="Thu nhỏ">➖</button>
      </div>
    </div>

    <!-- Selection preview bar -->
    <div class="selection-bar">
      <div class="selection-count">
        <span class="count-num">{{ selectedCount }}</span>/5 thẻ đã chọn
        <span v-if="totalCards > 0" class="total-hint">(Binder: {{ totalCards }} thẻ)</span>
      </div>

      <div class="selected-preview">
        <div
          v-for="card in battleStore.selectedDeckCards"
          :key="card.id"
          class="preview-slot filled"
          :title="card.name"
        >
          <img v-if="card.image" :src="`${card.image}/high.webp`" :alt="card.name" />
          <span v-else>?</span>
        </div>
        <div
          v-for="i in (5 - selectedCount)"
          :key="'empty-' + i"
          class="preview-slot empty"
        ><span>+</span></div>
      </div>
    </div>

    <!-- Card Grid -->
    <div class="card-grid-wrapper">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải Binder...</p>
      </div>

      <div v-else-if="binderCards.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Binder trống!</h3>
        <p>Hãy mở Pack để có thẻ bài trước khi đấu.</p>
      </div>

      <div v-else class="card-grid" :style="gridStyle">
        <div
          v-for="card in binderCards"
          :key="card.id"
          class="card-slot"
          :class="{ selected: isSelected(card.id) }"
          @click="toggleCard(card)"
          @contextmenu.prevent="openCardDetail(card)"
        >
          <div class="card-wrapper">
            <PokemonCard3D
              :card="card"
              width="100%"
              :disable-tilt="true"
            />
            <div class="card-overlay" :class="{ visible: isSelected(card.id) }">
              <span class="check-icon">✓</span>
            </div>
          </div>
          <div class="card-info">
            <div class="card-name">{{ card.name }}</div>
            <div class="card-hp" v-if="card.hp">HP: {{ card.hp }}</div>
            <div class="card-hint">
              <span class="hint-icon">🔍</span> Chuột phải — Xem chi tiết
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="setup-footer">
      <div class="footer-hint">
        <template v-if="selectedCount === 0">
          👆 Bấm chọn Pokémon để bắt đầu xây deck &nbsp;|&nbsp; 🔍 Chuột phải → Xem chi tiết
        </template>
        <template v-else>
          ✅ Deck sẵn sàng — Nhấn nút bên phải để bắt đầu!
        </template>
      </div>
      <button
        class="btn-start"
        :disabled="!battleStore.isDeckReady"
        @click="startBattle"
      >
        ⚔️ Bắt đầu Trận đấu
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ──── Header ──── */
.setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.setup-title { display: flex; align-items: center; gap: 12px; }
.title-icon  { font-size: 32px; }

.setup-title h1 {
  margin: 0; font-size: 20px; font-weight: 800; color: #f1f5f9; line-height: 1.2;
}
.setup-title p {
  margin: 2px 0 0; font-size: 12px; color: #64748b;
}

.header-right {
  display: flex; align-items: center; gap: 10px;
}

.btn-help {
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3);
  color: #a5b4fc; padding: 7px 14px; border-radius: 10px;
  cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;
}
.btn-help:hover { background: rgba(99,102,241,0.22); }

.btn-close {
  background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
  color: #f87171; padding: 7px 14px; border-radius: 10px;
  cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;
}
.btn-close:hover { background: rgba(239,68,68,0.22); }

/* ──── Toolbar (mode + zoom) ──── */
.toolbar-section {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0; gap: 16px; flex-wrap: wrap;
}

.toolbar-label {
  font-size: 12px; font-weight: 700; color: #64748b; white-space: nowrap;
}

.mode-options {
  display: flex; align-items: center; gap: 8px;
}

.mode-btn {
  padding: 10px 16px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: #cbd5e1;
  cursor: pointer; transition: all 0.2s;
  text-align: left; min-width: 220px;
}
.mode-btn:hover { border-color: rgba(99,102,241,0.3); background: rgba(255,255,255,0.08); }
.mode-btn.active {
  border-color: #6366f1; background: rgba(99,102,241,0.18);
  color: #e2e8f0; box-shadow: 0 0 15px rgba(99,102,241,0.2);
}

.mode-btn-content { display: flex; align-items: flex-start; gap: 12px; }
.mode-dot {
  width: 14px; height: 14px; border-radius: 50%; margin-top: 4px; flex-shrink: 0;
}
.mode-dot.basic { background: #22c55e; box-shadow: 0 0 10px rgba(34,197,94,0.5); }
.mode-dot.advanced { background: #3b82f6; box-shadow: 0 0 10px rgba(59,130,246,0.5); }

.mode-text { display: flex; flex-direction: column; gap: 2px; }
.mode-name { font-size: 14px; font-weight: 800; }
.mode-desc { font-size: 10px; color: #64748b; font-weight: 500; }

.zoom-controls {
  display: flex; align-items: center; gap: 6px;
}

.zoom-btn {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06);
  color: #cbd5e1; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.zoom-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
.zoom-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.zoom-val {
  font-size: 14px; font-weight: 700; color: #94a3b8; min-width: 20px; text-align: center;
}

/* ──── Selection bar ──── */
.selection-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 24px; background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; gap: 16px;
}

.selection-count {
  font-size: 13px; font-weight: 700; color: #cbd5e1; white-space: nowrap;
}
.count-num { font-size: 18px; color: #818cf8; }
.total-hint { font-size: 11px; color: #475569; font-weight: 400; margin-left: 4px; }

.selected-preview { display: flex; gap: 5px; }

.preview-slot {
  width: 40px; height: 56px; border-radius: 5px;
  border: 1.5px dashed rgba(255,255,255,0.15); overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: rgba(255,255,255,0.2); transition: all 0.2s;
}
.preview-slot.filled {
  border-style: solid; border-color: #6366f1; background: rgba(99,102,241,0.1);
}
.preview-slot.filled img { width: 100%; height: 100%; object-fit: cover; }

/* ──── Card Grid ──── */
.card-grid-wrapper {
  flex: 1; overflow-y: auto; padding: 16px 24px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 200px; gap: 12px; color: #64748b;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(255,255,255,0.08); border-left-color: #6366f1;
  border-radius: 50%; animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon { font-size: 48px; }
.empty-state h3 { margin: 0; color: #94a3b8; }
.empty-state p { margin: 0; font-size: 13px; }

.card-grid {
  display: grid; gap: 12px;
}

/* ──── Card Slot — SELECTED glow + lift ──── */
.card-slot {
  cursor: pointer; border-radius: 10px;
  border: 2px solid transparent; transition: all 0.25s ease;
  position: relative; padding: 4px 4px 0;
}
.card-slot:hover {
  border-color: rgba(99,102,241,0.4); transform: translateY(-3px);
}
/* SELECTED — gold ring + lift + glow */
.card-slot.selected {
  border-color: #facc15;
  box-shadow:
    0 0 0 3px rgba(250,204,21,0.35),
    0 0 18px rgba(250,204,21,0.15);
  transform: translateY(-6px);
  background: rgba(250,204,21,0.06);
}

.card-wrapper { position: relative; }

.card-overlay {
  position: absolute; inset: 0;
  background: rgba(250,204,21,0.35); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s; pointer-events: none;
}
.card-overlay.visible { opacity: 1; }

.check-icon {
  font-size: 28px; color: white; font-weight: 800;
  text-shadow: 0 2px 8px rgba(0,0,0,0.6);
  background: rgba(250,204,21,0.7); width: 40px; height: 40px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}

.card-info { padding: 8px 4px 6px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.card-name {
  font-size: 11px; font-weight: 800; color: #f1f5f9;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.card-hp { font-size: 10px; font-weight: 700; color: #94a3b8; }
.card-hint {
  font-size: 9px; color: #475569; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 3px;
  margin-top: 2px;
}
.hint-icon { font-size: 10px; }

/* ──── Footer ──── */
.setup-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; background: rgba(0,0,0,0.3);
  border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; gap: 16px;
}

.footer-hint { font-size: 12px; color: #64748b; }

.btn-start {
  background: linear-gradient(135deg, #ef4444, #dc2626); border: none;
  color: white; padding: 12px 32px; border-radius: 12px;
  font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s;
  white-space: nowrap;
}
.btn-start:hover:not(:disabled) {
  opacity: 0.88; transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239,68,68,0.35);
}
.btn-start:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
