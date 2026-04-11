<script setup lang="ts">
import { computed } from 'vue'
import { useShopStore } from '../stores/modules/shopStore'
import { FURNITURE_ITEMS } from '../config/shopData'

const shopStore = useShopStore()

/**
 * Danh sách nội thất đang sở hữu có thể đặt ra sàn.
 * Lọc các item có số lượng > 0 để hiển thị.
 */
const ownedFurniture = computed(() => {
  return Object.keys(shopStore.purchasedFurniture)
    .filter(id => shopStore.purchasedFurniture[id] > 0)
    .map(id => ({
      ...FURNITURE_ITEMS[id as keyof typeof FURNITURE_ITEMS],
      id,
      count: shopStore.purchasedFurniture[id]
    }))
})

/**
 * Bắt đầu chế độ đặt nội thất.
 * @param id - ID của nội thất cần đặt.
 */
const startPlacement = (id: string) => {
  shopStore.startBuildMode(id)
}
</script>

<template>
  <Transition name="fade">
    <div v-if="shopStore.showBuildMenu" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div class="bg-gray-900 border-2 border-green-500 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <!-- Header -->
        <div class="bg-gray-800 px-8 py-5 flex justify-between items-center border-b border-gray-700">
          <h2 class="text-2xl font-black text-white flex items-center gap-3">
            <span class="text-3xl">🏗️</span> SHOP SETUP
          </h2>
          <button @click="shopStore.showBuildMenu = false" class="text-gray-400 hover:text-white bg-gray-700 hover:bg-red-500 p-2 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="p-8 overflow-y-auto custom-scroll">
          <!-- Edit Mode Toggle Section -->
          <div class="mb-8 p-6 bg-gray-800/80 border-2 border-gray-700 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="text-xl">🛠️</span> EDIT MODE
              </h3>
              <p class="text-xs text-gray-400 mt-1">Khi bật, bạn có thể click vào nội thất đã đặt để di chuyển hoặc cất đi.</p>
            </div>
            <button 
              @click="shopStore.toggleEditMode()"
              :class="[
                'px-6 py-2 rounded-full font-black text-sm transition-all transform active:scale-95 shadow-lg',
                shopStore.isEditMode 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 ring-4 ring-blue-500/20' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              ]"
            >
              {{ shopStore.isEditMode ? 'BẬT' : 'TẮT' }}
            </button>
          </div>

          <p class="text-gray-400 mb-6 font-medium italic border-l-4 border-green-500 pl-4">Chọn nội thất trong kho để đặt mới:</p>
          
          <div v-if="ownedFurniture.length === 0" class="text-center py-12 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700">
            <p class="text-gray-500 text-lg">Kho nội thất trống rỗng.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="item in ownedFurniture" :key="item.id"
              class="bg-gray-800 border border-gray-700 p-5 rounded-2xl flex flex-col justify-between hover:border-green-500/50 hover:bg-gray-750 transition-all group"
            >
              <div>
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-lg text-white group-hover:text-green-400 transition-colors">{{ item.name }}</h3>
                  <span class="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-xs font-black border border-green-500/30">x{{ item.count }}</span>
                </div>
                <p class="text-sm text-gray-400 leading-relaxed">{{ item.description }}</p>
              </div>
              
              <button 
                @click="startPlacement(item.id)"
                class="mt-6 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 transform active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>🏗️</span> ĐẶT XUỐNG
              </button>
            </div>
          </div>
        </div>

        <div class="bg-gray-800/50 p-6 border-t border-gray-700 text-center">
            <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">Nội thất đã mua sẽ xuất hiện ở đây</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: scale(0.95); }

.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.5); border-radius: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(34, 197, 94, 0.4); border-radius: 4px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(34, 197, 94, 0.6); }
</style>
