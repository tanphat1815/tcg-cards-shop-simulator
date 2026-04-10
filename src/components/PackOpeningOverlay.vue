<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const flipped = ref<boolean[]>([false, false, false, false, false])

// Reset flipped state when a new pack is opened
watch(() => gameStore.isOpeningPack, (newVal) => {
  if (newVal) {
    flipped.value = [false, false, false, false, false]
  }
})

const flipCard = (index: number) => {
  flipped.value[index] = true
}

const allFlipped = () => {
  return flipped.value.length === 5 && flipped.value.every(f => f)
}
</script>

<template>
  <div v-if="gameStore.isOpeningPack" class="absolute top-0 left-0 w-full h-full z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto">
    <h1 class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-16 animate-pulse tracking-widest drop-shadow-lg">
      ⭐ PACK REVEAL ⭐
    </h1>

    <div class="flex gap-6 justify-center flex-wrap max-w-6xl">
      <div 
        v-for="(card, index) in gameStore.currentPack" 
        :key="index"
        class="w-52 h-72 perspective-1000 cursor-pointer group"
        @click="flipCard(index)"
      >
        <div 
          class="relative w-full h-full transition-transform duration-700 transform-style-3d"
          :class="{ 'rotate-y-180': flipped[index] }"
        >
          <!-- Card Back (Úp) -->
          <div class="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-700 via-indigo-800 to-blue-900 rounded-xl border-4 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center group-hover:shadow-[0_0_35px_rgba(79,70,229,0.9)] group-hover:-translate-y-2 transition-all duration-300">
            <div class="w-28 h-28 border-[5px] border-indigo-300/40 rounded-full flex items-center justify-center bg-blue-900/50 shadow-inner">
              <span class="text-5xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">🎴</span>
            </div>
            <!-- Pattern Overlay -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] rounded-lg pointer-events-none"></div>
          </div>

          <!-- Card Front (Ngửa) -->
          <div 
            class="absolute w-full h-full backface-hidden rotate-y-180 rounded-xl p-2.5 flex flex-col justify-between"
            :class="{
              'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 border-gray-400': card.rarity === 'Common',
              'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 border-blue-400 shadow-[0_0_20px_rgba(56,189,248,0.5)]': card.rarity === 'Uncommon',
              'bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 border-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.8)]': card.rarity === 'Rare',
            }"
            style="border-width: 6px;"
          >
            <!-- Header -->
            <div class="flex justify-between items-center bg-black/15 px-2 py-1.5 rounded-t-lg shadow-sm">
              <span class="font-extrabold text-gray-900 truncate pr-2 text-lg drop-shadow-sm" :class="{'text-sm': card.name.length > 8}">{{ card.name }}</span>
              <span class="text-sm font-black text-red-700 bg-white/70 px-1.5 py-0.5 rounded shadow-sm">{{ card.hp }} <span class="text-[10px]">HP</span></span>
            </div>

            <!-- Image Placeholder -->
            <div class="flex-grow my-2 bg-gradient-to-br from-white/60 to-white/20 rounded shadow-inner border border-white/50 flex items-center justify-center overflow-hidden relative">
               <div class="text-6xl drop-shadow-xl transform transition-transform hover:scale-110">
                 {{ card.type === 'Fire' ? '🔥' : card.type === 'Water' ? '💧' : card.type === 'Grass' ? '🍃' : card.type === 'Electric' ? '⚡' : '🔮' }}
               </div>
            </div>

            <!-- Footer / Stats -->
            <div class="bg-black/85 rounded-b-lg p-2.5 text-center border-t border-white/30 shadow-md">
              <div class="text-[11px] uppercase font-bold tracking-widest"
                :class="{
                  'text-gray-400': card.rarity === 'Common',
                  'text-blue-300': card.rarity === 'Uncommon',
                  'text-yellow-400': card.rarity === 'Rare',
                }"
              >
                {{ card.rarity }}
              </div>
              <div class="text-green-400 font-black text-lg mt-1 tracking-wide">${{ card.marketPrice.toFixed(2) }}</div>
            </div>
            
            <!-- Holo Effect Overlay for Rare -->
            <div v-if="card.rarity === 'Rare'" class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent rounded pointer-events-none opacity-50 mix-blend-overlay"></div>
          </div>
        </div>
      </div>
    </div>

    <button 
      v-if="allFlipped()"
      @click="gameStore.closePackOpening()"
      class="mt-16 px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-2xl rounded-full shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all hover:scale-110 active:scale-95 uppercase tracking-widest border-2 border-green-300/50"
    >
      Thu thập bài
    </button>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
.transform-style-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
}
.rotate-y-180 {
  transform: rotateY(180deg);
}
</style>
