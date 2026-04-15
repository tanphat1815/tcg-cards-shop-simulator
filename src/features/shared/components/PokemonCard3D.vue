<script setup lang="ts">
/**
 * POKEMON CARD 3D COMPONENT (SIMEY PORT)
 * Uses high-performance Vanilla JS mouse tracking to drive CSS variables.
 */
import { ref, onMounted, computed } from 'vue';
import { mapRarityToCSS } from '../utils/cardRarityMapper';

interface Props {
  card: any;
  isBack?: boolean;
}

const props = defineProps<Props>();
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
  if (!cardElement.value) return;

  const rect = cardElement.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const px = Math.max(Math.min((100 / rect.width) * x, 100), 0);
  const py = Math.max(Math.min((100 / rect.height) * y, 100), 0);

  // Normalize 0-1
  const pl = px / 100;
  const pt = py / 100;
  
  // Distance from center (0 is center, 1 is edge)
  const p_xc = Math.abs(px - 50);
  const p_yc = Math.abs(py - 50);
  const pc = Math.sqrt(Math.pow(p_xc, 2) + Math.pow(p_yc, 2)) / 50;

  // Rotation angles
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
  if (!cardElement.value) return;
  const st = cardElement.value.style;
  st.setProperty('--pointer-x', '50%');
  st.setProperty('--pointer-y', '50%');
  st.setProperty('--rotate-x', '0deg');
  st.setProperty('--rotate-y', '0deg');
  st.setProperty('--pointer-from-center', '0');
};

onMounted(() => {
  // We can attach to parent or use a wrapper
});

function onImgLoad() {
  isLoaded.value = true;
}
</script>

<template>
  <div 
    ref="cardElement" 
    class="card" 
    :class="[rarityClass, { 'is-back': isBack }]"
    :data-rarity="rarityClass"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <div class="card__translater">
      <div class="card__rotator">
        <div class="card__front">
          <img :src="imageSrc" @load="onImgLoad" alt="Pokemon Card Front" />
          <div class="card__shine"></div>
          <div class="card__glare"></div>
          <div v-if="!isLoaded" class="card__loading">
             <div class="spinner"></div>
          </div>
        </div>
        <div class="card__back">
          <img src="/assets/cards/back.webp" alt="Pokemon Card Back" />
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
  
  width: 320px;
  max-width: 100%;
  position: relative;
  transition: transform 0.1s ease;
  user-select: none;
}

.card.is-back .card__rotator {
  transform: rotateY(180deg);
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

/* Ensure images fill the card containers */
.card__front img, .card__back img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
