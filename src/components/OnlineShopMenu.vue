<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { STOCK_ITEMS, FURNITURE_ITEMS } from '../config/shopData'

const gameStore = useGameStore()
const activeTab = ref<'STOCK' | 'FURNITURE'>('STOCK')

const purchaseStock = (id: string, price: number) => {
  if (gameStore.money < price) {
    alert("Không đủ tiền mua hàng!")
    return
  }
  const success = gameStore.buyStock(id, 1)
  if (success) {
    // Play cha-ching sound or visual feedback (can be improved later)
  }
}

const purchaseFurniture = (id: string, price: number) => {
  if (gameStore.money < price) {
    alert("Không đủ tiền sắm nội thất!")
    return
  }
  const success = gameStore.buyFurniture(id)
  if (success) {
    // Play cha-ching
  }
}
</script>

<template>
  <div v-if="gameStore.showOnlineShop" class="absolute inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
    <div class="bg-white rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden font-sans">
      
      <!-- Browser Header Toolbar -->
      <div class="bg-gray-200 border-b border-gray-300 px-4 py-3 flex items-center gap-3">
        <div class="flex gap-2">
          <div class="w-3 h-3 rounded-full bg-red-400"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div class="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div class="flex-grow flex justify-center">
          <div class="bg-white cursor-pointer px-4 py-1.5 rounded-md text-sm text-gray-500 w-2/3 max-w-lg text-center shadow-inner border border-gray-200 flex items-center justify-center gap-2">
            <span>🔒</span> https://tcg-distributor.market.com
          </div>
        </div>
        <button @click="gameStore.showOnlineShop = false" class="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- E-commerce Header -->
      <div class="bg-indigo-600 text-white px-8 py-5 flex justify-between items-center shadow-md z-10 relative">
        <div>
          <h1 class="text-3xl font-black italic tracking-tighter shadow-black drop-shadow-sm">TCG DISTRIBUTOR HUB</h1>
          <p class="text-indigo-200 text-sm font-medium">Đối tác cung ứng vật tư & mở rộng kinh doanh</p>
        </div>
        <div class="bg-indigo-800/50 p-2 py-1 rounded border border-indigo-500/50 text-xl font-mono text-yellow-300 font-bold shadow-inner">
          Số dư: ${{ gameStore.money.toFixed(2) }}
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex bg-gray-100 border-b border-gray-300 px-8 pt-3 shadow-sm z-0">
        <button 
          @click="activeTab = 'STOCK'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'STOCK' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          📦 Chợ Nhập Hàng (Stock)
        </button>
        <button 
          @click="activeTab = 'FURNITURE'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'FURNITURE' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          🪑 Nội Thất Shop (Furniture)
        </button>
      </div>

      <!-- Main Content -->
      <div class="bg-gray-50 flex-grow p-8 overflow-y-auto custom-scroll">
        
        <!-- Stock Tab -->
        <div v-if="activeTab === 'STOCK'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            v-for="item in Object.values(STOCK_ITEMS)" 
            :key="item.id"
            class="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 relative group flex flex-col"
          >
            <!-- Lock Overlay if Level not met -->
            <div v-if="gameStore.level < item.requiredLevel" class="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-4xl mb-2">🔒</span>
              <div class="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-sm shadow-xl border-2 border-red-800">
                Unlock at Level {{ item.requiredLevel }}
              </div>
            </div>

            <div class="h-40 bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4 border-b border-gray-100" :class="{ 'grayscale blur-[1px]': gameStore.level < item.requiredLevel }">
               <div class="text-[80px] drop-shadow-xl transform group-hover:scale-110 transition-transform">
                 🎁
               </div>
            </div>
            <div class="p-5 flex flex-col flex-grow" :class="{ 'grayscale opacity-70': gameStore.level < item.requiredLevel }">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-gray-900 text-lg leading-tight">{{ item.name }}</h3>
                <span v-if="gameStore.shopInventory[item.id]" class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                  Có: {{ gameStore.shopInventory[item.id] }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mb-4 line-clamp-2 h-8">{{ item.description }}</p>
              
              <div class="mt-auto bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                 <div class="flex justify-between text-sm mb-1">
                   <span class="text-gray-500">Giá nhập (Cost):</span>
                   <span class="font-bold text-gray-800">${{ item.buyPrice }}</span>
                 </div>
                 <div class="flex justify-between text-sm">
                   <span class="text-gray-500">Giá bán dự kiến:</span>
                   <span class="font-bold text-green-600">${{ item.sellPrice }}</span>
                 </div>
              </div>

              <button 
                :disabled="gameStore.level < item.requiredLevel"
                @click="purchaseStock(item.id, item.buyPrice)"
                class="w-full font-bold py-3 px-4 rounded-xl shadow uppercase tracking-wider transition-all active:scale-95"
                :class="gameStore.level >= item.requiredLevel ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-500/30' : 'bg-gray-300 text-gray-500 cursor-not-allowed'"
              >
                Nhập Ngay (${{ item.buyPrice }})
              </button>
            </div>
          </div>
        </div>

        <!-- Furniture Tab -->
        <div v-if="activeTab === 'FURNITURE'" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div 
            v-for="furn in Object.values(FURNITURE_ITEMS)" 
            :key="furn.id"
            class="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 relative flex group"
          >
            <!-- Lock Overlay if Level not met -->
            <div v-if="gameStore.level < furn.requiredLevel" class="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-4xl mb-2">🔒</span>
              <div class="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-sm shadow-xl border-2 border-red-800">
                Unlock at Level {{ furn.requiredLevel }}
              </div>
            </div>

            <div class="w-2/5 min-h-[200px] bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center border-r border-gray-100" :class="{ 'grayscale blur-[1px]': gameStore.level < furn.requiredLevel }">
               <div class="text-[80px] drop-shadow-xl grayscale-[0.2] transform group-hover:scale-110 transition-transform">
                 🗄️
               </div>
            </div>
            
            <div class="w-3/5 p-6 flex flex-col" :class="{ 'grayscale opacity-70': gameStore.level < furn.requiredLevel }">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-gray-900 text-xl leading-tight">{{ furn.name }}</h3>
                <span v-if="gameStore.purchasedFurniture[furn.id]" class="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">
                  Có: {{ gameStore.purchasedFurniture[furn.id] }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mb-4">{{ furn.description }}</p>
              
              <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm flex items-center gap-2 text-blue-800 font-medium mb-auto">
                 <span>📦</span> Sức chứa: {{ furn.capacityStr }}
              </div>

              <button 
                :disabled="gameStore.level < furn.requiredLevel"
                @click="purchaseFurniture(furn.id, furn.buyPrice)"
                class="w-full mt-4 font-bold py-3 px-4 rounded-xl shadow uppercase tracking-wider transition-all active:scale-95"
                :class="gameStore.level >= furn.requiredLevel ? 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30' : 'bg-gray-300 text-gray-500 cursor-not-allowed'"
              >
                Mua (${{ furn.buyPrice }})
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 8px; }
.custom-scroll::-webkit-scrollbar-track { background: #f3f4f6; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
