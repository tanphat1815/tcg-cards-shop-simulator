<script setup lang="ts">
import { ref } from 'vue'
import { useStatsStore } from '../../stats/store/statsStore'
import EnhancedButton from '../../../components/shared/EnhancedButton.vue'

const statsStore = useStatsStore()
const isOpen = ref(false)

const toggleDevMode = () => {
  isOpen.value = !isOpen.value
}

const addMoney = (amount: number) => {
  statsStore.addMoney(amount)
}

const addLevel = (levels: number) => {
  statsStore.level += levels
  statsStore.showLevelUpNext = true
}

const nextDay = () => {
  statsStore.startNewDay(0)
}
</script>

<template>
  <div class="fixed bottom-4 left-4 z-[9999] font-sans">
    <!-- Nút bật tắt Dev Mode -->
    <EnhancedButton
      variant="icon"
      size="md"
      :icon="{ name: 'settings' }"
      defaultText=""
      @click="toggleDevMode"
      title="Developer Mode"
    >
    </EnhancedButton>

    <!-- Bảng Dev Mode Menu -->
    <Transition name="slide-up">
      <div v-if="isOpen" class="absolute bottom-16 left-0 bg-gray-900 border-2 border-red-500 rounded-xl shadow-2xl p-0 w-64 text-white relative">
        <EnhancedButton 
          variant="danger" 
          size="xs" 
          circle
          :icon="{ name: 'close' }" 
          @click="isOpen = false"
          title="Đóng Dev Mode"
          class="absolute -top-3 -right-3 z-30 shadow-red-500/40"
        />

        <div class="flex justify-between items-center px-4 py-3 bg-red-900/10 border-b border-gray-700/50 rounded-t-[0.7rem]">
          <h3 class="font-black text-red-500 text-lg flex items-center gap-2">
            <span>🔥</span> DEV MODE
          </h3>
        </div>
        
        <div class="p-4 space-y-3">
          <div class="space-y-2 border-b border-gray-700 pb-3">
             <div class="text-xs text-gray-400 uppercase font-bold">Kinh tế</div>
             <div class="grid grid-cols-2 gap-2">
               <EnhancedButton
                 variant="success"
                 size="sm"
                 @click="addMoney(1000)"
               >
                 +$1,000
               </EnhancedButton>
               <EnhancedButton
                 variant="success"
                 size="sm"
                 @click="addMoney(50000)"
               >
                 +$50K
               </EnhancedButton>
             </div>
          </div>

          <div class="space-y-2 border-b border-gray-700 pb-3">
             <div class="text-xs text-gray-400 uppercase font-bold">Kinh nghiệm</div>
             <EnhancedButton
               variant="info"
               size="sm"
               fullWidth
               @click="addLevel(1)"
             >
               Tăng +1 Cấp độ (Level Up)
             </EnhancedButton>
          </div>

          <div class="space-y-2 pb-1">
             <div class="text-xs text-gray-400 uppercase font-bold">Thời gian</div>
             <EnhancedButton
               variant="primary"
               size="sm"
               fullWidth
               :icon="{ name: 'arrow-right', position: 'right' }"
               @click="nextDay"
             >
               Bỏ qua Ngày (Next Day)
             </EnhancedButton>
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
