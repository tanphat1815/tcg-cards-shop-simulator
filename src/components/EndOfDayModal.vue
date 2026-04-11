<script setup lang="ts">
import { useStatsStore } from '../stores/modules/statsStore'
import { useShopStore } from '../stores/modules/shopStore'

const statsStore = useStatsStore()
const shopStore = useShopStore()

/**
 * Các chỉ số bán hàng thu được trong ngày.
 */
const nextDay = () => {
  statsStore.startNewDay()
}
</script>

<template>
  <div v-if="shopStore.showEndDayModal" class="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
    <div class="bg-gray-800 border-2 border-gray-600 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] transform animate-fade-in-up flex flex-col">
      <h2 class="text-3xl font-black text-center text-white mb-2 uppercase tracking-widest">
        Tổng Kết Ngày {{ statsStore.currentDay }}
      </h2>
      <div class="text-center text-gray-400 mb-8 font-medium">Ca làm việc đã kết thúc!</div>

      <div class="space-y-4 mb-8">
        <div class="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
          <span class="text-gray-300 font-medium">Khách đã phục vụ</span>
          <span class="text-2xl font-bold text-blue-400">{{ statsStore.dailyStats.customersServed }}</span>
        </div>
        
        <div class="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
          <span class="text-gray-300 font-medium">Sản phẩm đã bán</span>
          <span class="text-2xl font-bold text-green-400">{{ statsStore.dailyStats.itemsSold }}</span>
        </div>

        <div class="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
          <span class="text-gray-300 font-medium">Doanh thu trong ngày</span>
          <span class="text-2xl font-black text-yellow-500">+${{ statsStore.dailyStats.revenue.toFixed(2) }}</span>
        </div>
      </div>

      <button 
        @click="nextDay"
        class="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-xl font-bold uppercase tracking-widest shadow-lg hover:shadow-green-500/30 transition-all hover:scale-105 active:scale-95"
      >
        Bắt đầu ngày mới
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); scale: 0.95; }
  to { opacity: 1; transform: translateY(0); scale: 1; }
}
</style>
