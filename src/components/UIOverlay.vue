<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()

const handleOpenPack = () => {
  gameStore.openPack()
}

// Transform the inventory Record into an array for rendering
const inventoryDetails = computed(() => {
  return Object.keys(gameStore.inventory).map(cardId => {
    const cardData = gameStore.allCards.find(c => c.id === cardId)
    return {
      id: cardId,
      name: cardData?.name || 'Unknown',
      quantity: gameStore.inventory[cardId],
      rarity: cardData?.rarity || 'Unknown'
    }
  }).sort((a, b) => b.quantity - a.quantity)
})
</script>

<template>
  <div class="absolute top-0 left-0 p-6 w-full h-full pointer-events-none flex flex-col justify-between z-10 box-border">
    <!-- Top-left: Balance & Stats -->
    <div class="pointer-events-auto bg-gray-900/80 backdrop-blur text-white p-5 rounded-2xl shadow-xl border border-gray-700/50 max-w-sm">
      <h2 class="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-3">Shop Manager</h2>
      <div class="flex items-center justify-between mb-5 bg-gray-800/80 px-4 py-3 rounded-xl border border-gray-700/50">
        <span class="text-sm font-medium text-gray-300">Balance</span>
        <span class="text-2xl font-black text-yellow-500">${{ gameStore.money.toFixed(2) }}</span>
      </div>
      
      <button 
        @click="handleOpenPack" 
        class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5"
      >
        Mở Booster Pack ($10)
      </button>

      <!-- Khách đợi thanh toán -->
      <div v-if="gameStore.waitingCustomers > 0" class="mt-5 bg-orange-900/50 border border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-orange-200 px-4 py-3 rounded-xl animate-pulse flex justify-between items-center">
        <span class="font-bold flex items-center gap-2">⏱ Khách chờ: {{ gameStore.waitingCustomers }}</span>
        <button @click="gameStore.serveCustomer()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-lg">
          Thanh toán
        </button>
      </div>
    </div>

    <!-- Bottom-right: Inventory List -->
    <div class="pointer-events-auto bg-gray-900/80 backdrop-blur text-white p-5 rounded-2xl shadow-xl border border-gray-700/50 max-w-md self-end w-full max-h-[50%] flex flex-col mt-auto">
      <h3 class="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
        <span>📦</span> Thẻ đang có (Inventory)
      </h3>
      
      <div v-if="inventoryDetails.length === 0" class="text-gray-400 italic text-sm text-center py-8">
        Kho đồ trống rỗng. Hãy mua một Pack!
      </div>
      
      <div v-else class="space-y-2 overflow-y-auto pr-2 custom-scroll">
        <div 
          v-for="item in inventoryDetails" :key="item.id"
          class="flex justify-between items-center bg-gray-800/60 p-3 rounded-xl border border-gray-700/30 hover:bg-gray-700/50 transition-colors"
        >
          <div class="flex flex-col">
            <span class="font-bold text-[15px]" :class="{
              'text-gray-300': item.rarity === 'Common',
              'text-blue-400': item.rarity === 'Uncommon',
              'text-yellow-400 font-extrabold': item.rarity === 'Rare',
            }">{{ item.name }}</span>
            <span class="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{{ item.rarity }}</span>
          </div>
          <div class="bg-gray-900 text-gray-200 px-3 py-1 rounded-lg text-sm font-mono border border-gray-700 font-bold">
            x{{ item.quantity }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for better visual */
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.5); 
  border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.8); 
  border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 1); 
}
</style>
