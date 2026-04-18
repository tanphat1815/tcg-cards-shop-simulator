<script setup lang="ts">
/**
 * POKEMON CARD 3D COMPONENT
 * - disableTilt prop: Tắt hiệu ứng 3D/mousemove để bảo vệ FPS trong BattleArena
 * - isHit prop: Trigger animation shake + đỏ khi nhận sát thương
 */
import { ref, computed } from 'vue';
import { mapRarityToCSS } from '../utils/cardRarityMapper';

interface Props {
  card: any;
  isBack?: boolean;
  width?: string | number;
  disableTilt?: boolean;
  isHit?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: '320px',
  disableTilt: false,
  isHit: false,
});

const emit = defineEmits<{
  (e: 'click', card: any): void
  (e: 'contextmenu', card: any): void
}>();

const cardElement = ref<HTMLElement | null>(null);
const isLoaded = ref(false);

const rarityClass = computed(() => mapRarityToCSS(props.card?.rarity));
const imageSrc = computed(() => {
  if (props.card?.image) {
    return `${props.card.image}/high.webp`;
  }
  return '';
});

const handleMouseMove = (e: MouseEvent) => {
  // Nếu disableTilt = true → bỏ qua hoàn toàn để bảo vệ FPS
  if (props.disableTilt || !cardElement.value) return;

  const rect = cardElement.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const px = Math.max(Math.min((100 / rect.width) * x, 100), 0);
  const py = Math.max(Math.min((100 / rect.height) * y, 100), 0);

  const pl = px / 100;
  const pt = py / 100;

  const p_xc = Math.abs(px - 50);
  const p_yc = Math.abs(py - 50);
  const pc = Math.sqrt(Math.pow(p_xc, 2) + Math.pow(p_yc, 2)) / 50;

  const rx = (px - 50) * -0.3;
  const ry = (py - 50) * 0.3;

  const st = cardElement.value.style;
  st.setProperty('--pointer-x', `${px}%`);
  st.setProperty('--pointer-y', `${py}%`);
  st.setProperty('--pointer-from-left', `${pl}`);
  st.setProperty('--pointer-from-top', `${pt}`);
  st.setProperty('--pointer-from-center', `${pc}`);
  st.setProperty('--rotate-x', `${rx}deg`);
  st.setProperty('--rotate-y', `${ry}deg`);
  st.setProperty('--background-x', `${px}%`);
  st.setProperty('--background-y', `${py}%`);
};

const handleMouseLeave = () => {
  if (props.disableTilt || !cardElement.value) return;
  const st = cardElement.value.style;
  st.setProperty('--pointer-x', '50%');
  st.setProperty('--pointer-y', '50%');
  st.setProperty('--rotate-x', '0deg');
  st.setProperty('--rotate-y', '0deg');
  st.setProperty('--pointer-from-center', '0');
};

function onImgLoad() {
  isLoaded.value = true;
}

function handleClick() {
  emit('click', props.card);
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  emit('contextmenu', props.card);
}
</script>

<template>
  <div
    ref="cardElement"
    class="card"
    :class="[
      rarityClass,
      { 'is-back': isBack },
      { 'is-hit': isHit },
      { 'no-tilt': disableTilt }
    ]"
    :style="{ width: typeof props.width === 'number' ? props.width + 'px' : props.width }"
    :data-rarity="rarityClass"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="card__translater">
      <div class="card__rotator">
        <div class="card__front">
          <img :src="imageSrc" @load="onImgLoad" alt="Pokemon Card Front" loading="lazy" />
          <!-- Shine & glare chỉ render khi KHÔNG disableTilt để tiết kiệm GPU -->
          <template v-if="!disableTilt">
            <div class="card__shine"></div>
            <div class="card__glare"></div>
          </template>
          <!-- Hit overlay: đỏ flash khi nhận sát thương -->
          <div v-if="isHit" class="card__hit-overlay"></div>
          <div v-if="!isLoaded" class="card__loading">
            <div class="spinner"></div>
          </div>
        </div>
        <div class="card__back">
          <img src="/assets/cards/back.webp" alt="Pokemon Card Back" loading="lazy" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  --card-scale: 1;
  --rotate-x: 0deg;
  --rotate-y: 0deg;
  --pointer-x: 50%;
  --pointer-y: 50%;
  --pointer-from-center: 0;
  --card-opacity: 1;

  max-width: 100%;
  aspect-ratio: 0.714;
  position: relative;
  transition: transform 0.1s ease;
  user-select: none;
  cursor: pointer;
}

/* Khi disableTilt: tắt toàn bộ 3D transform, giữ card phẳng */
.card.no-tilt .card__rotator {
  transform: none !important;
}

.card.is-back .card__rotator {
  transform: rotateY(180deg);
}

/* Hit animation: shake + filter đỏ */
.card.is-hit {
  animation: card-shake 0.4s ease;
}

.card__hit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(239, 68, 68, 0.45);
  border-radius: 8px;
  pointer-events: none;
  animation: hit-flash 0.4s ease forwards;
  z-index: 20;
}

@keyframes card-shake {
  0%   { transform: translateX(0); }
  15%  { transform: translateX(-6px) rotate(-2deg); }
  30%  { transform: translateX(6px) rotate(2deg); }
  45%  { transform: translateX(-4px) rotate(-1deg); }
  60%  { transform: translateX(4px) rotate(1deg); }
  75%  { transform: translateX(-2px); }
  100% { transform: translateX(0); }
}

@keyframes hit-flash {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}

.card__loading {
  position: absolute;
  inset: 0;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.1);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card__front img, .card__back img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
