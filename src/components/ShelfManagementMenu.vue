<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const selectedItemId = ref<string | null>(null)

// Computed inventory items (only quantities > 0)
// Now using shopInventory which holds basic_pack only
const inventoryItems = computed(() => {
  return Object.keys(gameStore.shopInventory).map(itemId => {
    const itemData = gameStore.shopItems[itemId]
    return {
      id: itemId,
      item: itemData,
      quantity: gameStore.shopInventory[itemId]
    }
  }).filter(item => item.item !== undefined && item.quantity > 0)
})

const activeShelf = computed(() => {
  if (!gameStore.activeShelfId) return null
  return gameStore.placedShelves[gameStore.activeShelfId]
})

const selectItem = (itemId: string) => {
  selectedItemId.value = itemId
}

const handleSlotClick = (slotIndex: number) => {
  if (!selectedItemId.value) return
  gameStore.moveToShelfSlot(selectedItemId.value, slotIndex)
  if (!gameStore.shopInventory[selectedItemId.value] || gameStore.shopInventory[selectedItemId.value] === 0) {
    selectedItemId.value = null // Deselect if ran out
  }
}

const handleSlotClickWithShift = (event: MouseEvent, slotIndex: number) => {
  if (event.shiftKey) {
     if (!selectedItemId.value) return
     gameStore.autoFillShelf(selectedItemId.value)
     if (!gameStore.shopInventory[selectedItemId.value] || gameStore.shopInventory[selectedItemId.value] === 0) {
       selectedItemId.value = null
     }
  } else {
     handleSlotClick(slotIndex)
  }
}

const clearSlot = (slotIndex: number) => {
  if (!activeShelf.value) return
  gameStore.clearShelfSlot(activeShelf.value.id, slotIndex)
}
</script>

<template>
  <div v-if="gameStore.showShelfMenu && activeShelf" class="absolute inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-auto p-4">
    <div class="bg-gray-900 border-2 border-indigo-500/50 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
        <h2 class="text-2xl font-black text-white flex items-center gap-2">
          <span>🏪</span> QUẢN LÝ KỆ HÀNG ({{ activeShelf.id }})
        </h2>
        <button @click="gameStore.closeShelfManagement()" class="text-gray-400 hover:text-white bg-gray-700 hover:bg-red-500 p-2 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Main Body -->
      <div class="flex-grow flex overflow-hidden">
        
        <!-- Left: Inventory -->
        <div class="w-1/3 border-r border-gray-700 bg-gray-900/50 p-4 flex flex-col relative">
          <h3 class="text-lg font-bold text-gray-200 mb-4 pb-2 border-b border-gray-700">📦 Kho hàng (Chỉ bán Pack)</h3>
          
          <div v-if="inventoryItems.length === 0" class="text-center text-gray-500 italic mt-10">
            Kho hiện đang trống.
          </div>
          
          <div v-else class="flex-grow overflow-y-auto pr-2 custom-scroll space-y-2 pb-20">
            <div 
              v-for="item in inventoryItems" :key="item.id"
              @click="selectItem(item.id)"
              class="flex justify-between items-center p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="selectedItemId === item.id ? 'bg-indigo-900/40 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-700'"
            >
              <div class="flex flex-col">
                <span class="font-bold text-[15px] text-yellow-300 flex items-center gap-2">
                  <span v-if="item.item.isPack">🎁</span> {{ item.item.name }}
                </span>
                <span class="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mt-1">Giá bán: ${{ item.item.sellPrice }}</span>
              </div>
              <div class="bg-gray-950 text-green-400 px-3 py-1 rounded-lg text-sm font-mono border border-gray-700 font-bold">
                x{{ item.quantity }}
              </div>
            </div>
          </div>
          
          <div v-if="selectedItemId" class="absolute bottom-4 left-4 right-4 bg-gray-800 border border-gray-600 p-3 rounded-xl shadow-xl z-10 flex flex-col gap-2">
             <div class="text-xs text-gray-400 text-center font-medium">Thao tác nhanh</div>
             <button @click="gameStore.autoFillShelf(selectedItemId)" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold py-2.5 rounded-lg shadow uppercase tracking-wider transition-transform active:scale-95">
               Điền Tất Cả Lên Kệ
             </button>
          </div>
        </div>

        <!-- Right: Shelf Grid -->
        <div class="w-2/3 p-6 flex flex-col bg-gray-900">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-lg font-bold text-gray-200 flex items-center gap-2"><span>🗄️</span> Lưới Kệ (48 Slots)</h3>
              <p class="text-[11px] text-gray-400 mt-1 bg-gray-800 inline-block px-2 py-0.5 rounded border border-gray-700">Mẹo: Chọn Pack bên trái, Shift+Click vào ô trống để tự điền hàng loạt.</p>
            </div>
            <button @click="gameStore.clearEntireShelf()" class="bg-red-900/60 hover:bg-red-700 text-red-200 text-xs font-bold px-4 py-2 uppercase tracking-wider rounded shadow transition-colors border border-red-700/50">
              Rút tất cả về Kho
            </button>
          </div>

          <!-- Grid slots -->
          <div class="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 overflow-y-auto custom-scroll pr-2 pb-4">
            <div 
              v-for="(slot, index) in activeShelf.slots" 
              :key="index"
              class="relative w-full aspect-[2/3] rounded-md border-2 overflow-hidden cursor-pointer group flex flex-col items-center justify-center transition-all shadow-sm shrink-0"
              :class="slot.cardId ? 'bg-gradient-to-b from-blue-500 to-indigo-800 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-gray-700 border-dashed hover:border-indigo-400/50 hover:bg-indigo-900/20 bg-gray-800/30'"
              @click="handleSlotClickWithShift($event, index)"
            >
               <!-- Delete button if filled -->
               <button 
                 v-if="slot.cardId" 
                 @click.stop="clearSlot(index)"
                 class="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-600 border-2 border-white text-white rounded-full flex items-center justify-center font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110 shadow-lg"
                 title="Thu về kho"
               >✕</button>

               <div v-if="slot.cardId" class="text-center w-full p-0.5 flex flex-col h-full justify-center opacity-95 group-hover:opacity-100">
                 <div class="text-3xl leading-none drop-shadow-md pb-1">
                   🎁
                 </div>
                 <div class="text-[9px] font-bold text-white tracking-widest uppercase mt-1">
                   Pack
                 </div>
               </div>
               <div v-else class="text-gray-600 font-black opacity-30 text-xs">
                 {{ index + 1 }}
               </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.5); border-radius: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.6); border-radius: 4px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.9); }
</style>
