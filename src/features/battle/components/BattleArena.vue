<script setup lang="ts">
/**
 * BattleArena.vue — Main container, full-screen overlay.
 * Phase SETUP → BattleSetup.vue
 * Phase BATTLE/VICTORY/DEFEAT → Playmat + Controls + Log
 */
import { storeToRefs } from 'pinia'
import { useBattleStore } from '../store/battleStore'
import BattleSetup from './BattleSetup.vue'
import BattleField from './BattleField.vue'
import BattleControls from './BattleControls.vue'
import BattleLogPanel from './BattleLogPanel.vue'
import BattleHelpDialog from './BattleHelpDialog.vue'

const store = useBattleStore()
const { isOpen, phase, mode, turnNumber, isEnemyThinking } = storeToRefs(store)
</script>

<template>
  <Teleport to="body">
    <Transition name="arena-fade">
      <div v-if="isOpen" class="battle-arena-overlay">
        <div class="battle-arena">

          <!-- ── SETUP PHASE ── -->
          <BattleSetup v-if="phase === 'SETUP'" />

          <!-- ── BATTLE PHASE ── -->
          <template v-else>
            <!-- Header -->
            <div class="arena-header">
              <div class="arena-title">
                <span class="battle-icon">⚔️</span>
                <div>
                  <span class="title-text">Pokémon Battle Arena</span>
                  <div class="battle-meta">
                    <span class="meta-badge mode-badge">
                      {{ mode === 'BASIC' ? '🟢 Cơ bản' : '🔵 Nâng cao' }}
                    </span>
                    <span class="meta-badge turn-badge" v-if="phase === 'BATTLE'">
                      Lượt {{ turnNumber }}
                    </span>
                    <span class="meta-badge thinking-badge" v-if="isEnemyThinking">
                      🤖 AI đang xử lý...
                    </span>
                  </div>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-icon btn-help" title="Hướng dẫn chơi" @click="store.toggleHelp()">
                  ❓ Hướng dẫn
                </button>
                <button class="btn-icon btn-close" title="Thoát trận đấu" @click="store.closeBattle()">
                  ✕ Thoát
                </button>
              </div>
            </div>

            <!-- Main content -->
            <div class="arena-body">
              <!-- Left: Playmat -->
              <div class="playmat-panel">
                <BattleField />
              </div>

              <!-- Right: Controls + Log -->
              <div class="side-panel">
                <div class="controls-wrapper">
                  <BattleControls />
                </div>
                <div class="log-wrapper">
                  <BattleLogPanel />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Help Dialog -->
        <BattleHelpDialog />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Full-screen Overlay ─── */
.battle-arena-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(8px);
  /* NO padding — full bleed */
}

.battle-arena {
  width: 95vw;
  height: 95vh;
  background: linear-gradient(145deg, #0f1629, #131b35, #0f1629);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(99,102,241,0.1),
    0 32px 64px rgba(0, 0, 0, 0.7),
    0 0 80px rgba(99,102,241,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ─── */
.arena-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.arena-title { display: flex; align-items: center; gap: 10px; }
.battle-icon { font-size: 24px; }

.title-text {
  font-size: 15px; font-weight: 800; color: #f1f5f9; letter-spacing: 0.02em;
}

.battle-meta {
  display: flex; align-items: center; gap: 8px; margin-top: 2px;
}

.meta-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 999px;
  font-weight: 600; letter-spacing: 0.02em;
}

.mode-badge {
  background: rgba(99,102,241,0.15); color: #a5b4fc;
  border: 1px solid rgba(99,102,241,0.2);
}
.turn-badge {
  background: rgba(245,158,11,0.12); color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.2);
}
.thinking-badge {
  background: rgba(34,197,94,0.12); color: #4ade80;
  border: 1px solid rgba(34,197,94,0.2);
  animation: pulse-opacity 1s ease infinite alternate;
}

@keyframes pulse-opacity {
  from { opacity: 0.6; } to { opacity: 1; }
}

.header-actions { display: flex; align-items: center; gap: 8px; }

.btn-icon {
  padding: 6px 12px; border-radius: 8px;
  border: 1px solid; cursor: pointer;
  font-size: 11px; font-weight: 600; transition: all 0.2s;
  display: flex; align-items: center; gap: 4px;
}

.btn-help {
  background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc;
}
.btn-help:hover { background: rgba(99,102,241,0.2); }

.btn-close {
  background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171;
}
.btn-close:hover { background: rgba(239,68,68,0.2); }

/* ─── Body ─── */
.arena-body {
  display: flex;
  flex: 1;
  min-height: 0; /* Crucial for preventing flex overflow */
  overflow: hidden;
}

.playmat-panel {
  flex: 1;
  min-width: 0; /* Prevent flex children from overflowing */
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.07);
  display: flex;
  flex-direction: column;
}

.side-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.controls-wrapper {
  flex: 1.2;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.log-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

/* ─── Transitions ─── */
.arena-fade-enter-active,
.arena-fade-leave-active { transition: all 0.3s ease; }
.arena-fade-enter-from,
.arena-fade-leave-to { opacity: 0; transform: scale(0.97); }
</style>
