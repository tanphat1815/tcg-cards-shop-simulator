<script setup lang="ts">
import { useStatsStore } from '../stores/modules/statsStore'

const statsStore = useStatsStore()

const close = () => {
  statsStore.showSettings = false
}

const togglePreview = () => {
  statsStore.settings.showExpansionPreview = !statsStore.settings.showExpansionPreview
}

const setStyle = (style: 'BLUEPRINT' | 'GLOW') => {
  statsStore.settings.expansionPreviewStyle = style
}
</script>

<template>
  <Transition name="fade">
    <div v-if="statsStore.showSettings" class="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-auto">
      <div 
        class="bg-gray-900 border-2 border-indigo-500/30 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)] flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-indigo-600/10 px-8 py-6 flex justify-between items-center border-b border-indigo-500/20">
          <h2 class="text-2xl font-black text-white flex items-center gap-3">
            <span class="text-3xl">⚙️</span> CÀI ĐẶT GAME
          </h2>
          <button @click="close" class="text-gray-400 hover:text-white bg-gray-800 hover:bg-red-500 p-2.5 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
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
              :class="statsStore.settings.showExpansionPreview ? 'bg-green-500' : 'bg-gray-600'"
            >
              <span 
                class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform"
                :class="statsStore.settings.showExpansionPreview ? 'translate-x-7' : 'translate-x-1'"
              ></span>
            </button>
          </div>

          <!-- Style Selection -->
          <div v-if="statsStore.settings.showExpansionPreview" class="space-y-4">
            <h3 class="font-bold text-indigo-400 uppercase tracking-widest text-xs">Phác thảo kiểu hiển thị</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Blueprint Style -->
              <button 
                @click="setStyle('BLUEPRINT')"
                class="relative group p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3"
                :class="statsStore.settings.expansionPreviewStyle === 'BLUEPRINT' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'"
              >
                <div v-if="statsStore.settings.expansionPreviewStyle === 'BLUEPRINT'" class="absolute -top-3 -right-3 bg-indigo-500 text-white p-1.5 rounded-full shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </div>
                <div class="w-full aspect-video rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
                   <div class="w-[80%] h-[70%] border-2 border-dashed border-cyan-400 opacity-60"></div>
                </div>
                <div class="text-center">
                  <span class="block font-bold text-white uppercase text-xs tracking-widest">Blueprint</span>
                  <span class="text-[10px] text-gray-500">Cổ điển / Nét đứt</span>
                </div>
              </button>

              <!-- Glow Style -->
              <button 
                @click="setStyle('GLOW')"
                class="relative group p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3"
                :class="statsStore.settings.expansionPreviewStyle === 'GLOW' ? 'border-pink-500 bg-pink-500/10' : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'"
              >
                <div v-if="statsStore.settings.expansionPreviewStyle === 'GLOW'" class="absolute -top-3 -right-3 bg-pink-500 text-white p-1.5 rounded-full shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </div>
                <div class="w-full aspect-video rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
                   <div class="w-[80%] h-[70%] border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)] opacity-80"></div>
                </div>
                <div class="text-center">
                  <span class="block font-bold text-white uppercase text-xs tracking-widest">Glow</span>
                  <span class="text-[10px] text-gray-500">Hiện đại / Hào quang</span>
                </div>
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="bg-gray-800/50 px-8 py-6 text-center border-t border-gray-700/50">
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
