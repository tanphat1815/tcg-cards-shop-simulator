<script setup lang="ts">
/**
 * BattleLogPanel.vue
 * Chỉ subscribe vào battleStore.logs — tách biệt hoàn toàn để tránh re-render
 * khu vực BattleField khi có log mới push vào.
 */
import { ref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '../store/battleStore'

const store = useBattleStore()
const { logs } = storeToRefs(store)

const logContainer = ref<HTMLElement | null>(null)

// Auto-scroll xuống log mới nhất
watch(logs, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}, { deep: true })

const logTypeClass = (type: string) => ({
  'log-info':    type === 'info',
  'log-attack':  type === 'attack',
  'log-ko':      type === 'ko',
  'log-energy':  type === 'energy',
  'log-retreat': type === 'retreat',
  'log-system':  type === 'system',
})
</script>

<template>
  <div class="log-panel">
    <div class="log-header">
      <span class="log-title">📋 Nhật ký chiến đấu</span>
      <span class="log-count">{{ logs.length }} sự kiện</span>
    </div>
    <div ref="logContainer" class="log-list">
      <TransitionGroup name="log-slide">
        <div
          v-for="log in logs"
          :key="log.id"
          class="log-item"
          :class="logTypeClass(log.type)"
        >
          {{ log.text }}
        </div>
      </TransitionGroup>
      <div v-if="logs.length === 0" class="log-empty">
        Trận đấu bắt đầu...
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}

.log-title {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-count {
  font-size: 11px;
  color: #475569;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.log-empty {
  color: #475569;
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
  font-style: italic;
}

.log-item {
  font-size: 12px;
  line-height: 1.5;
  padding: 5px 10px;
  border-radius: 6px;
  border-left: 3px solid transparent;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Log type styles */
.log-system  { color: #94a3b8; border-left-color: #475569; background: rgba(71,85,105,0.1); }
.log-info    { color: #7dd3fc; border-left-color: #38bdf8; background: rgba(56,189,248,0.06); }
.log-attack  { color: #fca5a5; border-left-color: #ef4444; background: rgba(239,68,68,0.08); }
.log-ko      { color: #f87171; border-left-color: #dc2626; background: rgba(220,38,38,0.12); font-weight: 700; }
.log-energy  { color: #fde68a; border-left-color: #f59e0b; background: rgba(245,158,11,0.06); }
.log-retreat { color: #86efac; border-left-color: #22c55e; background: rgba(34,197,94,0.06); }

/* TransitionGroup animation */
.log-slide-enter-active { transition: all 0.25s ease; }
.log-slide-enter-from   { opacity: 0; transform: translateX(-8px); }
</style>
