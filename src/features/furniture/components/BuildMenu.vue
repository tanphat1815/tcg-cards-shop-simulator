<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../shop-ui/store/gameStore'
import { FURNITURE_ITEMS } from '../config'
import EnhancedButton from '../../shared/components/EnhancedButton.vue'

const gameStore = useGameStore()

const items = computed(() => {
  return Object.keys(gameStore.purchasedFurniture).map(id => ({
    id,
    name: FURNITURE_ITEMS[id]?.name || 'Unknown',
    count: gameStore.purchasedFurniture[id],
    description: FURNITURE_ITEMS[id]?.description || ''
  })).filter(item => item.count > 0)
})

const startBuild = (id: string) => {
  gameStore.startBuildMode(id)
}
</script>

<template>
  <Transition name="fade">
    <div v-if="gameStore.showBuildMenu" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div class="bg-gray-900 border-2 border-green-500 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] relative">
        <EnhancedButton 
          variant="danger" 
          size="xs" 
          circle
          :icon="{ name: 'close' }" 
          @click="gameStore.setShowBuildMenu(false)"
          title="Đóng Shop Setup"
          class="absolute -top-3 -right-3 z-30 shadow-red-500/40"
        />

        <!-- Header -->
        <div class="bg-gray-800 px-8 py-5 flex justify-between items-center border-b border-gray-700 rounded-t-xl">
          <h2 class="text-2xl font-black text-white flex items-center gap-3">
            <span class="text-3xl">🏗️</span> SHOP SETUP
          </h2>
        </div>

        <div class="p-8 overflow-y-auto">
          <!-- Edit Mode Toggle Section -->
          <div class="mb-8 p-6 bg-gray-800/80 border-2 border-gray-700 rounded-xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <span class="text-xl">🛠️</span> EDIT MODE
              </h3>
              <p class="text-xs text-gray-400 mt-1">Khi bật, bạn có thể click vào nội thất đã đặt để di chuyển hoặc cất đi.</p>
            </div>
            <EnhancedButton
              :variant="gameStore.isEditMode ? 'success' : 'secondary'"
              size="md"
              :icon="{ name: gameStore.isEditMode ? 'check' : 'edit', position: 'left' }"
              @click="gameStore.toggleEditMode()"
            >
              {{ gameStore.isEditMode ? 'ON' : 'OFF' }}
            </EnhancedButton>
          </div>

          <p class="text-gray-400 mb-6 font-medium italic border-l-4 border-green-500 pl-4">Chọn nội thất trong kho để đặt mới:</p>
          
          <div v-if="items.length === 0" class="text-center py-12 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700">
            <p class="text-gray-500 text-lg">Kho nội thất trống rỗng.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="item in items" :key="item.id"
              class="bg-gray-800 border border-gray-700 p-5 rounded-2xl flex flex-col justify-between hover:border-green-500/50 hover:bg-gray-750 transition-all group"
            >
              <div>
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-lg text-white group-hover:text-green-400 transition-colors">{{ item.name }}</h3>
                  <span class="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-xs font-black border border-green-500/30">x{{ item.count }}</span>
                </div>
                <p class="text-sm text-gray-400 leading-relaxed">{{ item.description }}</p>
              </div>
              
              <EnhancedButton 
                variant="success"
                size="md"
                fullWidth
                @click="startBuild(item.id)"
                class="mt-6"
              >
                ĐẶT XUỐNG
              </EnhancedButton>
            </div>
          </div>
        </div>

        <div class="bg-gray-800/50 p-6 border-t border-gray-700 text-center rounded-b-[0.7rem]">
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
