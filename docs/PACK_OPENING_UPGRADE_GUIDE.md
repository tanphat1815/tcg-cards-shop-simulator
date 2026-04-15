# PACK_OPENING_UPGRADE_GUIDE.md
## Hướng dẫn Nâng cấp Tính năng Mở Pack (Gacha Unboxing)

**Phiên bản:** 1.0  
**Ngày soạn:** 2026-04-14  
**Mục tiêu:** Nâng cấp toàn diện `PackOpeningOverlay.vue` và các Store liên quan để tạo trải nghiệm Gacha rực rỡ, đúng chuẩn TCG.

---

## ⚠️ NGUYÊN TẮC BẮT BUỘC TRƯỚC KHI BẮT ĐẦU

1. **Logic → Store, UI → Component**: Mọi tính toán, xử lý dữ liệu API, sắp xếp thứ tự thẻ bài phải nằm trong Pinia Store. Component chỉ nhận dữ liệu và render.
2. **KHÔNG xóa file cũ ngay**: Tạo bản mới, test pass rồi mới thay thế.
3. **Chạy `npm run build` sau mỗi bước lớn** để kiểm tra lỗi TypeScript.

---

## 📁 DANH SÁCH FILE CẦN THAY ĐỔI

| File | Hành động | Mức độ thay đổi |
|------|-----------|-----------------|
| `src/features/inventory/store/inventoryStore.ts` | Sửa | Trung bình |
| `src/features/shop-ui/components/PackOpeningOverlay.vue` | Viết lại hoàn toàn | Lớn |

> **Không cần tạo file mới**, không cần sửa bất kỳ file nào khác.

---

## BƯỚC 1: Sửa `inventoryStore.ts`

**Vị trí file:** `src/features/inventory/store/inventoryStore.ts`

### 1.1 Sửa State — Thêm trường `packPhase`

Tìm khối `state: () => ({` và **thêm** dòng sau vào cuối khối state (trước dấu `}`):

```typescript
// Thêm vào sau dòng `lastPackPulled: [] as any[]`

/** Phase của UI mở pack: 'idle' | 'pack_visible' | 'cards_visible' */
packPhase: 'idle' as 'idle' | 'pack_visible' | 'cards_visible',

/** ID của pack đang được hiển thị (để lấy ảnh booster) */
currentPackId: null as string | null,
```

### 1.2 Sửa Action `tearPack` — Lưu đầy đủ dữ liệu card + sắp xếp thứ tự Gacha

Tìm hàm `async tearPack(packId: string)` và **thay thế toàn bộ hàm** bằng code sau:

```typescript
async tearPack(packId: string) {
  const statsStore = useStatsStore()
  const apiStore = useApiStore()

  if (!this.shopInventory[packId] || this.shopInventory[packId] <= 0) return

  const packItem = apiStore.shopItems[packId]
  if (!packItem) {
    console.error(`Pack item not found: ${packId}`)
    return
  }

  const setId = packItem.sourceSetId || packId.replace('pack_', '')

  // Lấy 6 thẻ ngẫu nhiên có trọng số từ API
  const randomCardsResult = await apiStore.getWeightedRandomCardsFromSet(setId, 6)

  if (!randomCardsResult || randomCardsResult.length === 0) {
    console.error('Failed to get random cards from set:', setId)
    return
  }

  // --- RARITY SORT: Đảm bảo thẻ hiếm nhất luôn ở VỊ TRÍ CUỐI (index 5) ---
  const RARITY_RANK: Record<string, number> = {
    'Ghost Rare': 7,
    'Hyper Secret Rare': 6,
    'Mega Secret Rare': 6,
    'Special Illustration Rare': 5,
    'Illustration Rare': 4,
    'Secret Rare': 3,
    'Ultra Rare': 3,
    'Double Rare': 2,
    'Rare': 2,
    'Uncommon': 1,
    'Common': 0,
    'None': 0,
  }

  const getRarityRank = (card: any): number => {
    return RARITY_RANK[card.rarity] ?? 0
  }

  // Tách thẻ hiếm nhất ra, đặt ở cuối
  let sortedCards = [...randomCardsResult]
  sortedCards.sort((a, b) => getRarityRank(a) - getRarityRank(b))
  // index 0-4: thẻ thường, index 5: thẻ hiếm nhất

  // Trừ kho hàng
  this.shopInventory[packId]--
  if (this.shopInventory[packId] === 0) delete this.shopInventory[packId]

  // --- LƯU ĐẦY ĐỦ dữ liệu vào personalBinder ---
  // personalBinder lưu dạng: { cardId: { quantity, cardData } }
  // Thay đổi cấu trúc: lưu cả object card để dùng cho Battle sau này
  for (const card of sortedCards) {
    if (!this.personalBinder[card.id]) {
      this.personalBinder[card.id] = 0
    }
    this.personalBinder[card.id]++

    // Thưởng XP
    const rank = getRarityRank(card)
    if (rank >= 2) {
      statsStore.gainExp(XP_REWARDS.OPEN_PACK_RARE)
    } else {
      statsStore.gainExp(XP_REWARDS.OPEN_PACK_COMMON)
    }
  }

  // Cập nhật state để UI render
  this.lastPackPulled = sortedCards
  this.currentPack = sortedCards
  this.currentPackId = packId
  this.isOpeningPack = true
  this.packPhase = 'pack_visible' // Phase 1: Hiển thị ảnh Pack
},
```

### 1.3 Thêm Action `revealCards` — Chuyển từ Phase 1 sang Phase 2

Tìm action `closePackOpening()` và **thêm action mới ngay phía trước nó**:

```typescript
/**
 * Chuyển từ Phase 1 (Hiện Pack) sang Phase 2 (Hiện thẻ úp mặt)
 * Được gọi khi người dùng click vào ảnh Pack
 */
revealCards() {
  this.packPhase = 'cards_visible'
},
```

### 1.4 Sửa Action `closePackOpening` — Reset `packPhase` và `currentPackId`

Tìm hàm `closePackOpening()` và **thay thế toàn bộ** bằng:

```typescript
closePackOpening() {
  this.isOpeningPack = false
  this.currentPack = []
  this.packPhase = 'idle'
  this.currentPackId = null

  const gameStore = useGameStore()
  gameStore.saveGame()
},
```

---

## BƯỚC 2: Viết lại hoàn toàn `PackOpeningOverlay.vue`

**Vị trí file:** `src/features/shop-ui/components/PackOpeningOverlay.vue`

**Thay thế TOÀN BỘ nội dung file** bằng code dưới đây:

```vue
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

// ─── Computed ───────────────────────────────────────────────────────────────

/** Danh sách thẻ bài hiện tại (đã được Store sắp xếp: thẻ hiếm nhất ở index 5) */
const cards = computed(() => inventoryStore.currentPack)

/** Phase hiện tại của UI */
const phase = computed(() => inventoryStore.packPhase)

/** Tất cả thẻ đã được lật chưa */
const allFlipped = computed(() => flipped.value.length === 6 && flipped.value.every(Boolean))

/** Đang hiển thị overlay không */
const isVisible = computed(() => inventoryStore.isOpeningPack)

// ─── Watch: Reset state khi pack mới được mở ────────────────────────────────
watch(
  () => inventoryStore.isOpeningPack,
  (newVal) => {
    if (newVal) {
      // Reset toàn bộ UI state khi bắt đầu mở pack mới
      flipped.value = new Array(6).fill(false)
      isPackShaking.value = false
      stopAutoReveal()
    }
  }
)

// ─── PHASE 1: Xử lý click vào Pack ─────────────────────────────────────────

/**
 * Người dùng click vào ảnh Pack:
 * 1. Preload 6 ảnh thẻ bài vào cache trình duyệt
 * 2. Chạy animation rung
 * 3. Chuyển sang Phase 2
 */
async function handlePackClick() {
  if (isPackShaking.value || phase.value !== 'pack_visible') return

  // Preload ảnh ngầm để tránh chớp trắng khi lật
  await preloadCardImages()

  // Animation rung pack
  isPackShaking.value = true
  playTearSound()

  // Sau 600ms (thời gian animation rung), chuyển Phase
  setTimeout(() => {
    isPackShaking.value = false
    inventoryStore.revealCards()
  }, 600)
}

/**
 * Tải sẵn 6 ảnh thẻ bài vào cache trình duyệt.
 * Dùng Promise.all để tải song song, đảm bảo không bị chớp ảnh khi lật.
 */
async function preloadCardImages(): Promise<void> {
  const imageUrls = cards.value
    .map(card => card.image ? `${card.image}/low.webp` : null)
    .filter(Boolean) as string[]

  await Promise.all(
    imageUrls.map(
      url =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve() // Không block nếu ảnh lỗi
          img.src = url
        })
    )
  )
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
  flipped.value = new Array(6).fill(true)
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
 * Lấy URL ảnh booster pack để hiển thị ở Phase 1.
 * Hiện tại dùng emoji fallback, có thể thay bằng ảnh thực từ API sau.
 */
function getPackImageUrl(): string | null {
  // TCGdex không trả ảnh pack trực tiếp, dùng placeholder
  return null
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
  const price = card?.pricing?.tcgplayer?.normal?.marketPrice
    ?? card?.pricing?.cardmarket?.avg
    ?? null
  if (!price) return 'N/A'
  return `$${price.toFixed(2)}`
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
           PHASE 1: Hiển thị ảnh Pack lớn (packPhase = 'pack_visible')
      ═══════════════════════════════════════════════════════════ -->
      <Transition name="pack-disappear">
        <div
          v-if="phase === 'pack_visible'"
          class="pack-phase"
        >
          <h2 class="pack-title">Mở Pack Thẻ Bài!</h2>
          <p class="pack-subtitle">Click vào pack để xé</p>

          <!-- Ảnh Pack lớn -->
          <div
            class="pack-wrapper"
            :class="{ 'pack-shaking': isPackShaking }"
            @click="handlePackClick"
          >
            <!-- Glow rings bên ngoài pack -->
            <div class="pack-glow-ring ring-1"></div>
            <div class="pack-glow-ring ring-2"></div>

            <!-- Ảnh Pack (emoji fallback vì TCGdex không có ảnh pack) -->
            <div class="pack-image-container">
              <div class="pack-emoji">🎴</div>
              <div class="pack-shine"></div>
            </div>
          </div>

          <p class="pack-click-hint">
            <span class="click-icon">👆</span> Click để xé
          </p>
        </div>
      </Transition>

      <!-- ═══════════════════════════════════════════════════════════
           PHASE 2: Hiển thị 6 lá bài (packPhase = 'cards_visible')
      ═══════════════════════════════════════════════════════════ -->
      <Transition name="cards-appear">
        <div
          v-if="phase === 'cards_visible'"
          class="cards-phase"
        >
          <!-- Title -->
          <h2 class="cards-title">⭐ Kết quả mở Pack ⭐</h2>

          <!-- Lưới 6 thẻ bài — dùng flex-wrap để responsive -->
          <div class="cards-grid">
            <div
              v-for="(card, index) in cards"
              :key="index"
              class="card-slot"
              @click="flipCard(index)"
            >
              <!-- Container 3D -->
              <div
                class="card-3d-container"
                :class="{
                  'is-flipped': flipped[index],
                  'is-holo': isHighRarity(card) && flipped[index],
                  'is-hoverable': flipped[index]
                }"
              >
                <!-- MẶT SAU (Lưng bài — hiển thị khi chưa lật) -->
                <div class="card-face card-back">
                  <div class="card-back-pattern">
                    <div class="card-back-logo">🎴</div>
                    <div class="card-back-lines"></div>
                  </div>
                  <div class="flip-hint" v-if="!flipped[index]">Click để lật</div>
                </div>

                <!-- MẶT TRƯỚC (Ảnh thật — hiển thị sau khi lật) -->
                <div class="card-face card-front">
                  <!-- Price Tag nổi lên trên ảnh -->
                  <div class="price-tag">
                    {{ getMarketPrice(card) }}
                  </div>

                  <!-- Ảnh thẻ bài từ API (toàn bộ thẻ, không cần text bổ sung) -->
                  <img
                    v-if="card.image"
                    :src="`${card.image}/low.webp`"
                    :alt="card.name"
                    class="card-image"
                    loading="eager"
                  />
                  <!-- Fallback nếu không có ảnh -->
                  <div v-else class="card-no-image">
                    <span class="card-no-image-name">{{ card.name }}</span>
                  </div>

                  <!-- Rarity Badge -->
                  <div
                    class="rarity-badge"
                    :class="getRarityBadge(card).cssClass"
                  >
                    {{ getRarityBadge(card).label }}
                  </div>

                  <!-- Holographic overlay (chỉ hiện với thẻ hiếm) -->
                  <div v-if="isHighRarity(card)" class="holo-overlay"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Controls UI — Góc dưới phải ──────────────────── -->
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

              <!-- Nút Collect: chỉ hiện khi tất cả đã lật -->
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
  gap: 1.5rem;
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

/* Grid 6 thẻ — flex-wrap để tự động xuống dòng khi màn nhỏ */
.cards-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  max-width: 900px;
  width: 100%;
}

.card-slot {
  flex: 0 0 auto;
  width: 130px;
  cursor: pointer;
}

/* ═══════════════════════════════════════════════════════════════════
   3D CARD FLIP SYSTEM
═══════════════════════════════════════════════════════════════════ */
.card-3d-container {
  position: relative;
  width: 130px;
  height: 182px;   /* Tỷ lệ chuẩn thẻ Pokemon: 2.5 x 3.5 inch ≈ 1:1.4 */
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
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
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 900;
  padding: 3px 10px;
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 4px 12px rgba(5, 150, 105, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1);
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
   VUE TRANSITION ANIMATIONS
═══════════════════════════════════════════════════════════════════ */

/* Overlay fade in/out */
.overlay-fade-enter-active { transition: opacity 0.3s ease; }
.overlay-fade-leave-active { transition: opacity 0.5s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to    { opacity: 0; }

/* Pack biến mất */
.pack-disappear-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.pack-disappear-leave-to {
  opacity: 0;
  transform: scale(0.5);
  filter: blur(10px);
}

/* Cards xuất hiện */
.cards-appear-enter-active {
  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}
.cards-appear-enter-from {
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
   RESPONSIVE — Màn hình nhỏ
═══════════════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .card-slot {
    width: 100px;
  }

  .card-3d-container {
    width: 100px;
    height: 140px;
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
```

---

## BƯỚC 3: Kiểm tra TypeScript Errors

Sau khi viết xong, chạy:

```bash
npm run build
```

Nếu có lỗi TypeScript về `packPhase` hoặc `currentPackId` không tồn tại trong state, kiểm tra lại **Bước 1.1** — đảm bảo đã thêm đúng 2 dòng vào state.

---

## BƯỚC 4: Test thủ công

Chạy `npm run dev` và kiểm tra các trường hợp sau:

```
[ ] Mở game → Nhập hàng → Mua ít nhất 1 Pack từ Online Shop
[ ] Ở UIOverlay: Click nút "Mở Pack" → Overlay xuất hiện với ảnh Pack lớn
[ ] Phase 1: Click vào Pack → Có animation rung → Chuyển sang Phase 2
[ ] Phase 2: Thấy 6 lá bài đang úp mặt
[ ] Click từng lá → Lật 3D mượt mà → Hiện ảnh thẻ từ API
[ ] Ảnh thẻ KHÔNG bị chớp/trắng (nhờ preload)
[ ] Thẻ hiếm (Rarity ≥ Rare): có hiệu ứng holo lấp lánh
[ ] Thẻ thứ 6 (index 5) luôn là thẻ hiếm nhất
[ ] Price Tag màu xanh lá hiển thị đúng marketPrice
[ ] Nút Auto-Reveal: Lật lần lượt từng thẻ 0.5s/thẻ
[ ] Nút Reveal All: Lật cùng lúc tất cả
[ ] Nút Collect: Chỉ xuất hiện khi đủ 6 lá đã lật, click đóng overlay
[ ] Hover vào thẻ đã lật: Scale lên 1.08x
[ ] Màn hình nhỏ (640px): 6 thẻ tự xuống 2 hàng, không bị méo
```

---

## TỔNG KẾT CÁC THAY ĐỔI

### `inventoryStore.ts` — Tóm tắt:
- **Thêm state**: `packPhase`, `currentPackId`
- **Sửa action `tearPack`**: Thêm logic sắp xếp thẻ hiếm nhất về cuối (index 5), lưu đầy đủ vào binder, set `packPhase = 'pack_visible'`
- **Thêm action `revealCards`**: Chuyển `packPhase = 'cards_visible'`
- **Sửa action `closePackOpening`**: Reset `packPhase` và `currentPackId`

### `PackOpeningOverlay.vue` — Tóm tắt:
- Viết lại hoàn toàn với 2-phase UX flow
- Phase 1: Ảnh Pack lớn + animation ring glow + click để xé
- Phase 2: 6 thẻ úp mặt + hệ thống lật 3D CSS
- Holographic overlay cho thẻ hiếm
- Price Tag xanh lá nổi trên mỗi thẻ
- Hệ thống controls: Auto-Reveal / Reveal All / Collect
- Preload ảnh trước khi chuyển phase
- Responsive với `flex-wrap`
- Âm thanh (Web Audio API)

---

*Hướng dẫn này được thiết kế để AI Agent thực hiện tuần tự từng bước mà không bỏ sót.*