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
import { ref, computed, watch, onUnmounted } from 'vue'
import { useInventoryStore } from '../../inventory/store/inventoryStore'

const inventoryStore = useInventoryStore()

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

// ─── Computed ───────────────────────────────────────────────────────────────

/** Danh sách thẻ bài hiện tại (đã được Store sắp xếp: thẻ hiếm nhất ở index 5) */
const cards = computed(() => inventoryStore.currentPack)

/** Phase hiện tại của UI */
const phase = computed(() => inventoryStore.packPhase)

/** Tất cả thẻ đã được lật chưa */
const allFlipped = computed(() => {
  const count = cards.value.length
  return count > 0 && flipped.value.length === count && flipped.value.every(Boolean)
})

/** Đang hiển thị overlay không */
const isVisible = computed(() => inventoryStore.isOpeningPack)

// ─── Watch: Reset state khi pack mới được mở ────────────────────────────────
watch(
  () => inventoryStore.isOpeningPack,
  (newVal) => {
    if (newVal) {
      // Reset toàn bộ UI state khi bắt đầu mở pack mới
      const count = cards.value.length || 0
      flipped.value = new Array(count).fill(false)
      imageLoaded.value = new Array(count).fill(false)
      isPackShaking.value = false
      stopAutoReveal()
    }
  }
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

// ─── Helper: Xác định thẻ hiếm (để áp dụng Holo effect) ───────────────────
const HIGH_RARITY_LIST = [
  'Rare', 'Double Rare', 'Ultra Rare', 'Secret Rare',
  'Illustration Rare', 'Special Illustration Rare',
  'Hyper Secret Rare', 'Mega Secret Rare', 'Ghost Rare'
]

function isHighRarity(card: any): boolean {
  return HIGH_RARITY_LIST.includes(card?.rarity)
}

/**
 * Trả về tên rarity để hiển thị trong badge
 */
function getRarityBadge(card: any): { label: string; cssClass: string } {
  const rarity = card?.rarity || 'Common'
  if (['Ghost Rare', 'Hyper Secret Rare', 'Mega Secret Rare'].includes(rarity)) {
    return { label: rarity, cssClass: 'rarity-ghost' }
  }
  if (['Special Illustration Rare', 'Secret Rare', 'Ultra Rare'].includes(rarity)) {
    return { label: rarity, cssClass: 'rarity-ultra' }
  }
  if (['Illustration Rare', 'Double Rare', 'Rare'].includes(rarity)) {
    return { label: rarity, cssClass: 'rarity-rare' }
  }
  if (rarity === 'Uncommon') {
    return { label: 'Uncommon', cssClass: 'rarity-uncommon' }
  }
  return { label: 'Common', cssClass: 'rarity-common' }
}

/**
 * Lấy market price của thẻ để hiển thị Price Tag
 */
function getMarketPrice(card: any): string {
  if (!card?.pricing) return 'N/A'

  // List các trường giá có thể có theo thứ tự ưu tiên
  const p = card.pricing.tcgplayer || card.pricing.cardmarket
  if (!p) return 'N/A'

  // Tìm giá thủ công trong các mục phổ biến của TCGplayer
  const tcg = card.pricing.tcgplayer
  if (tcg) {
    const categories = ['normal', 'holofoil', 'reverse', 'reverse-holofoil', 'unlimited', 'unlimited-holofoil']
    for (const cat of categories) {
      if (tcg[cat]?.marketPrice) return `$${tcg[cat].marketPrice.toFixed(2)}`
      if (tcg[cat]?.midPrice) return `$${tcg[cat].midPrice.toFixed(2)}`
    }
  }

  // Fallback sang Cardmarket
  const cm = card.pricing.cardmarket
  if (cm) {
    const val = cm.avg || cm.trend || cm.avg1 || cm.avg7
    if (val) return `$${val.toFixed(2)}`
  }

  return 'N/A'
}

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
              <div class="pack-emoji">🎴</div>
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
              <div
                class="card-3d-container"
                :class="{
                  'is-flipped': flipped[index],
                  'is-holo': isHighRarity(card) && flipped[index],
                  'is-hoverable': flipped[index]
                }"
              >
                <div class="card-face card-back">
                  <div class="card-back-pattern">
                    <div class="card-back-logo">🎴</div>
                    <div class="card-back-lines"></div>
                  </div>
                  <div class="flip-hint" v-if="!flipped[index]">Click để lật</div>
                </div>

                <div class="card-face card-front">
                  <div class="price-tag">
                    {{ getMarketPrice(card) }}
                  </div>

                  <!-- Spinner khi chưa tải xong ảnh -->
                  <div v-if="card.image && !imageLoaded[index]" class="card-loader">
                    <div class="spinner"></div>
                    <span class="loader-text">Loading...</span>
                  </div>

                  <img
                    v-if="card.image"
                    :src="`${card.image}/high.webp`"
                    :alt="card.name"
                    class="card-image"
                    :class="{ 'img-hidden': !imageLoaded[index] }"
                    loading="lazy"
                    @load="imageLoaded[index] = true"
                  />
                  <div v-else class="card-no-image">
                    <span class="card-no-image-name">{{ card.name }}</span>
                  </div>

                  <div
                    v-if="card.rarity !== 'Common'"
                    class="rarity-badge"
                    :class="getRarityBadge(card).cssClass"
                  >
                    {{ getRarityBadge(card).label }}
                  </div>

                  <div v-if="isHighRarity(card)" class="holo-overlay"></div>
                </div>
              </div>
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
  background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #2d1b69 100%);
  border-radius: 16px;
  border: 2px solid rgba(99, 102, 241, 0.5);
  box-shadow:
    0 0 40px rgba(99, 102, 241, 0.4),
    0 0 80px rgba(168, 85, 247, 0.2),
    inset 0 0 30px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
   3D CARD FLIP SYSTEM
═══════════════════════════════════════════════════════════════════ */
.card-3d-container {
  position: relative;
  width: 100%; /* Ăn theo card-slot */
  aspect-ratio: 230 / 322; /* Duy trì tỷ lệ chuẩn */
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
}

/* Lật 180 độ khi đã flipped */
.card-3d-container.is-flipped {
  transform: rotateY(180deg);
}

/* Scale khi hover (chỉ áp dụng sau khi lật) */
.card-3d-container.is-hoverable:hover {
  transform: rotateY(180deg) scale(1.08);
  z-index: 10;
}

/* Hai mặt bài đều dùng cùng kỹ thuật */
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
}

/* ─── MẶT SAU (Lưng bài) ─────────────────────────────────────── */
.card-back {
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1565c0 100%);
  border: 2px solid rgba(100, 150, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.5rem;
}

.card-back-pattern {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem;
}

.card-back-logo {
  font-size: 3rem;
  filter: brightness(0.8);
}

.card-back-lines {
  width: 70%;
  height: 2px;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
  box-shadow:
    0 -6px 0 rgba(255,255,255,0.1),
    0  6px 0 rgba(255,255,255,0.1);
}

.flip-hint {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

/* ─── MẶT TRƯỚC (Ảnh thật) ──────────────────────────────────── */
.card-front {
  transform: rotateY(180deg);
  background: #111;
  border: 2px solid rgba(255, 255, 255, 0.1);
  overflow: visible; /* ĐỂ HIỆN PRICE TAG Ở TRÊN */
}

/* Ảnh thẻ bài chiếm toàn bộ mặt trước */
.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Fallback khi không có ảnh */
.card-no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2d1b69, #1e3a5f);
  padding: 0.5rem;
  text-align: center;
}

.card-no-image-name {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: bold;
}

/* ─── PRICE TAG ──────────────────────────────────────────────── */
.price-tag {
  position: absolute;
  top: -18px; /* Đẩy lên cao hơn để không đè vào đầu card */
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 900;
  padding: 4px 14px;
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 4px 15px rgba(5, 150, 105, 0.6),
    0 0 20px rgba(16, 185, 129, 0.3);
  white-space: nowrap;
  letter-spacing: 0.05em;
  pointer-events: none;
}

/* ─── RARITY BADGE ───────────────────────────────────────────── */
.rarity-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 3px 6px;
  font-size: 0.55rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.rarity-common   { background: rgba(100, 100, 100, 0.85); color: #d1d5db; }
.rarity-uncommon { background: rgba(59, 130, 246, 0.85);  color: #bfdbfe; }
.rarity-rare     { background: rgba(234, 179, 8, 0.9);    color: #fff; }
.rarity-ultra    { background: rgba(168, 85, 247, 0.9);   color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.5); }
.rarity-ghost    { background: linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4); color: #fff; }

/* ─── HOLOGRAPHIC OVERLAY (thẻ Rare trở lên) ────────────────── */
.holo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    125deg,
    transparent 0%,
    rgba(255, 0, 128, 0.15)  15%,
    rgba(255, 165, 0, 0.15)  30%,
    rgba(255, 255, 0, 0.15)  45%,
    rgba(0, 255, 128, 0.15)  60%,
    rgba(0, 128, 255, 0.15)  75%,
    rgba(128, 0, 255, 0.15)  90%,
    transparent 100%
  );
  mix-blend-mode: color-dodge;
  border-radius: 8px;
  pointer-events: none;
  animation: holo-shift 4s ease-in-out infinite alternate;
}

@keyframes holo-shift {
  0%   { background-position: 0% 50%; opacity: 0.6; }
  50%  { opacity: 1; }
  100% { background-position: 100% 50%; opacity: 0.7; }
}

/* ─── HIỆU ỨNG LOADING Thẻ Bài ───────────────────────────────── */
.card-loader {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(13, 27, 42, 0.9);
  backdrop-filter: blur(4px);
  z-index: 5;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 215, 0, 0.1);
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

.loader-text {
  font-size: 0.7rem;
  color: #ffd700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  opacity: 0.8;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.4s ease;
  z-index: 1;
}

.img-hidden {
  opacity: 0;
}

/* Ánh sáng thêm cho thẻ holo */
.is-holo .card-front {
  box-shadow:
    0 0 20px rgba(168, 85, 247, 0.4),
    0 0 40px rgba(99, 102, 241, 0.3),
    0 8px 25px rgba(0, 0, 0, 0.6);
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
