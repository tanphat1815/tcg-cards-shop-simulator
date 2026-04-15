<script setup lang="ts">
/**
 * PackOpeningOverlay.vue — Giao diện Gacha mở pack thẻ bài
 *
 * KIẾN TRÚC:
 * - Store (inventoryStore) xử lý: Gọi API, sắp xếp thẻ theo Rarity, lưu vào binder
 * - Component này xử lý: UI state, animations, render
 *
 * UI FLOW:
 * Phase 1 (packPhase = 'pack_visible'): Hiển thị ảnh Pack lớn ở giữa
 *   → Click vào Pack → animation rung → chuyển Phase 2
 * Phase 2 (packPhase = 'cards_visible'): Hiển thị 6 lá bài đang úp mặt
 *   → Click từng lá hoặc dùng Auto/Reveal All để lật
 *   → Khi đủ 6 lá lật → hiện nút Collect
 */
import { ref, computed, watch, onUnmounted, reactive } from 'vue'
import { useInventoryStore } from '../../inventory/store/inventoryStore'
import { getPackVisuals } from '../../inventory/config/assetRegistry'
import { isHighRarity } from '../../inventory/config/rarityRegistry'
import TcgCard from '../../../components/shared/TcgCard.vue'
import { useCardDetailStore } from '../../inventory/store/cardDetailStore'

const inventoryStore = useInventoryStore()
const detailStore = useCardDetailStore()

// ─── UI-only state (không đưa vào Store) ───────────────────────────────────
/** Mảng boolean: flipped[i] = true nếu lá bài thứ i đã lật */
const flipped = ref<boolean[]>([])

/** Đang chạy animation rung Pack */
const isPackShaking = ref(false)

/** Đang chạy Auto-Reveal */
const isAutoRevealing = ref(false)

/** Timer ID của Auto-Reveal để có thể cancel */
let autoRevealTimer: ReturnType<typeof setInterval> | null = null

/** Theo dõi trạng thái đã tải xong ảnh của từng card: imageLoaded[index] = true */
const imageLoaded = ref<boolean[]>([])

// Fallback tracking for custom assets
const assetErrors = reactive({
  pack: false
})
const handlePackError = () => { assetErrors.pack = true }

// ─── Computed ───────────────────────────────────────────────────────────────

/** Danh sách thẻ bài hiện tại (đã được Store sắp xếp: thẻ hiếm nhất ở index 5) */
const cards = computed(() => inventoryStore.currentPack)

/** Phase hiện tại của UI */
const phase = computed(() => inventoryStore.packPhase)

/** Tất cả thẻ đã được lật chưa */
const allFlipped = computed(() => {
  const count = cards.value.length
  if (count === 0) return false
  // Không dùng .every vì mảng thưa có thể gây lỗi logic
  let activeCount = 0
  for (let i = 0; i < count; i++) {
    if (flipped.value[i] === true) activeCount++
  }
  return activeCount === count
})

/** Đang hiển thị overlay không */
const isVisible = computed(() => inventoryStore.isOpeningPack)

// ─── Watch: Reset state khi pack mới được mở ────────────────────────────────
watch(
  () => [inventoryStore.isOpeningPack, cards.value.length] as [boolean, number],
  ([isOpening, count]) => {
    if (isOpening && count > 0) {
      // Khởi tạo mảng với giá trị false cụ thể để tránh mảng thưa
      flipped.value = new Array(count).fill(false)
      imageLoaded.value = new Array(count).fill(false)
      isPackShaking.value = false
      stopAutoReveal()
    } else if (isOpening && count === 0) {
      // Trường hợp đang mở nhưng chưa có data
      flipped.value = []
      imageLoaded.value = []
    }
  },
  { immediate: true }
)

// ─── PHASE 1: Xử lý click vào Pack ─────────────────────────────────────────

/**
 * Người dùng click vào ảnh Pack:
 * Chuyển sang Phase 2 ngay lập tức sau hiệu ứng rung, không đợi tải ảnh.
 */
async function handlePackClick() {
  if (isPackShaking.value || phase.value !== 'pack_visible') return

  // 1. Chuyển trạng thái rung và âm thanh ngay lập tức
  isPackShaking.value = true
  playTearSound()

  // 2. Chuyển Phase sau 600ms (cho người dùng thấy animation rung)
  // KHÔNG còn await waitForData() hay preloadCardImages() ở đây nữa
  setTimeout(() => {
    isPackShaking.value = false
    inventoryStore.revealCards()
    
    // Đảm bảo mảng state loaded khớp với số lượng bài thực tế
    if (imageLoaded.value.length !== cards.value.length) {
      imageLoaded.value = new Array(cards.value.length).fill(false)
    }
  }, 600)
}

// ─── PHASE 2: Xử lý lật từng thẻ ──────────────────────────────────────────

/**
 * Lật một lá bài cụ thể khi người dùng click
 */
function flipCard(index: number) {
  if (flipped.value[index] || phase.value !== 'cards_visible') return
  flipped.value[index] = true
  playFlipSound()

  const card = cards.value[index]
  if (isHighRarity(card)) {
    playRareSound()
  }
}

/**
 * Lật tất cả thẻ cùng lúc (nút Reveal All)
 */
function revealAll() {
  if (phase.value !== 'cards_visible') return
  stopAutoReveal()
  flipped.value = new Array(cards.value.length).fill(true)
  playFlipSound()

  // Kiểm tra xem có thẻ hiếm không để phát sound đặc biệt
  const hasRare = cards.value.some(isHighRarity)
  if (hasRare) {
    setTimeout(() => playRareSound(), 300)
  }
}

/**
 * Lật lần lượt từng thẻ, mỗi thẻ cách nhau 0.5 giây (nút Auto-Reveal)
 */
function startAutoReveal() {
  if (isAutoRevealing.value || phase.value !== 'cards_visible') return
  isAutoRevealing.value = true

  let currentIndex = flipped.value.findIndex(f => !f)
  if (currentIndex === -1) {
    isAutoRevealing.value = false
    return
  }

  autoRevealTimer = setInterval(() => {
    currentIndex = flipped.value.findIndex(f => !f)
    if (currentIndex === -1) {
      stopAutoReveal()
      return
    }
    flipped.value[currentIndex] = true
    playFlipSound()

    const card = cards.value[currentIndex]
    if (isHighRarity(card)) {
      setTimeout(() => playRareSound(), 100)
    }
  }, 500)
}

function stopAutoReveal() {
  if (autoRevealTimer) {
    clearInterval(autoRevealTimer)
    autoRevealTimer = null
  }
  isAutoRevealing.value = false
}

/**
 * Đóng overlay và lưu thẻ vào binder (nút Collect)
 */
function handleCollect() {
  stopAutoReveal()
  inventoryStore.closePackOpening()
}

// ─── Audio System ───────────────────────────────────────────────────────────

// ─── Audio System ───────────────────────────────────────────────────────────
function createAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    return AudioCtx ? new AudioCtx() : null
  } catch {
    return null
  }
}

function playTearSound() {
  const ctx = createAudioContext()
  if (!ctx) return
  try {
    const bufferSize = ctx.sampleRate * 0.4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 400
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    source.stop(ctx.currentTime + 0.4)
  } catch { /* ignore */ }
}

function playFlipSound() {
  const ctx = createAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch { /* ignore */ }
}

function playRareSound() {
  const ctx = createAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(700, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12)
    osc.frequency.setValueAtTime(2000, ctx.currentTime + 0.28)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.9)
  } catch { /* ignore */ }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────
onUnmounted(() => {
  stopAutoReveal()
})
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════════
       OVERLAY WRAPPER — Backdrop toàn màn hình
  ═══════════════════════════════════════════════════════════════ -->
  <Transition name="overlay-fade">
    <div
      v-if="isVisible"
      class="pack-overlay"
    >

      <!-- ═══════════════════════════════════════════════════════════
           PHASE SWITCHER — Đảm bảo chuyển phase mượt mà không bị lệch
      ═══════════════════════════════════════════════════════════ -->
      <Transition name="phase-switch" mode="out-in">
        
        <!-- PHASE 1: Hiển thị ảnh Pack lớn -->
        <div
          v-if="phase === 'pack_visible'"
          key="pack"
          class="pack-phase"
        >
          <h2 class="pack-title">Mở Pack Thẻ Bài!</h2>
          <p class="pack-subtitle">Click vào pack để xé</p>

          <div
            class="pack-wrapper"
            :class="{ 'pack-shaking': isPackShaking }"
            @click="handlePackClick"
          >
            <div class="pack-glow-ring ring-1"></div>
            <div class="pack-glow-ring ring-2"></div>

            <div class="pack-image-container">
              <!-- Real Pack Image -->
              <img 
                v-if="inventoryStore.currentPackSetId && !assetErrors.pack"
                :src="getPackVisuals(inventoryStore.currentPackSetId).front"
                class="pack-front-img"
                @error="handlePackError"
              />
              <div v-else class="pack-emoji">🎴</div>
              <div class="pack-shine"></div>
            </div>
          </div>

          <p class="pack-click-hint">
            <span class="click-icon">👆</span> Click để xé
          </p>
        </div>

        <!-- PHASE 2: Hiển thị 6 lá bài -->
        <div
          v-else-if="phase === 'cards_visible'"
          key="cards"
          class="cards-phase"
        >
          <h2 class="cards-title">⭐ Kết quả mở Pack ⭐</h2>

          <div class="cards-grid">
            <div
              v-for="(card, index) in cards"
              :key="index"
              class="card-slot"
              @click="flipCard(index)"
            >
              <TcgCard
                :card="card"
                :is-flipped="flipped[index]"
                :show-price="true"
                @click="detailStore.openCard(card)"
              />
            </div>
          </div>

          <div class="controls-panel">
            <span class="controls-hint">🖱️ Click thẻ để lật • Hoặc dùng nút bên dưới</span>
            <div class="controls-buttons">
              <button
                class="ctrl-btn btn-auto"
                :class="{ 'btn-active': isAutoRevealing }"
                :disabled="allFlipped"
                @click="isAutoRevealing ? stopAutoReveal() : startAutoReveal()"
              >
                {{ isAutoRevealing ? '⏸ Dừng' : '▶ Auto-Reveal' }}
              </button>

              <button
                class="ctrl-btn btn-reveal"
                :disabled="allFlipped"
                @click="revealAll"
              >
                ✨ Reveal All
              </button>

              <Transition name="collect-appear">
                <button
                  v-if="allFlipped"
                  class="ctrl-btn btn-collect"
                  @click="handleCollect"
                >
                  🎒 Thu thập tất cả
                </button>
              </Transition>
            </div>
          </div>

        </div>
      </Transition>

    </div>
  </Transition>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   OVERLAY BACKDROP
═══════════════════════════════════════════════════════════════════ */
.pack-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #0d1b2a 0%, #000000 100%);
  overflow: hidden;
}

/* Các hạt sáng nền (stars effect) */
.pack-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 70% 30%, rgba(255,255,255,0.3) 0%, transparent 100%),
    radial-gradient(1px 1px at 85% 70%, rgba(255,255,255,0.2) 0%, transparent 100%),
    radial-gradient(1px 1px at 50% 85%, rgba(255,255,255,0.15) 0%, transparent 100%);
  pointer-events: none;
}

/* ═══════════════════════════════════════════════════════════════════
   PHASE 1 — PACK DISPLAY
═══════════════════════════════════════════════════════════════════ */
.pack-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.pack-title {
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
  text-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
}

.pack-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  margin: 0;
}

.pack-wrapper {
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pack-wrapper:hover {
  transform: scale(1.03);
}

/* Animation rung khi click */
.pack-shaking {
  animation: pack-shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes pack-shake {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  10%       { transform: translate(-8px, 0) rotate(-3deg); }
  20%       { transform: translate(8px, 0) rotate(3deg); }
  30%       { transform: translate(-10px, -3px) rotate(-4deg); }
  40%       { transform: translate(10px, 3px) rotate(4deg); }
  50%       { transform: translate(-8px, 0) rotate(-3deg) scale(0.97); }
  60%       { transform: translate(8px, 0) rotate(3deg) scale(0.97); }
  70%       { transform: translate(-5px, 0) rotate(-2deg) scale(0.95); }
  80%       { transform: translate(5px, 0) rotate(2deg) scale(0.95); }
  90%       { transform: translate(0, 0) scale(0.92); }
}

/* Vòng glow xoay quanh pack */
.pack-glow-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: ring-spin 3s linear infinite;
}

.ring-1 {
  width: 240px;
  height: 240px;
  border-top-color: rgba(99, 102, 241, 0.6);
  border-right-color: rgba(168, 85, 247, 0.4);
  animation-duration: 3s;
}

.ring-2 {
  width: 280px;
  height: 280px;
  border-bottom-color: rgba(236, 72, 153, 0.5);
  border-left-color: rgba(59, 130, 246, 0.3);
  animation-duration: 5s;
  animation-direction: reverse;
}

@keyframes ring-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Container ảnh pack */
.pack-image-container {
  position: relative;
  width: 180px;
  height: 250px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.pack-front-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.4));
}

.pack-emoji {
  font-size: 6rem;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5));
  animation: pack-pulse 2s ease-in-out infinite;
}

@keyframes pack-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)); }
  50%       { transform: scale(1.05); filter: drop-shadow(0 0 35px rgba(255, 215, 0, 0.8)); }
}

/* Hiệu ứng ánh sáng quét qua pack */
.pack-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.12) 50%,
    transparent 60%,
    transparent 100%
  );
  animation: shine-sweep 2.5s ease-in-out infinite;
}

@keyframes shine-sweep {
  0%   { transform: translateX(-100%); }
  60%  { transform: translateX(200%); }
  100% { transform: translateX(200%); }
}

.pack-click-hint {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  animation: hint-blink 1.5s ease-in-out infinite;
  margin: 0;
}

.click-icon { margin-right: 4px; }

@keyframes hint-blink {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════════════
   PHASE 2 — CARDS DISPLAY
═══════════════════════════════════════════════════════════════════ */
.cards-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5rem 1.5rem; /* Tăng khoảng cách dọc giữa tiêu đề và grid */
  padding: 1.5rem;
  width: 100%;
  max-height: 100vh;
  overflow-y: auto;
}

.cards-title {
  font-size: 1.75rem;
  font-weight: 900;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin: 0;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

/* Grid 6 thẻ — Sử dụng flex để căn giữa linh hoạt */
.cards-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2.5rem 1.5rem;
  width: 95%;
  max-width: 1600px; /* Giới hạn độ rộng tối đa trên màn siêu rộng */
  margin: 0 auto;
}

.card-slot {
  flex: 0 1 auto;
  /* Thẻ bài tự co giãn từ 150px đến 230px dựa trên chiều rộng màn hình (14vw) */
  width: clamp(150px, 14vw, 230px);
  cursor: pointer;
}


/* ═══════════════════════════════════════════════════════════════════
   CONTROLS PANEL — Góc dưới cùng
═══════════════════════════════════════════════════════════════════ */
.controls-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.controls-hint {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.controls-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.ctrl-btn {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.5rem 1.25rem;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none !important;
}

.ctrl-btn:not(:disabled):hover {
  transform: scale(1.05);
}

.ctrl-btn:not(:disabled):active {
  transform: scale(0.96);
}

/* Auto-Reveal */
.btn-auto {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
}

.btn-auto.btn-active {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
}

/* Reveal All */
.btn-reveal {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #fff;
  box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4);
}

/* Collect */
.btn-collect {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-size: 0.875rem;
  padding: 0.625rem 1.75rem;
  box-shadow:
    0 0 25px rgba(16, 185, 129, 0.5),
    0 4px 15px rgba(5, 150, 105, 0.4);
  animation: collect-pulse 1.5s ease-in-out infinite;
}

@keyframes collect-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(0,0,0,0.3); }
  50%       { box-shadow: 0 0 35px rgba(16, 185, 129, 0.7), 0 4px 12px rgba(0,0,0,0.3); }
}

/* ═══════════════════════════════════════════════════════════════════
   VUE TRANSITION ANIMATIONS (PHASE SWITCHER)
═══════════════════════════════════════════════════════════════════ */

/* Overlay fade in/out */
.overlay-fade-enter-active { transition: opacity 0.3s ease; }
.overlay-fade-leave-active { transition: opacity 0.5s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to    { opacity: 0; }

/* Phase Switch (Mode: Out-In) */
.phase-switch-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.phase-switch-leave-to {
  opacity: 0;
  transform: scale(0.5);
  filter: blur(10px);
}

.phase-switch-enter-active {
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}
.phase-switch-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

/* Nút Collect xuất hiện */
.collect-appear-enter-active {
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}
.collect-appear-enter-from {
  opacity: 0;
  transform: scale(0.7);
}

/* ═══════════════════════════════════════════════════════════════════
   RESPONSIVE — Tablet & Mobile
═══════════════════════════════════════════════════════════════════ */
/* Tablet: Chia thành 2 hàng (mỗi hàng 3 thẻ) */
@media (max-width: 1200px) {
  .cards-grid {
    max-width: 800px; /* Thu hẹp container để ép 3 thẻ/hàng */
    gap: 2rem 1.5rem;
  }
}

@media (max-width: 640px) {
  .card-slot {
    width: 140px;
  }

  .cards-grid {
    gap: 1.5rem 1rem;
  }

  .cards-title {
    font-size: 1.25rem;
  }

  .pack-title {
    font-size: 1.75rem;
  }

  .pack-image-container {
    width: 140px;
    height: 196px;
  }

  .pack-emoji {
    font-size: 4.5rem;
  }

  .ring-1 { width: 180px; height: 180px; }
  .ring-2 { width: 220px; height: 220px; }
}
</style>
