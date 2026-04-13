<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useInventoryStore } from '../stores/modules/inventoryStore'
import { useApiStore } from '../stores/modules/apiStore'
import EnhancedButton from './shared/EnhancedButton.vue'

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const apiStore = useApiStore()

const binderItems = computed(() => {
  return Object.keys(inventoryStore.personalBinder).map(cardId => {
    // Tìm card từ tất cả sets đã load
    let cardData = null
    for (const setCards of Object.values(apiStore.setCardsCache)) {
      cardData = setCards.find((c: any) => c.id === cardId)
      if (cardData) break
    }
    return {
      id: cardId,
      card: cardData,
      quantity: inventoryStore.personalBinder[cardId]
    }
  })
})

// Tự động load những card còn thiếu thông tin
const loadMissingCards = () => {
  if (!gameStore.showBinderMenu) return
  
  binderItems.value.forEach(item => {
    if (!item.card) {
      apiStore.ensureCardInCache(item.id)
    }
  })
}

watch(() => gameStore.showBinderMenu, (show) => {
  if (show) loadMissingCards()
})

onMounted(() => {
  if (gameStore.showBinderMenu) loadMissingCards()
})
</script>

<template>
  <div v-if="gameStore.showBinderMenu" class="absolute inset-0 z-[150] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto p-8">
    
    <!-- Header -->
    <div class="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-indigo-900 pb-4">
      <h2 class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 tracking-widest drop-shadow-sm flex items-center gap-4">
        <span>📔</span> PERSONAL BINDER
      </h2>
      <EnhancedButton
        variant="icon"
        size="sm"
        :icon="{ name: 'close' }"
        defaultText=""
        @click="gameStore.setShowBinderMenu(false)"
      />
    </div>

    <!-- Grid -->
    <div class="w-full max-w-6xl flex-grow overflow-y-auto custom-scroll pr-4 bg-gray-900/40 p-6 rounded-3xl border border-indigo-900/50 shadow-inner">
      <div v-if="binderItems.length === 0" class="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <span class="text-6xl mb-4 opacity-50">🪹</span>
        <p class="text-xl">Sổ siêu tầm hiện đang trống.</p>
        <p class="text-sm mt-2">Hãy mở Pack và cất những quân bài quý giá nhất vào đây!</p>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        <template v-for="item in binderItems" :key="item.id">
          <!-- Card Display -->
          <div 
            v-if="item.card"
            class="relative w-full h-64 mx-auto rounded-xl p-2 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(79,70,229,0.4)]"
          :class="{
            'bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 border-gray-400': item.card!.rarity === 'Common' || item.card!.rarity === 'None',
            'bg-gradient-to-br from-blue-200 via-blue-400 to-cyan-500 border-blue-400 shadow-[0_0_20px_rgba(56,189,248,0.5)]': item.card!.rarity === 'Uncommon',
            'bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 border-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.8)]': item.card!.rarity === 'Rare' || item.card!.rarity === 'Ultra Rare' || item.card!.rarity === 'Secret Rare',
          }"
          style="border-width: 4px;"
        >
          <!-- Header -->
          <div class="flex justify-between items-center bg-black/15 px-2 py-1.5 rounded-t shadow-sm">
            <span class="font-bold text-gray-900 truncate pr-2 text-sm drop-shadow-sm">{{ item.card!.name }}</span>
            <span class="text-xs font-black text-red-700 bg-white/70 px-1 py-0.5 rounded shadow-sm">{{ item.card!.hp }} <span class="text-[8px]">HP</span></span>
          </div>

          <!-- Image -->
          <div class="flex-grow my-1.5 bg-gradient-to-br from-white/60 to-white/20 rounded-sm shadow-inner border border-white/50 flex items-center justify-center overflow-hidden">
            <img 
              v-if="item.card!.image" 
              :src="item.card!.image + '/low.webp'" 
              :alt="item.card!.name" 
              class="w-full h-full object-cover rounded"
            />
            <div v-else class="text-5xl drop-shadow-xl text-center leading-none">
              {{ item.card!.types?.[0] === 'Fire' ? '🔥' : item.card!.types?.[0] === 'Water' ? '💧' : item.card!.types?.[0] === 'Grass' ? '🍃' : item.card!.types?.[0] === 'Electric' ? '⚡' : '🔮' }}
            </div>
          </div>

          <!-- Footer / Stats -->
          <div class="bg-black/85 rounded-b p-1.5 text-center border-t border-white/30">
            <div class="text-[10px] uppercase font-bold tracking-widest"
              :class="{
                'text-gray-400': item.card!.rarity === 'Common' || item.card!.rarity === 'None',
                'text-blue-300': item.card!.rarity === 'Uncommon',
                'text-yellow-400': item.card!.rarity === 'Rare',
              }"
            >
              {{ item.card!.rarity }}
            </div>
            <div class="text-green-400 font-black text-sm mt-0.5 tracking-wide">${{ item.card!.pricing?.tcgplayer?.normal?.marketPrice?.toFixed(2) || 'N/A' }}</div>
          </div>

          <!-- Quantity Badge -->
          <div class="absolute -top-3 -right-3 bg-red-600 text-white font-black px-2.5 py-1 rounded-full shadow-lg border-2 border-white text-sm z-10">
            x{{ item.quantity }}
          </div>

          <!-- Tooltip / Action Overlay -->
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm rounded flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <div class="text-white font-bold text-sm">Chỉ trưng bày</div>
          </div>
          
          <!-- Holo Effect Overlay for Rare -->
          <div v-if="item.card!.rarity === 'Rare' || item.card!.rarity === 'Ultra Rare' || item.card!.rarity === 'Secret Rare'" class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent rounded opacity-50 mix-blend-overlay pointer-events-none"></div>
          </div>

          <!-- Loading Placeholder for missing card data -->
          <div v-else class="relative w-full h-64 mx-auto border-4 border-dashed border-indigo-900/40 rounded-xl flex items-center justify-center bg-gray-800/20 animate-pulse">
            <div class="flex flex-col items-center gap-2">
              <span class="text-3xl grayscale opacity-30">🎴</span>
              <span class="text-[10px] font-bold text-gray-600 uppercase">Loading Data...</span>
            </div>
            <!-- Quantity Badge still visible -->
            <div class="absolute -top-3 -right-3 bg-gray-700 text-white font-black px-2.5 py-1 rounded-full shadow-lg border-2 border-gray-600 text-sm z-10">
              x{{ item.quantity }}
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 8px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: rgba(17, 24, 39, 0.5); 
  border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.6); 
  border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.9); 
}
</style>
