<script setup lang="ts">
import { useGameStore } from '../../shop-ui/store/gameStore'
import EnhancedButton from '../../../components/shared/EnhancedButton.vue'

const gameStore = useGameStore()

const close = () => {
  gameStore.setShowSettings(false)
}

const togglePreview = () => {
  gameStore.settings.showExpansionPreview = !gameStore.settings.showExpansionPreview
}

const setStyle = (style: 'BLUEPRINT' | 'GLOW') => {
  gameStore.settings.expansionPreviewStyle = style
}
</script>

<template>
  <Transition name="fade">
    <div v-if="gameStore.showSettings" class="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-auto">
        <div 
          class="bg-gray-900 border-2 border-indigo-500/30 rounded-xl w-full max-w-lg shadow-[0_0_100px_rgba(99,102,241,0.2)] flex flex-col transform transition-all relative"
          @click.stop
        >
          <EnhancedButton 
            variant="danger" 
            size="xs" 
            circle
            :icon="{ name: 'close' }" 
            @click="close"
            title="Đóng cài đặt"
            class="absolute -top-3 -right-3 z-30 shadow-red-500/40"
          />

          <!-- Header -->
          <div class="bg-indigo-600/10 px-8 py-6 flex justify-between items-center border-b border-indigo-500/20 rounded-t-[0.7rem]">
            <h2 class="text-2xl font-black text-white flex items-center gap-3">
              <span class="text-3xl">⚙️</span> CÀI ĐẶT GAME
            </h2>
          </div>

        <!-- Content -->
        <div class="p-8 space-y-8">
          
          <!-- Expansion Preview Toggle -->
          <div class="flex items-center justify-between bg-gray-800/50 p-6 rounded-3xl border border-gray-700/50">
            <div>
              <h3 class="font-bold text-white text-lg">Hiển thị vùng mở rộng</h3>
              <p class="text-sm text-gray-400">Xem trước diện tích cửa hàng sẽ mở rộng tới đâu</p>
            </div>
            <button 
              @click="togglePreview"
              class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none"
              :class="gameStore.settings.showExpansionPreview ? 'bg-green-500' : 'bg-gray-600'"
            >
              <span 
                class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform"
                :class="gameStore.settings.showExpansionPreview ? 'translate-x-7' : 'translate-x-1'"
              ></span>
            </button>
          </div>

          <!-- Expansion Preview Style -->
          <div v-if="gameStore.settings.showExpansionPreview" class="space-y-4">
            <h3 class="font-bold text-indigo-400 uppercase tracking-widest text-xs">Phác thảo kiểu hiển thị</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Blueprint Style -->
              <EnhancedButton 
                variant="outline"
                size="md"
                class="relative p-6 h-auto flex-col gap-4 border-2"
                :class="gameStore.settings.expansionPreviewStyle === 'BLUEPRINT' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700'"
                @click="setStyle('BLUEPRINT')"
              >
                <div v-if="gameStore.settings.expansionPreviewStyle === 'BLUEPRINT'" class="absolute -top-3 -right-3 bg-indigo-500 text-white w-6 h-6 rounded-full shadow-lg z-10 flex items-center justify-center border border-white/20">
                  <span class="text-xs">✓</span>
                </div>
                <div class="w-full aspect-video rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
                   <div class="w-[80%] h-[70%] border-2 border-dashed border-cyan-400 opacity-60"></div>
                </div>
                <div class="text-center">
                  <span class="block font-bold text-white uppercase text-xs tracking-widest">Blueprint</span>
                  <span class="text-[10px] text-gray-500">Cổ điển / Nét đứt</span>
                </div>
              </EnhancedButton>

              <!-- Glow Style -->
              <EnhancedButton 
                variant="outline"
                size="md"
                class="relative p-6 h-auto flex-col gap-4 border-2"
                :class="gameStore.settings.expansionPreviewStyle === 'GLOW' ? 'border-pink-500 bg-pink-500/10' : 'border-gray-700'"
                @click="setStyle('GLOW')"
              >
                <div v-if="gameStore.settings.expansionPreviewStyle === 'GLOW'" class="absolute -top-3 -right-3 bg-pink-500 text-white w-6 h-6 rounded-full shadow-lg z-10 flex items-center justify-center border border-white/20">
                  <span class="text-xs">✓</span>
                </div>
                <div class="w-full aspect-video rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
                   <div class="w-[80%] h-[70%] border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)] opacity-80"></div>
                </div>
                <div class="text-center">
                  <span class="block font-bold text-white uppercase text-xs tracking-widest">Glow</span>
                  <span class="text-[10px] text-gray-500">Hiện đại / Hào quang</span>
                </div>
              </EnhancedButton>
            </div>
          </div>

          <!-- Debug Physics Toggle -->
          <div class="flex items-center justify-between bg-gray-800/50 p-6 rounded-3xl border border-gray-700/50">
            <div>
              <h3 class="font-bold text-white text-lg">Hiển thị vùng va chạm</h3>
              <p class="text-sm text-gray-400">Bật khung bao vật lý (Collision Box) để kiểm tra kẹt</p>
            </div>
            <button 
              @click="gameStore.settings.showDebugPhysics = !gameStore.settings.showDebugPhysics"
              class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none"
              :class="gameStore.settings.showDebugPhysics ? 'bg-orange-500' : 'bg-gray-600'"
            >
              <span 
                class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform"
                :class="gameStore.settings.showDebugPhysics ? 'translate-x-7' : 'translate-x-1'"
              ></span>
            </button>
          </div>

        </div>

        <!-- Footer -->
        <div class="bg-gray-800/50 px-8 py-6 text-center border-t border-gray-700/50 rounded-b-[0.7rem]">
          <p class="text-[11px] text-gray-500 uppercase tracking-[0.2em] font-black">TCG Shop Simulator &bull; Settings v1.0</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>
