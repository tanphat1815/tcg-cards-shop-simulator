<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore } from '../stores/modules/inventoryStore'
import { useShopStore } from '../stores/modules/shopStore'
import { STOCK_ITEMS } from '../config/shopData'

const inventoryStore = useInventoryStore()
const shopStore = useShopStore()
const selectedItemId = ref<string | null>(null)

/**
 * Trả về dữ liệu của kệ đang được mở menu quản lý.
 */
const shelfData = computed(() => {
  if (!shopStore.activeShelfId) return null
  return shopStore.placedShelves[shopStore.activeShelfId]
})

/**
 * Danh sách các vật phẩm có sẵn trong kho có thể bày lên kệ.
 */
const inventoryItems = computed(() => {
  return Object.keys(inventoryStore.shopInventory)
    .map(itemId => ({
      id: itemId,
      item: STOCK_ITEMS[itemId as keyof typeof STOCK_ITEMS],
      quantity: inventoryStore.shopInventory[itemId]
    }))
    .filter(x => x.item !== undefined && x.quantity > 0)
})

const selectItem = (id: string) => { selectedItemId.value = id }

/**
 * Xử lý khi click vào một tầng kệ để đặt đồ.
 */
const handleTierClick = (tierIndex: number, event: MouseEvent) => {
  if (!selectedItemId.value || !shopStore.activeShelfId) return
  
  if (event.shiftKey) {
    // Fill full tier
    const shelf = shopStore.placedShelves[shopStore.activeShelfId]
    const itemData = STOCK_ITEMS[selectedItemId.value as keyof typeof STOCK_ITEMS]
    const tier = shelf.tiers[tierIndex]
    const maxSlots = itemData.type === 'box' ? 4 : 32

    if (tier.itemId === null || tier.itemId === selectedItemId.value) {
      if (tier.itemId === null) {
        tier.itemId = selectedItemId.value
        tier.maxSlots = maxSlots
      }
      const spaceLeft = tier.maxSlots - tier.slots.length
      const available = inventoryStore.shopInventory[selectedItemId.value] ?? 0
      const toAdd = Math.min(spaceLeft, available)

      for (let i = 0; i < toAdd; i++) {
        tier.slots.push(selectedItemId.value)
      }
      inventoryStore.shopInventory[selectedItemId.value] -= toAdd
      if (inventoryStore.shopInventory[selectedItemId.value] <= 0) {
          delete inventoryStore.shopInventory[selectedItemId.value]
          selectedItemId.value = null
      }
    }
  } else {
    // Add 1 item
    const shelf = shopStore.placedShelves[shopStore.activeShelfId]
    const itemData = STOCK_ITEMS[selectedItemId.value as keyof typeof STOCK_ITEMS]
    const tier = shelf.tiers[tierIndex]

    if (tier.itemId === null || tier.itemId === selectedItemId.value) {
      if (tier.itemId === null) {
        tier.itemId = selectedItemId.value
        tier.maxSlots = itemData.type === 'box' ? 4 : 32
      }
      if (tier.slots.length < tier.maxSlots) {
        tier.slots.push(selectedItemId.value)
        inventoryStore.shopInventory[selectedItemId.value]--
        if (inventoryStore.shopInventory[selectedItemId.value] <= 0) {
            delete inventoryStore.shopInventory[selectedItemId.value]
            selectedItemId.value = null
        }
      }
    }
  }
}

/**
 * Thu hồi toàn bộ hàng từ một tầng kệ về kho.
 */
const clearTier = (tierIndex: number) => {
  if (!shelfData.value) return
  const tier = shelfData.value.tiers[tierIndex]
  if (!tier.itemId) return

  inventoryStore.addItemsToInventory(tier.itemId, tier.slots.length)
  tier.itemId = null
  tier.slots = []
  tier.maxSlots = 0
}

/**
 * Kiểm tra xem vật phẩm đang chọn có thể đặt vào tầng này không.
 */
const canPlaceInTier = (tierIndex: number) => {
  if (!selectedItemId.value || !shelfData.value) return false
  const tier = shelfData.value.tiers[tierIndex]
  if (tier.itemId === null) return true
  if (tier.itemId === selectedItemId.value) return tier.slots.length < tier.maxSlots
  return false
}

// Tier fill percentage
const tierFillPct = (tierIndex: number): number => {
  if (!shelfData.value) return 0
  const tier = shelfData.value.tiers[tierIndex]
  if (!tier.itemId || tier.maxSlots === 0) return 0
  return (tier.slots.length / tier.maxSlots) * 100
}

</script>

<template>
  <div v-if="shopStore.showShelfMenu && shelfData"
    class="absolute inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-auto p-4">
    <div class="bg-gray-900 border-2 border-indigo-500/50 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">

      <!-- Header -->
      <div class="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700 shrink-0">
        <h2 class="text-2xl font-black text-white flex items-center gap-2">
          🗄️ KỆ HÀNG &nbsp;<span class="text-indigo-400 text-base font-medium">({{ shelfData.id }})</span>
        </h2>
        <div class="flex items-center gap-3">
          <button @click="shopStore.clearEntireShelf(shopStore.activeShelfId!)" class="bg-red-900/60 hover:bg-red-700 text-red-200 text-xs font-bold px-4 py-2 uppercase tracking-wider rounded shadow transition-colors border border-red-700/50">
            Rút tất cả về Kho
          </button>
          <button @click="shopStore.closeShelfManagement()" class="text-gray-400 hover:text-white bg-gray-700 hover:bg-red-500 p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div class="flex-grow flex overflow-hidden min-h-0">

        <!-- Left: Inventory selection -->
        <div class="w-[220px] shrink-0 border-r border-gray-700 bg-gray-900/50 p-4 flex flex-col relative">
          <h3 class="text-sm font-bold text-gray-200 mb-3 pb-2 border-b border-gray-700 uppercase tracking-wider">📦 Kho hàng</h3>

          <div v-if="inventoryItems.length === 0" class="text-center text-gray-500 italic mt-10 text-sm">
            Kho đang trống.
          </div>

          <div v-else class="flex-grow overflow-y-auto pr-1 custom-scroll space-y-2">
            <div
              v-for="inv in inventoryItems" :key="inv.id"
              @click="selectItem(inv.id)"
              class="flex justify-between items-center p-3 rounded-xl border-2 cursor-pointer transition-all"
              :class="selectedItemId === inv.id
                ? 'bg-indigo-900/50 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                : 'bg-gray-800/60 border-gray-700/40 hover:bg-gray-700'"
            >
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-[13px] text-yellow-300 truncate flex items-center gap-1">
                  {{ inv.item?.type === 'box' ? '📦' : '🎁' }} {{ inv.item?.name }}
                </span>
                <span class="text-[10px] text-gray-400 mt-0.5">
                  SL/Tầng: {{ inv.item?.type === 'box' ? '4' : '32' }}
                </span>
              </div>
              <div class="bg-gray-950 text-green-400 px-2 py-0.5 rounded text-sm font-mono border border-gray-700 ml-2 shrink-0">
                x{{ inv.quantity }}
              </div>
            </div>
          </div>

          <div v-if="selectedItemId" class="mt-3 pt-3 border-t border-gray-700">
            <p class="text-[11px] text-indigo-300 text-center mb-2">
              ✅ Đang chọn: <br><strong class="text-yellow-300">{{ STOCK_ITEMS[selectedItemId]?.name }}</strong>
            </p>
            <p class="text-[10px] text-gray-500 text-center italic">
              Shift+Click vào tầng để điền đầy
            </p>
          </div>
        </div>

        <!-- Right: Shelf Tiers -->
        <div class="flex-grow p-6 flex flex-col gap-4 overflow-y-auto custom-scroll">
          <p class="text-[11px] text-gray-400 italic shrink-0">Mẹo: Chọn hàng bên trái → Click vào Tầng để đặt từng cái, hoặc <kbd class="bg-gray-800 px-1 rounded text-gray-300">Shift</kbd>+Click để điền đầy tầng.</p>

          <!-- 3 Tiers -->
          <div
            v-for="(tier, tierIdx) in shelfData.tiers"
            :key="tierIdx"
            class="rounded-xl border-2 overflow-hidden shrink-0 transition-all"
            :class="{
              'border-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.2)]': selectedItemId && canPlaceInTier(tierIdx),
              'border-gray-700/50': !selectedItemId || !canPlaceInTier(tierIdx),
              'border-red-900/50': selectedItemId && !canPlaceInTier(tierIdx) && tier.itemId !== null,
            }"
          >
            <!-- Tier Header -->
            <div
              class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 cursor-pointer group"
              @click="handleTierClick(tierIdx, $event)"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-black text-gray-400 uppercase tracking-widest">Tầng {{ tierIdx + 1 }}</span>

                <!-- Tier status / item info -->
                <div v-if="tier.itemId" class="flex items-center gap-2">
                  <span class="text-sm">{{ STOCK_ITEMS[tier.itemId]?.type === 'box' ? '📦' : '🎁' }}</span>
                  <span class="text-xs font-bold text-white">{{ STOCK_ITEMS[tier.itemId]?.name }}</span>
                  <span class="text-xs text-gray-400">{{ tier.slots.length }}/{{ tier.maxSlots }}</span>
                  <!-- Fill bar -->
                  <div class="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-yellow-400 transition-all" :style="{ width: `${tierFillPct(tierIdx)}%` }"></div>
                  </div>
                </div>
                <span v-else class="text-xs text-gray-500 italic">[ Tầng trống – Click để đặt hàng ]</span>
              </div>

              <div class="flex items-center gap-2">
                <span v-if="selectedItemId && canPlaceInTier(tierIdx)" class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Click để đặt · Shift để điền đầy
                </span>
                <button
                  v-if="tier.itemId"
                  @click.stop="clearTier(tierIdx)"
                  class="bg-red-800/50 hover:bg-red-600 text-red-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider transition-colors border border-red-700/50"
                >
                  Rút hết
                </button>
              </div>
            </div>

            <!-- Tier Content: Pack Grid -->
            <div class="bg-gray-950/50 p-3 min-h-[80px] flex flex-col justify-center">
              <!-- Empty hint -->
              <div v-if="!tier.itemId" class="flex justify-center items-center h-16 text-gray-700 text-sm italic">
                — trống —
              </div>

              <!-- Pack tier: compact vertical-stacking grid, 4 columns -->
              <div v-else-if="STOCK_ITEMS[tier.itemId]?.type === 'pack'"
                class="grid gap-[3px]"
                style="grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(8, auto);"
              >
                <div
                  v-for="n in tier.maxSlots"
                  :key="n"
                  class="rounded-sm border flex items-center justify-center transition-colors"
                  :class="n <= tier.slots.length
                    ? 'bg-gradient-to-b from-blue-500 to-indigo-700 border-indigo-400/60'
                    : 'bg-gray-800/50 border-gray-700/30 border-dashed'"
                  style="height: 22px;"
                >
                  <span v-if="n <= tier.slots.length" class="text-[10px] leading-none">🎁</span>
                  <span v-else class="text-gray-700 text-[8px]">·</span>
                </div>
              </div>

              <!-- Box tier: 4 large slots -->
              <div v-else-if="STOCK_ITEMS[tier.itemId]?.type === 'box'"
                class="grid grid-cols-4 gap-3"
              >
                <div
                  v-for="n in tier.maxSlots"
                  :key="n"
                  class="rounded-lg border-2 flex flex-col items-center justify-center py-3 transition-colors"
                  :class="n <= tier.slots.length
                    ? 'bg-gradient-to-b from-orange-500/30 to-yellow-600/30 border-yellow-500/60 shadow-inner'
                    : 'bg-gray-800/30 border-gray-700/30 border-dashed'"
                  style="height: 80px;"
                >
                  <span v-if="n <= tier.slots.length" class="text-3xl">📦</span>
                  <span v-else class="text-gray-700 text-xl">·</span>
                </div>
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
