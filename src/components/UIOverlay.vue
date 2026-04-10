<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

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

const formattedTime = computed(() => {
  const mins = gameStore.timeInMinutes
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
  return `${displayHours.toString().padStart(2, '0')}:${remainingMins.toString().padStart(2, '0')} ${ampm}`
})

// The buy pack function is moved to OnlineShopMenu

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

// Transform the shopInventory Record into an array for rendering
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
</script>

<template>
  <div class="absolute top-0 left-0 p-6 w-full h-full pointer-events-none flex flex-col justify-between z-10 box-border">
    <!-- Top-Center: Clock & Day -->
    <div class="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto bg-gray-900/90 backdrop-blur border-2 border-gray-700/80 rounded-2xl px-8 py-3 shadow-2xl flex flex-col items-center min-w-[200px]">
      <div class="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">
        Ngày {{ gameStore.currentDay }}
      </div>
      <div class="text-3xl font-black tabular-nums tracking-wider" :class="gameStore.shopState === 'OPEN' ? 'text-white' : 'text-red-500'">
        {{ formattedTime }}
      </div>
      <div class="text-[10px] uppercase font-black tracking-widest mt-1" :class="gameStore.shopState === 'OPEN' ? 'text-green-400' : 'text-red-500'">
        {{ gameStore.shopState === 'OPEN' ? 'MỞ CỬA' : 'ĐÓNG CỬA' }}
      </div>
    </div>

    <!-- Top-left: Balance & Stats -->
    <div class="pointer-events-auto bg-gray-900/80 backdrop-blur text-white p-5 rounded-2xl shadow-xl border border-gray-700/50 max-w-sm">
      <h2 class="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-3">Shop Manager</h2>
      <div class="flex items-center justify-between mb-4 bg-gray-800/80 px-4 py-3 rounded-xl border border-gray-700/50">
        <span class="text-sm font-medium text-gray-300">Balance</span>
        <span class="text-2xl font-black text-yellow-500">${{ gameStore.money.toFixed(2) }}</span>
      </div>

      <!-- Level & XP Bar -->
      <div class="mb-5">
        <div class="flex justify-between items-end mb-1">
          <span class="text-xs font-bold text-indigo-400 uppercase tracking-widest">Level {{ gameStore.level }}</span>
          <span class="text-[10px] font-mono text-gray-500">{{ gameStore.currentExp }} / {{ gameStore.requiredExp }} XP</span>
        </div>
        <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
          <div 
            class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
            :style="{ width: `${(gameStore.currentExp / gameStore.requiredExp) * 100}%` }"
          ></div>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button 
          @click="gameStore.showOnlineShop = true" 
          class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <span class="text-xl">💻</span> ONLINE SHOP
        </button>
        <button 
          @click="gameStore.showBuildMenu = true" 
          class="bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500/30 font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/10 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          title="Mở menu xây dựng"
        >
          <span class="text-xl">🔨</span>
        </button>
      </div>

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
      <div class="flex justify-between items-center mb-4 border-b border-gray-700/50 pb-3">
        <h3 class="text-lg font-bold text-gray-100 flex items-center gap-2">
          <span>📦</span> Inventory
        </h3>
        <button @click="gameStore.showBinderMenu = true" class="text-xs bg-indigo-600 hover:bg-indigo-500 font-bold px-3 py-1.5 rounded-lg text-white shadow shadow-indigo-500/30 flex items-center gap-1 transition-colors">
          <span>📔</span> Binder
        </button>
      </div>
      
      <p class="text-[11px] text-gray-400 mb-2 italic">Mẹo: Hãy lại gần Kệ rỗng và ấn phím E để xếp đồ!</p>
      
      <div v-if="inventoryDetails.length === 0" class="text-gray-400 italic text-sm text-center py-8">
        Kho đồ trống rỗng. Hãy mua một Pack!
      </div>
      
      <div v-else class="space-y-2 overflow-y-auto pr-2 custom-scroll">
        <div 
          v-for="item in inventoryDetails" :key="item.id"
          class="flex justify-between items-center bg-gray-800/60 p-3 rounded-xl border border-gray-700/30 hover:bg-gray-700/50 transition-colors"
        >
          <div class="flex flex-col">
            <span class="font-bold text-[15px] text-gray-200 flex items-center gap-2 line-clamp-1 h-6 pr-2">
              <span>{{ item.type === 'box' ? '📦' : '🎁' }}</span> {{ item.name }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="item.type === 'box'" @click="gameStore.unboxItem(item.id)" class="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-2.5 rounded-lg shadow uppercase text-[10px] tracking-wider transition-colors">
              Xé Hộp
            </button>
            <button v-if="item.type === 'pack'" @click="gameStore.tearPack(item.id)" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2.5 rounded-lg shadow uppercase text-[10px] tracking-wider transition-colors">
              Mở Pack
            </button>
            <div class="bg-gray-900 text-gray-200 px-2 py-1 rounded-lg text-sm font-mono border border-gray-700 font-bold min-w-[36px] text-center">
              x{{ item.quantity }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Level Up Notification Overlay -->
    <Transition name="level-up">
      <div v-if="showLevelUpToast" class="absolute top-32 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
        <div class="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 p-1 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-bounce">
          <div class="bg-gray-900 px-10 py-4 rounded-xl flex flex-col items-center">
            <span class="text-4xl mb-2">🎉</span>
            <h2 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 uppercase tracking-tighter">LEVEL UP!</h2>
            <p class="text-white font-bold">Bạn đã đạt Cấp {{ gameStore.level }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Level Up Animation */
.level-up-enter-active,
.level-up-leave-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.level-up-enter-from {
  opacity: 0;
  transform: translate(-50%, -100%) scale(0.5);
}
.level-up-leave-to {
  opacity: 0;
  transform: translate(-50%, -150%) scale(0.8);
}

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
