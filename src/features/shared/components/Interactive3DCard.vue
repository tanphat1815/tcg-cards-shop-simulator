<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  imageSrc: string
  isHolo?: boolean
}>()

const cardRef = ref<HTMLElement | null>(null)
const isImageLoaded = ref(false)

function handleMouseMove(e: MouseEvent) {
  if (!cardRef.value) return
  
  const card = cardRef.value
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const width = rect.width
  const height = rect.height
  
  const centerX = width / 2
  const centerY = height / 2
  
  // Calculate rotation (-15 to 15 degrees)
  const rotateX = ((y - centerY) / centerY) * -15
  const rotateY = ((x - centerX) / centerX) * 15
  
  // Calculate glare position (0 to 100%)
  const glareX = (x / width) * 100
  const glareY = (y / height) * 100
  
  // Direct DOM manipulation for performance (NO Vue reactivity trigger)
  card.style.setProperty('--rotate-x', `${rotateX}deg`)
  card.style.setProperty('--rotate-y', `${rotateY}deg`)
  card.style.setProperty('--mouse-x', `${glareX}%`)
  card.style.setProperty('--mouse-y', `${glareY}%`)
  card.style.setProperty('--glare-opacity', '0.6')
  card.style.setProperty('--holo-opacity', '0.5')
}

function handleMouseLeave() {
  if (!cardRef.value) return
  const card = cardRef.value
  
  // Smoothly reset on leave
  card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease'
  card.style.setProperty('--rotate-x', '0deg')
  card.style.setProperty('--rotate-y', '0deg')
  card.style.setProperty('--glare-opacity', '0')
  card.style.setProperty('--holo-opacity', '0')
  
  setTimeout(() => {
    if (card) card.style.transition = ''
  }, 500)
}

function onImageLoad() {
  isImageLoaded.value = true
}
</script>

<template>
  <div 
    class="interactive-card-container"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <div 
      ref="cardRef"
      class="card-3d"
      :class="{ 'is-holo': isHolo }"
    >
      <!-- Loading State -->
      <div v-if="!isImageLoaded" class="card-skeleton">
        <div class="shimmer"></div>
      </div>

      <!-- Card Image -->
      <img 
        :src="imageSrc" 
        @load="onImageLoad"
        class="card-img"
        :class="{ 'is-visible': isImageLoaded }"
        alt="TCG Card Detail"
      />

      <!-- Glare Effect Layer -->
      <div class="glare"></div>

      <!-- Advanced Holo Effect Layer -->
      <div v-if="isHolo" class="holo-effect"></div>
    </div>
  </div>
</template>

<style scoped>
.interactive-card-container {
  perspective: 1000px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair;
}

.card-3d {
  position: relative;
  width: 100%;
  max-width: 450px;
  aspect-ratio: 230 / 322;
  border-radius: 18px;
  background: #1a1a1a;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(0, 0, 0, 0.2);
  
  /* Initial CSS Variables */
  --rotate-x: 0deg;
  --rotate-y: 0deg;
  --mouse-x: 50%;
  --mouse-y: 50%;
  --glare-opacity: 0;
  --holo-opacity: 0;
  
  transform: rotateX(var(--rotate-x)) rotateY(var(--rotate-y));
  transform-style: preserve-3d;
  will-change: transform;
  overflow: hidden; /* Contains glare and holo */
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.5s ease;
  user-select: none;
  pointer-events: none;
}

.card-img.is-visible {
  opacity: 1;
}

/* Glare Effect (Shine) */
.glare {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    farthest-corner circle at var(--mouse-x) var(--mouse-y),
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0) 65%
  );
  opacity: var(--glare-opacity);
  pointer-events: none;
  z-index: 12;
  mix-blend-mode: overlay;
  will-change: background;
}

/* Advanced Holographic Foil Effect */
.holo-effect {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  mix-blend-mode: color-dodge;
  opacity: var(--holo-opacity);
  will-change: background-position, opacity;
  background-image: linear-gradient(
    110deg,
    transparent 20%,
    rgba(255, 219, 112, 0.4) 30%,
    rgba(132, 50, 255, 0.3) 40%,
    rgba(50, 255, 241, 0.3) 50%,
    rgba(255, 50, 152, 0.3) 60%,
    rgba(255, 219, 112, 0.4) 70%,
    transparent 80%
  );
  background-size: 200% 200%;
  background-position: calc(var(--mouse-x) * 1.5) calc(var(--mouse-y) * 1.5);
  filter: brightness(1.2) contrast(1.2);
}

.is-holo {
  box-shadow: 0 0 30px rgba(124, 58, 237, 0.3);
}

/* Skeleton */
.card-skeleton {
  position: absolute;
  inset: 0;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.shimmer {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Mobile UX Fallback */
@media (hover: none) {
  .card-3d {
    --rotate-x: 0deg !important;
    --rotate-y: 0deg !important;
    --glare-opacity: 0 !important;
  }
}
</style>
