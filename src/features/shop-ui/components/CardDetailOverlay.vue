<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCardDetailStore } from '../../inventory/store/cardDetailStore'
import PokemonCard3D from '../../shared/components/PokemonCard3D.vue'
import { getRarityBadge } from '../../inventory/config/rarityRegistry'

const store = useCardDetailStore()
const showRawJson = ref(false)

const card = computed(() => store.selectedCard)
function toggleRawJson() {
  showRawJson.value = !showRawJson.value
}

const safeJson = computed(() => {
  if (!card.value) return ''
  const cache = new Set()
  return JSON.stringify(card.value, (_, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) return '[Circular]'
      cache.add(value)
    }
    return value
  }, 2)
})

function close() {
  store.closeCard()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.isOpen) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Helpers for rendering
function getMarketPrice(card: any): string {
  const price = card?.pricing?.tcgplayer?.normal?.marketPrice ?? card?.pricing?.cardmarket?.avg ?? 'N/A';
  return price !== 'N/A' ? `$${Number(price).toFixed(2)}` : 'N/A';
}
</script>

<template>
  <Transition name="fade">
    <div v-if="store.isOpen && card" class="detail-overlay" @click.self="close">
      <button class="close-header-btn" @click="close">×</button>

      <div class="detail-contentContainer">
        <!-- LEFT: VISUAL (Holographic 3D) -->
        <!-- [x] Phát triển component PokemonCard3D.vue (Vanilla JS High-perf) -->
        <!-- [x] Tích hợp PokemonCard3D vào CardDetailOverlay -->
        <div class="visual-column">
          <PokemonCard3D 
            :card="card"
          />
        </div>

        <!-- RIGHT: INFO PANEL -->
        <div class="info-column">
          <div class="scroll-area">
            <!-- Header -->
            <div class="info-header">
              <div class="set-info" v-if="card.id">
                <span class="set-id">#{{ card.id.split('-')[1] || card.id }}</span>
              </div>
              <h1 class="card-name">{{ card.name }}</h1>
              
              <div class="badges-row">
                <span 
                  v-if="card.rarity" 
                  class="rarity-pill" 
                  :class="getRarityBadge(card).cssClass"
                >
                  {{ getRarityBadge(card).label }}
                </span>
                <span class="category-pill">{{ card.category }}</span>
              </div>
            </div>

            <!-- Price -->
            <div class="price-section">
              <span class="label">Giá thị trường ước tính</span>
              <div class="price-value">{{ getMarketPrice(card) }}</div>
            </div>

            <div class="divider"></div>

            <!-- Basic Stats (Pokemon only) -->
            <div v-if="card.category === 'Pokemon'" class="stats-grid">
              <div class="stat-box">
                <span class="label">HP</span>
                <span class="value hp">{{ card.hp }}</span>
              </div>
              <div class="stat-box">
                <span class="label">Hệ</span>
                <div class="types-list">
                  <span v-for="t in card.types" :key="t" class="type-icon" :title="t">
                    {{ t }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Attacks / Effects -->
            <div class="description-section">
              <!-- Pokemon Attacks -->
              <div v-if="card.attacks && card.attacks.length > 0" class="attacks-list">
                <div v-for="attack in card.attacks" :key="attack.name" class="attack-item">
                  <div class="attack-header">
                    <div class="attack-cost">
                      <span v-for="(cost, idx) in attack.cost" :key="idx" class="cost-dot" :class="cost.toLowerCase()"></span>
                    </div>
                    <span class="attack-name">{{ attack.name }}</span>
                    <span v-if="attack.damage" class="attack-damage">{{ attack.damage }}</span>
                  </div>
                  <p v-if="attack.text" class="attack-text">{{ attack.text }}</p>
                </div>
              </div>

              <!-- Trainer/Energy Effects -->
              <div v-if="card.effect" class="effect-box">
                <h3 class="section-title">Hiệu ứng</h3>
                <p class="effect-text">{{ card.effect }}</p>
              </div>

              <div v-if="card.description" class="effect-box">
                <h3 class="section-title">Mô tả</h3>
                <p class="flavor-text">{{ card.description }}</p>
              </div>
            </div>

            <!-- Weakness / Resistance / Retreat -->
            <div v-if="card.category === 'Pokemon'" class="footer-stats">
              <div v-if="card.weaknesses" class="footer-stat">
                <span class="label">Điểm yếu</span>
                <div class="weak-list">
                  <span v-for="w in card.weaknesses" :key="w.type">{{ w.type }} {{ w.value }}</span>
                </div>
              </div>
              <div v-if="card.retreat !== undefined" class="footer-stat">
                <span class="label">Phí rút lui</span>
                <div class="retreat-list">
                  <span v-for="n in card.retreat" :key="n" class="cost-dot colorless"></span>
                  <span v-if="card.retreat === 0">0</span>
                </div>
              </div>
            </div>

            <!-- RAW JSON Inspector (Expanded) -->
            <div v-if="showRawJson" class="json-viewer">
              <pre>{{ safeJson }}</pre>
            </div>
          </div>

          <div class="info-actions">
            <button class="debug-json-btn" @click="toggleRawJson">
              {{ showRawJson ? 'ẨN JSON' : '[RAW JSON]' }}
            </button>
            <button class="primary-close-btn" @click="close">ĐÓNG LẠI</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(15px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
}

.close-header-btn {
  position: absolute;
  top: 1.5rem;
  right: 2rem;
  background: none;
  border: none;
  color: white;
  font-size: 3rem;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.2s;
  z-index: 1010;
}

.close-header-btn:hover { opacity: 1; }

.detail-contentContainer {
  width: 100%;
  max-width: 1100px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

/* LEFT COLUMN */
.visual-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.visual-column .hint {
  color: #94a3b8;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 700;
  opacity: 0.6;
}

/* RIGHT COLUMN */
.info-column {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 1.5rem;
  height: 80vh;
  max-height: 700px;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4);
}

.scroll-area {
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 1rem;
  margin-bottom: 2rem;
}

.scroll-area::-webkit-scrollbar { width: 6px; }
.scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

.info-header { margin-bottom: 2rem; }
.set-info { margin-bottom: 0.5rem; }
.set-id { color: #6366f1; font-weight: 900; font-size: 0.9rem; }

.card-name {
  font-size: 2rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.1;
  margin-bottom: 0.75rem;
}

.badges-row { display: flex; gap: 0.5rem; }
.rarity-pill, .category-pill {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
}
.category-pill { background: rgba(255,255,255,0.1); color: #e2e8f0; }

.price-section { margin-bottom: 1.5rem; }
.price-section .label { font-size: 0.75rem; color: #cbd5e1; text-transform: uppercase; font-weight: 700; }
.price-value { font-size: 1.75rem; font-weight: 900; color: #34d399; }

.divider { height: 1px; background: rgba(255,255,255,0.12); margin-bottom: 1.5rem; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.stat-box { display: flex; flex-direction: column; gap: 0.25rem; }
.stat-box .label { font-size: 0.7rem; color: #cbd5e1; font-weight: 800; text-transform: uppercase; }
.stat-box .value { font-size: 1.1rem; font-weight: 900; color: #ffffff; }
.value.hp { color: #f43f5e; }

.type-icon { background: #334155; padding: 2px 8px; border-radius: 4px; font-size: 0.9rem; }

.attack-item { margin-bottom: 1.5rem; }
.attack-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.attack-name { font-size: 1.1rem; font-weight: 800; color: #ffffff; flex-grow: 1; }
.attack-damage { font-size: 1.1rem; font-weight: 900; color: #fbbf24; }
.attack-text { font-size: 0.9rem; color: #e2e8f0; line-height: 1.5; }

.section-title { font-size: 0.8rem; color: #a5b4fc; font-weight: 800; text-transform: uppercase; margin-bottom: 0.75rem; }
.effect-text, .flavor-text { font-size: 0.95rem; color: #f1f5f9; line-height: 1.6; }
.flavor-text { font-style: italic; opacity: 0.9; }

.footer-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding-top: 1rem; }
.footer-stat .label { font-size: 0.7rem; color: #cbd5e1; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 0.5rem; }
.footer-stat .value { color: #ffffff; font-size: 0.95rem; }

.weak-list { color: #f8fafc; }

/* Cost Dots */
.cost-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
  background: #94a3b8;
  border: 1px solid rgba(0,0,0,0.2);
}
.cost-dot.fire { background: #ef4444; }
.cost-dot.water { background: #3b82f6; }
.cost-dot.grass { background: #22c55e; }
.cost-dot.colorless { background: #cbd5e1; }
.cost-dot.psychic { background: #a855f7; }
.cost-dot.lightning { background: #eab308; }
.cost-dot.fighting { background: #d97706; }

.info-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.debug-json-btn {
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 0.5rem;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}
.debug-json-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.primary-close-btn {
  background: white;
  color: black;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 900;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.1em;
}

.primary-close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255,255,255,0.2);
}

.json-viewer {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}
.json-viewer pre {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #10b981;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1024px) {
  .detail-contentContainer { grid-template-columns: 1fr; gap: 2rem; overflow-y: auto; max-width: 500px; }
  .info-column { height: auto; max-height: none; }
}
</style>
