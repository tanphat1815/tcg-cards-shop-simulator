<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

/**
 * Facade store for managing game state
 */
const gameStore = useGameStore()

// Clock logic
let clockInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  clockInterval = setInterval(() => {
    // 0.5s real time = 5 mins game time
    if (gameStore.shopState === 'OPEN') {
      gameStore.tickTime(5)
    }
  }, 500)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})

/**
 * Formats the current game time into HH:MM AM/PM string
 */
const formattedTime = computed(() => {
  const mins = gameStore.timeInMinutes
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
  return `${displayHours.toString().padStart(2, '0')}:${remainingMins.toString().padStart(2, '0')} ${ampm}`
})

// Level Up Toast
const showLevelUpToast = ref(false)
watch(() => gameStore.level, (newVal, oldVal) => {
  if (newVal > oldVal) {
    showLevelUpToast.value = true
    setTimeout(() => {
      showLevelUpToast.value = false
    }, 4000)
  }
})

/**
 * Transform the shopInventory Record into an array for rendering
 */
const inventoryDetails = computed(() => {
  return Object.keys(gameStore.shopInventory).map(itemId => {
    const itemData = gameStore.shopItems[itemId]
    return {
      id: itemId,
      name: itemData?.name || 'Unknown Item',
      quantity: gameStore.shopInventory[itemId],
      type: itemData?.type || 'pack'
    }
  }).sort((a, b) => b.quantity - a.quantity)
})

// Minimization state
const isShopManagerMinimized = ref(false)
const isInventoryMinimized = ref(false)
</script>

<template>
  <div class="absolute top-0 left-0 p-6 w-full h-full pointer-events-none flex flex-col justify-between z-10 box-border">
    <!-- Top-Center: Clock & Day -->
    <div 
      class="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur border-2 border-gray-700/80 rounded-2xl px-8 py-3 shadow-2xl flex flex-col items-center min-w-[200px]"
      :class="gameStore.isBuildMode || gameStore.isEditMode ? 'pointer-events-none opacity-50' : 'pointer-events-auto'"
    >
      <div class="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">
        Ngày {{ gameStore.currentDay }}
      </div>
      <div class="text-3xl font-black tabular-nums tracking-wider" :class="gameStore.shopState === 'OPEN' ? 'text-white' : 'text-red-500'">
        {{ formattedTime }}
      </div>
      <div class="text-[10px] uppercase font-black tracking-widest mt-1" :class="gameStore.shopState === 'OPEN' ? 'text-green-400' : 'text-red-500'">
        {{ gameStore.shopState === 'OPEN' ? 'MỞ CỬA' : 'ĐÓNG CỬA' }}
      </div>
      
      <!-- Shop Toggle Button -->
      <button 
        @click="gameStore.setShopState(gameStore.shopState === 'OPEN' ? 'CLOSED' : 'OPEN')"
        class="mt-3 w-full text-white text-[11px] font-black py-2.5 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wider pointer-events-auto border shadow-lg"
        :class="gameStore.shopState === 'OPEN' 
          ? 'bg-gradient-to-r from-red-600 to-red-800 border-red-400/30 shadow-red-500/20' 
          : 'bg-gradient-to-r from-green-600 to-emerald-700 border-green-400/30 shadow-green-500/20 animate-pulse'"
      >
        {{ gameStore.shopState === 'OPEN' ? '🛑 Đóng Cửa' : '🚀 Mở Cửa Hàng' }}
      </button>

      <!-- Manual End Day Button (Summary) -->
      <button 
        v-if="gameStore.shopState === 'CLOSED' && gameStore.timeInMinutes > 600" 
        @click="gameStore.forceEndDay()"
        class="mt-2 w-full bg-gray-800/80 hover:bg-gray-700 text-orange-400 text-[9px] font-black py-1.5 px-4 rounded-lg border border-orange-500/20 transition-all pointer-events-auto uppercase tracking-tighter"
      >
        📊 Tổng Kết Ngày (Sớm)
      </button>
    </div>

    <!-- Top-left: Balance & Stats -->
    <div class="grid items-start justify-items-start">
      <Transition name="panel-slide" mode="out-in">
        <div 
          v-if="!isShopManagerMinimized" 
          key="panel" 
          class="col-start-1 row-start-1 bg-gray-900/80 backdrop-blur text-white p-5 rounded-2xl shadow-xl border border-gray-700/50 max-w-sm relative flex flex-col"
          :class="gameStore.isBuildMode || gameStore.isEditMode ? 'pointer-events-none opacity-50 scale-95 origin-top-left' : 'pointer-events-auto'"
        >
          <button @click="isShopManagerMinimized = true" class="absolute -top-2 -right-2 bg-gray-800 hover:bg-gray-700 text-gray-400 p-1.5 rounded-full border border-gray-700 shadow-lg transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4" /></svg>
          </button>
          
          <h2 class="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-3">Shop Manager</h2>
          <div class="flex items-center justify-between mb-4 bg-gray-800/80 px-4 py-3 rounded-xl border border-gray-700/50">
            <span class="text-sm font-medium text-gray-300">Balance</span>
            <span class="text-2xl font-black text-green-400 tabular-nums">${{ gameStore.money.toLocaleString() }}</span>
          </div>
          
          <div class="space-y-2.5">
            <div class="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-tighter">
              <span>EXP Progress</span>
              <span class="text-gray-300">{{ gameStore.currentExp }} / {{ gameStore.requiredExp }}</span>
            </div>
            <div class="w-full bg-gray-800 rounded-full h-3.5 border border-gray-700/50 overflow-hidden p-0.5 shadow-inner">
              <div class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 relative" :style="{ width: `${(gameStore.currentExp / gameStore.requiredExp) * 100}%` }">
                <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div class="flex justify-between items-center bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/30">
              <span class="text-[10px] font-black uppercase text-gray-400">Current Level</span>
              <span class="text-lg font-black text-blue-400 italic">LVL {{ gameStore.level }}</span>
            </div>
          </div>

          <!-- Shop status / Billing -->
          <div v-if="gameStore.waitingCustomers > 0" class="mt-4 bg-orange-900/40 border border-orange-500/50 text-orange-200 px-4 py-3 rounded-xl flex justify-between items-center group">
            <span class="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <span class="animate-bounce">⏱</span> Khách chờ: {{ gameStore.waitingCustomers }}
            </span>
            <button @click="gameStore.serveCustomer()" class="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black px-3 py-1.5 rounded-lg shadow-lg text-[10px] uppercase transition-all transform hover:scale-105 active:scale-95">Thanh toán</button>
          </div>

          <div class="mt-5 pt-5 border-t border-gray-700/50 flex gap-3">
            <button @click="gameStore.setShowOnlineShop(true)" class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-black italic pointer-events-auto">
              🛒 SHOP
            </button>
            <button @click="gameStore.setShowBuildMenu(true)" class="bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500/30 font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/10 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 pointer-events-auto" title="Mở menu xây dựng">
              🏗️
            </button>
            <button @click="gameStore.setShowSettings(true)" class="bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700/50 font-bold py-3 px-4 rounded-xl transition-all shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2 pointer-events-auto" title="Cài đặt">
              ⚙️
            </button>
          </div>
        </div>
        <div v-else key="minimized" class="pointer-events-auto flex items-center gap-2">
            <div class="bg-gray-900/90 backdrop-blur text-white px-4 py-2.5 rounded-2xl shadow-xl border border-gray-700 flex items-center gap-3">
               <span class="text-green-400 font-black tabular-nums font-mono text-sm">${{ gameStore.money.toLocaleString() }}</span>
               <div v-if="gameStore.waitingCustomers > 0" class="flex gap-1 items-center bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md text-[10px] font-black border border-orange-500/30">
                  <span class="animate-pulse">●</span> {{ gameStore.waitingCustomers }} WAITING
               </div>
            </div>
            <button @click="isShopManagerMinimized = false" class="bg-gray-800 hover:bg-gray-700 text-gray-400 p-2.5 rounded-2xl border border-gray-700 transition-all hover:scale-110">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
        </div>
      </Transition>
    </div>

    <!-- Bottom-right: Inventory -->
    <div class="absolute bottom-6 right-6 flex flex-col items-end gap-3 max-w-sm w-full">
      <Transition name="panel-slide" mode="out-in">
        <div 
          v-if="!isInventoryMinimized" 
          key="panel" 
          class="w-full bg-gray-900/80 backdrop-blur text-white p-5 rounded-3xl shadow-2xl border border-gray-700/50 relative flex flex-col overflow-hidden max-h-[400px]"
          :class="gameStore.isBuildMode || gameStore.isEditMode ? 'pointer-events-none opacity-50 scale-95 origin-bottom-right' : 'pointer-events-auto'"
        >
          <button @click="isInventoryMinimized = true" class="absolute -top-1 -right-1 bg-gray-800 hover:bg-gray-700 text-gray-400 p-2 rounded-full border border-gray-700 shadow-lg transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
          </button>

          <div class="flex items-center justify-between mb-4">
            <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
              📦 Kho Hàng <span class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md">{{ inventoryDetails.length }} items</span>
            </h3>
            <button @click="gameStore.setShowBinderMenu(true)" class="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5">
               <span>📔</span> Binder Menu
            </button>
          </div>
          
          <div class="overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
            <div v-if="inventoryDetails.length === 0" class="text-center py-10">
              <span class="text-4xl block mb-2 grayscale opacity-50">📫</span>
              <p class="text-gray-600 font-bold italic text-sm">Kho đồ đang trống...</p>
            </div>
            <div v-for="item in inventoryDetails" :key="item.id" class="flex items-center justify-between p-3.5 bg-gray-800/40 hover:bg-gray-800/60 rounded-2xl border border-gray-700/30 transition-all group">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-black text-gray-200 group-hover:text-white line-clamp-1">{{ item.name }}</span>
                <span class="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{{ item.type }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-black text-indigo-400 tabular-nums bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">x{{ item.quantity }}</span>
                <button v-if="item.type === 'box'" @click="gameStore.unboxItem(item.id)" class="bg-red-600/90 hover:bg-red-500 text-white font-black py-1.5 px-3 rounded-xl shadow-lg uppercase text-[9px] tracking-wider transition-all hover:scale-105 active:scale-95">Xé Hộp</button>
                <button v-if="item.type === 'pack'" @click="gameStore.tearPack(item.id)" class="bg-indigo-600/90 hover:bg-indigo-500 text-white font-black py-1.5 px-3 rounded-xl shadow-lg uppercase text-[9px] tracking-wider transition-all hover:scale-105 active:scale-95">Mở Pack</button>
              </div>
            </div>
          </div>
        </div>
        <button v-else @click="isInventoryMinimized = false" class="bg-gray-900/90 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-700 font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-4 animate-in fade-in slide-in-from-right-2 hover:scale-105 transition-transform group">
          <span class="text-xl group-hover:rotate-12 transition-transform">📦</span> Inventory
          <span v-if="inventoryDetails.length > 0" class="bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[9px]">{{ inventoryDetails.length }}</span>
        </button>
      </Transition>
    </div>

    <!-- Level up toast -->
    <Transition name="toast">
      <div v-if="showLevelUpToast" class="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-xs px-6">
        <div class="bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 p-0.5 rounded-3xl shadow-[0_20px_50px_rgba(234,179,8,0.4)]">
          <div class="bg-gray-950 px-8 py-5 rounded-[22px] flex flex-col items-center gap-1 border border-white/10">
            <span class="text-yellow-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Level Up Update</span>
            <span class="text-3xl mb-1">👑</span>
            <p class="text-white font-black text-xl italic tracking-tighter uppercase underline decoration-yellow-500 underline-offset-4 decoration-2">Level {{ gameStore.level }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.panel-slide-enter-active, .panel-slide-leave-active { transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: scale(0.9) translateY(20px); filter: blur(10px); }

.toast-enter-active { animation: toast-in 0.8s cubic-bezier(0.19, 1, 0.22, 1); }
.toast-leave-active { animation: toast-in 0.5s reverse ease-in forwards; }

@keyframes toast-in {
  0% { transform: translateY(-50px) scale(0.7); opacity: 0; filter: blur(5px); }
  100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
}

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; border: 1px solid #1f2937; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4B5563; }
</style>
