<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const isOpen = ref(false)

const toggelDevMode = () => {
  isOpen.value = !isOpen.value
}

const addMoney = (amount: number) => {
  gameStore.addMoney(amount)
}

const addLevel = (levels: number) => {
  gameStore.level += levels
  gameStore.showLevelUpNext = true
}

const nextDay = () => {
  gameStore.startNewDay()
}
</script>

<template>
  <div class="fixed bottom-4 left-4 z-[9999] font-sans">
    <!-- Nút bật tắt Dev Mode -->
    <button 
      @click="toggelDevMode"
      class="bg-black/50 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md shadow-lg border border-gray-600 transition-all hover:scale-110 flex items-center justify-center opacity-30 hover:opacity-100"
      title="Developer Mode"
    >
      <span class="text-xl leading-none">🛠️</span>
    </button>

    <!-- Bảng Dev Mode Menu -->
    <Transition name="slide-up">
      <div v-if="isOpen" class="absolute bottom-16 left-0 bg-gray-900 border-2 border-red-500 rounded-xl shadow-2xl p-4 w-64 text-white">
        <div class="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h3 class="font-black text-red-500 text-lg flex items-center gap-2">
            <span>🔥</span> DEV MODE
          </h3>
          <button @click="isOpen = false" class="text-gray-400 hover:text-white">✕</button>
        </div>

        <div class="space-y-3">
          <div class="space-y-2 border-b border-gray-700 pb-3">
             <div class="text-xs text-gray-400 uppercase font-bold">Kinh tế</div>
             <div class="grid grid-cols-2 gap-2">
               <button @click="addMoney(1000)" class="bg-green-700 hover:bg-green-600 text-white text-sm py-1.5 rounded font-bold shadow text-center">+$1,000</button>
               <button @click="addMoney(50000)" class="bg-green-800 hover:bg-green-600 text-white text-sm py-1.5 rounded font-bold shadow text-center">+$50K</button>
             </div>
          </div>

          <div class="space-y-2 border-b border-gray-700 pb-3">
             <div class="text-xs text-gray-400 uppercase font-bold">Kinh nghiệm</div>
             <button @click="addLevel(1)" class="w-full bg-purple-700 hover:bg-purple-600 text-white text-sm py-1.5 rounded font-bold shadow text-center">
               Tăng +1 Cấp độ (Level Up)
             </button>
          </div>

          <div class="space-y-2 pb-1">
             <div class="text-xs text-gray-400 uppercase font-bold">Thời gian</div>
             <button @click="nextDay" class="w-full bg-blue-700 hover:bg-blue-600 text-white text-sm py-1.5 rounded font-bold shadow text-center flex justify-center items-center gap-2">
               <span>⏭️</span> Bỏ qua Ngày (Next Day)
             </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease-out;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
