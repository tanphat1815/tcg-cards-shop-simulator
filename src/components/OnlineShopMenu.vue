<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useStatsStore } from '../stores/modules/statsStore'
import { useInventoryStore } from '../stores/modules/inventoryStore'
import { useShopStore } from '../stores/modules/shopStore'
import { useStaffStore } from '../stores/modules/staffStore'
import { useApiStore } from '../stores/modules/apiStore'
import { useButton, useIconButton } from '../composables/useButton'
import { FURNITURE_ITEMS } from '../config/shopData'

const gameStore = useGameStore()
const statsStore = useStatsStore()
const inventoryStore = useInventoryStore()
const shopStore = useShopStore()
const staffStore = useStaffStore()
const apiStore = useApiStore()
const activeTab = ref<'STOCK' | 'FURNITURE' | 'STAFF' | 'RENO' | 'SETTINGS'>('STOCK')

// Button composables for purchase actions
const purchaseStockBtn = useButton('primary', 'md', false, false, true)
const purchaseFurnitureBtn = useButton('primary', 'md', false, false, true)
const hireWorkerBtn = useButton('primary', 'md', false, false, true)
const purchaseExpansionBtn = useButton('warning', 'md', false, false, true)
const terminateWorkerBtn = useIconButton('danger', 'sm')
import { WORKERS } from '../config/workerData'
import { EXPANSIONS_LOT_A } from '../config/expansionData'

const shopItems = computed(() => {
  return Object.values(inventoryStore.shopItems)
    .sort((a, b) => {
      if (a.requiredLevel !== b.requiredLevel) return a.requiredLevel - b.requiredLevel
      return a.name.localeCompare(b.name)
    })
})

const isShopLoading = computed(() => apiStore.isLoading)
const shopError = computed(() => apiStore.error)

watch(() => gameStore.showOnlineShop, (opened) => {
  if (opened) {
    apiStore.initSeriesShop('swsh')
  }
})

const purchaseStock = (id: string, price: number) => {
  if (statsStore.money < price) {
    alert("Không đủ tiền mua hàng!")
    return
  }
  const success = inventoryStore.buyStock(id, 1)
  if (success) {
    // Play cha-ching sound or visual feedback (can be improved later)
  }
}

const purchaseFurniture = (id: string, price: number) => {
  if (statsStore.money < price) {
    alert("Không đủ tiền sắm nội thất!")
    return
  }
  const success = shopStore.buyFurniture(id)
  if (success) {
    // Play cha-ching
  }
}

const hireWorker = (workerId: string) => {
  const success = staffStore.hireWorker(workerId)
  if (!success) {
    alert("Không đủ tiền hoặc Level chưa đạt yêu cầu!")
  }
}

const purchaseExpansion = () => {
  const success = statsStore.buyExpansion()
  if (!success) {
    alert("Không đủ tiền hoặc Level chưa đạt yêu cầu mở rộng!")
  }
}

const getWorkerData = (id: string) => WORKERS.find(w => w.id === id)
</script>

<template>
  <div v-if="gameStore.showOnlineShop" class="absolute inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
    <div class="bg-white rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden font-sans">
      
      <!-- Browser Header Toolbar -->
      <div class="bg-gray-200 border-b border-gray-300 px-4 py-3 flex items-center gap-3">
        <div class="flex gap-2">
          <div class="w-3 h-3 rounded-full bg-red-400"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div class="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div class="flex-grow flex justify-center">
          <div class="bg-white cursor-pointer px-4 py-1.5 rounded-md text-sm text-gray-500 w-2/3 max-w-lg text-center shadow-inner border border-gray-200 flex items-center justify-center gap-2">
            <span>🔒</span> https://tcg-distributor.market.com
          </div>
        </div>
        <button @click="gameStore.setShowOnlineShop(false)" class="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- E-commerce Header -->
      <div class="bg-indigo-600 text-white px-8 py-5 flex justify-between items-center shadow-md z-10 relative">
        <div>
          <h1 class="text-3xl font-black italic tracking-tighter shadow-black drop-shadow-sm">TCG DISTRIBUTOR HUB</h1>
          <p class="text-indigo-200 text-sm font-medium">Đối tác cung ứng vật tư & mở rộng kinh doanh</p>
        </div>
        <div class="bg-indigo-800/50 p-2 py-1 rounded border border-indigo-500/50 text-xl font-mono text-yellow-300 font-bold shadow-inner">
          Số dư: ${{ statsStore.money.toFixed(2) }}
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex bg-gray-100 border-b border-gray-300 px-8 pt-3 shadow-sm z-0">
        <button 
          @click="activeTab = 'STOCK'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'STOCK' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          📦 Chợ Nhập Hàng (Stock)
        </button>
        <button 
          @click="activeTab = 'FURNITURE'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'FURNITURE' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          🪑 Nội Thất Shop (Furniture)
        </button>
        <button 
          @click="activeTab = 'STAFF'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'STAFF' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          👨‍💼 Nhân Sự (Staff)
        </button>
        <button 
          @click="activeTab = 'RENO'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'RENO' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          🛠️ Cải Tạo (Reno)
        </button>
        <button 
          @click="activeTab = 'SETTINGS'"
          class="px-6 py-3 font-bold uppercase tracking-wider rounded-t-lg transition-colors border-x border-t border-transparent"
          :class="activeTab === 'SETTINGS' ? 'bg-white text-indigo-700 border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'text-gray-500 hover:bg-gray-200'"
        >
          ⚙️ Cài Đặt (Settings)
        </button>
      </div>

      <!-- Main Content -->
      <div class="bg-gray-50 flex-grow p-8 overflow-y-auto custom-scroll">
        
        <!-- Stock Tab -->
        <div v-if="activeTab === 'STOCK'" class="space-y-4">
          <div v-if="isShopLoading" class="rounded-2xl bg-white/90 border border-gray-200 p-6 text-center text-gray-700">
            Đang tải danh sách Set từ TCGdex... Vui lòng đợi.
          </div>
          <div v-if="shopError" class="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
            Lỗi tải shop API: {{ shopError }}
          </div>
          <div v-if="!isShopLoading && shopItems.length === 0" class="rounded-2xl bg-white/90 border border-gray-200 p-6 text-center text-gray-700">
            Chưa có mặt hàng nào. Kiểm tra lại kết nối API hoặc tải lại cửa hàng.
          </div>
          <div v-if="!isShopLoading && shopItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div 
              v-for="item in shopItems" 
              :key="item.id"
              class="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 relative group flex flex-col"
            >
              <!-- Lock Overlay if Level not met -->
              <div v-if="statsStore.level < item.requiredLevel" class="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
                <span class="text-4xl mb-2">🔒</span>
                <div class="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-sm shadow-xl border-2 border-red-800">
                  Unlock at Level {{ item.requiredLevel }}
                </div>
              </div>

              <div class="h-40 bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4 border-b border-gray-100" :class="{ 'grayscale blur-[1px]': statsStore.level < item.requiredLevel }">
                 <div class="text-[80px] drop-shadow-xl transform group-hover:scale-110 transition-transform">
                   🎁
                 </div>
              </div>
              <div class="p-5 flex flex-col flex-grow" :class="{ 'grayscale opacity-70': statsStore.level < item.requiredLevel }">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-gray-900 text-lg leading-tight">{{ item.name }}</h3>
                  <span v-if="inventoryStore.shopInventory[item.id]" class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                    Có: {{ inventoryStore.shopInventory[item.id] }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 mb-4 line-clamp-2 h-8">{{ item.description }}</p>
                
                <div class="mt-auto bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                   <div class="flex justify-between text-sm mb-1">
                     <span class="text-gray-500">Giá nhập (Cost):</span>
                     <span class="font-bold text-gray-800">${{ item.buyPrice }}</span>
                   </div>
                   <div class="flex justify-between text-sm">
                     <span class="text-gray-500">Giá bán dự kiến:</span>
                     <span class="font-bold text-green-600">${{ item.sellPrice }}</span>
                   </div>
                </div>

                <button 
                  :disabled="statsStore.level < item.requiredLevel"
                  @click="purchaseStock(item.id, item.buyPrice)"
                  :class="purchaseStockBtn.classes"
                  class="uppercase tracking-wider"
                >
                  Nhập Ngay (${{ item.buyPrice }})
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Furniture Tab -->
        <div v-if="activeTab === 'FURNITURE'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div 
            v-for="item in Object.values(FURNITURE_ITEMS)" 
            :key="item.id"
            class="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 relative group flex flex-col"
          >
            <!-- Lock Overlay if Level not met -->
            <div v-if="statsStore.level < item.requiredLevel" class="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-4xl mb-2">🔒</span>
              <div class="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-sm shadow-xl border-2 border-red-800">
                Unlock at Level {{ item.requiredLevel }}
              </div>
            </div>

            <div class="h-40 bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4 border-b border-gray-100" :class="{ 'grayscale blur-[1px]': statsStore.level < item.requiredLevel }">
               <div class="text-[80px] drop-shadow-xl transform group-hover:scale-110 transition-transform">
                 🪑
               </div>
            </div>
            <div class="p-5 flex flex-col flex-grow" :class="{ 'grayscale opacity-70': statsStore.level < item.requiredLevel }">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-gray-900 text-lg leading-tight">{{ item.name }}</h3>
                <span v-if="shopStore.purchasedFurniture[item.id]" class="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                  Kho: {{ shopStore.purchasedFurniture[item.id] }}
                </span>
              </div>
              <p class="text-xs text-gray-500 mb-4 line-clamp-2 h-8">{{ item.description }}</p>
              
              <div class="mt-auto bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                 <div class="flex justify-between text-sm mb-1">
                   <span class="text-gray-500">Giá mua:</span>
                   <span class="font-bold text-gray-800">${{ item.buyPrice }}</span>
                 </div>
              </div>

              <button 
                :disabled="statsStore.level < item.requiredLevel"
                @click="purchaseFurniture(item.id, item.buyPrice)"
                :class="purchaseFurnitureBtn.classes"
                class="uppercase tracking-wider"
              >
                Mua Ngay (${{ item.buyPrice }})
              </button>
            </div>
          </div>
        </div>

        <!-- Staff Tab -->
        <div v-if="activeTab === 'STAFF'" class="flex flex-col gap-10">
          
          <!-- Hired Staff Management -->
          <div v-if="staffStore.hiredWorkers.length > 0" class="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
            <h2 class="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
              📋 QUẢN LÝ NHÂN VIÊN HIỆN CÓ ({{ staffStore.hiredWorkers.length }})
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="hw in staffStore.hiredWorkers" :key="hw.instanceId" class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl shadow-inner">
                  👤
                </div>
                <div class="flex-grow">
                  <h4 class="font-bold text-gray-900">{{ getWorkerData(hw.workerId)?.name }}</h4>
                  <div class="flex flex-col gap-1.5 mt-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase min-w-[60px]">Nhiệm vụ:</span>
                      <select 
                        v-model="hw.duty" 
                        @change="staffStore.changeWorkerDuty(hw.instanceId, hw.duty, (Object.keys(shopStore.placedCashiers).length === 1 ? Object.keys(shopStore.placedCashiers)[0] : hw.targetDeskId))"
                        class="text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded px-1 py-0.5 focus:ring-0"
                      >
                        <option value="NONE">Đang nghỉ</option>
                        <option value="CASHIER">Thu ngân</option>
                        <option value="STOCKER">Xếp hàng</option>
                      </select>
                    </div>

                    <!-- Chỉ hiển thị chọn quầy nếu là Thu ngân và có từ 2 quầy trở lên -->
                    <div v-if="hw.duty === 'CASHIER' && Object.keys(shopStore.placedCashiers).length > 1" class="flex items-center gap-2">
                      <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase min-w-[60px]">Quầy:</span>
                      <select 
                        v-model="hw.targetDeskId"
                        @change="staffStore.changeWorkerDuty(hw.instanceId, hw.duty, hw.targetDeskId)"
                        class="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded px-1 py-0.5 focus:ring-0"
                      >
                        <option disabled value="">-- Chọn quầy --</option>
                        <option v-for="desk in shopStore.placedCashiers" :key="desk.id" :value="desk.id">
                          {{ desk.id.includes('default') ? 'Quầy mặc định' : desk.id.replace('cashier_', 'Quầy #') }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
                <button @click="staffStore.terminateWorker(hw.instanceId)" :class="terminateWorkerBtn.classes" title="Đuổi việc">
                   🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- Recruitment App (GO Recruit) -->
          <div>
            <div class="flex items-center gap-3 mb-6">
               <div class="bg-indigo-600 text-white p-2 rounded-lg text-xl font-bold italic shadow-lg">GO</div>
               <h2 class="text-xl font-black text-gray-800 uppercase tracking-tight">Recruit - Ứng tuyển nhân sự</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div v-for="w in WORKERS" :key="w.id" class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 relative group flex flex-col">
                <!-- Level Lock -->
                <div v-if="statsStore.level < w.levelUnlocked" class="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                  <span class="text-2xl mb-1">🔒</span>
                  <div class="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Level {{ w.levelUnlocked }} Required</div>
                </div>

                <div class="h-24 bg-gradient-to-r from-gray-100 to-white flex items-center px-6 gap-4 border-b border-gray-100">
                  <div class="w-16 h-16 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center text-4xl shadow-sm">👤</div>
                  <div>
                    <h3 class="font-bold text-gray-900 text-lg leading-none">{{ w.name }}</h3>
                    <span class="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1 block">Level {{ w.levelUnlocked }}</span>
                  </div>
                </div>

                <div class="p-5 flex-grow">
                  <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span class="text-[9px] text-gray-500 uppercase block">Checkout</span>
                      <span class="text-xs font-bold" :class="w.checkoutSpeed === 'Very Fast' ? 'text-green-600' : 'text-gray-700'">{{ w.checkoutSpeed }}</span>
                    </div>
                    <div class="bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span class="text-[9px] text-gray-500 uppercase block">Restock</span>
                      <span class="text-xs font-bold" :class="w.restockSpeed === 'Very Fast' ? 'text-green-600' : 'text-gray-700'">{{ w.restockSpeed }}</span>
                    </div>
                    <div class="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                      <span class="text-[9px] text-indigo-500 uppercase block">Hiring Fee</span>
                      <span class="text-xs font-bold text-indigo-700">${{ w.hiringFee }}</span>
                    </div>
                    <div class="bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <span class="text-[9px] text-orange-500 uppercase block">Daily Salary</span>
                      <span class="text-xs font-bold text-orange-700">${{ w.salary }}/day</span>
                    </div>
                  </div>

                  <button 
                    :disabled="statsStore.level < w.levelUnlocked || staffStore.hiredWorkers.some(hw => hw.workerId === w.id)"
                    @click="hireWorker(w.id)"
                    :class="hireWorkerBtn.classes"
                    class="uppercase tracking-wider"
                  >
                    {{ staffStore.hiredWorkers.some(hw => hw.workerId === w.id) ? 'Đang Thuê' : 'Thuê Ngay' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RENO BIGG Tab -->
        <div v-if="activeTab === 'RENO'" class="flex flex-col gap-6">
          <div class="bg-gradient-to-r from-orange-100 to-amber-50 p-8 rounded-2xl border border-orange-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 class="text-4xl font-black text-orange-600 italic tracking-tighter flex items-center gap-4">
                RENO <span class="bg-orange-600 text-white px-3 py-1 rounded italic not-italic text-2xl">BIGG</span>
              </h2>
              <p class="text-orange-900/60 font-bold uppercase text-xs tracking-widest mt-2">Dịch vụ đập tường & nới rộng mặt bằng chuyên nghiệp</p>
            </div>
            <div class="text-right">
              <span class="block text-[10px] text-gray-500 font-bold uppercase">Expansion Status</span>
              <span class="text-2xl font-black text-gray-800">LEVEL {{ statsStore.expansionLevel }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div 
              v-for="exp in EXPANSIONS_LOT_A" 
              :key="exp.id"
              class="bg-white rounded-2xl overflow-hidden shadow-sm border-2 flex flex-col relative transition-all group"
              :class="[
                statsStore.expansionLevel >= exp.id ? 'border-green-500/30 bg-green-50/10' : 'border-gray-100',
                statsStore.expansionLevel + 1 === exp.id ? 'ring-2 ring-orange-500/20 scale-[1.02] shadow-xl z-10' : ''
              ]"
            >
              <!-- Purchased Overlay -->
              <div v-if="statsStore.expansionLevel >= exp.id" class="absolute inset-0 bg-green-500/5 backdrop-blur-[1px] z-10 pointer-events-none flex items-center justify-center">
                <div class="bg-green-500 text-white p-2 rounded-full shadow-lg transform -rotate-12 border-2 border-white">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>

              <!-- Level Lock -->
              <div v-if="statsStore.level < exp.requiredLevel && statsStore.expansionLevel < exp.id" class="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                 <span class="text-3xl mb-1">🔒</span>
                 <p class="text-white font-black text-[10px] bg-red-600 px-3 py-1 rounded-full uppercase">Level {{ exp.requiredLevel }}</p>
              </div>

              <div class="h-40 bg-gray-100 flex items-center justify-center p-6 border-b border-gray-100">
                <div class="text-[90px] drop-shadow-lg group-hover:rotate-12 transition-transform duration-300">🔨</div>
              </div>

              <div class="p-5 flex-grow flex flex-col">
                <h3 class="font-black text-gray-800 text-sm uppercase tracking-tight mb-4">Shop Expansion {{ exp.id }}</h3>
                
                <div class="space-y-2 mb-6">
                  <div class="flex justify-between text-xs font-bold">
                    <span class="text-gray-400">Chi phí:</span>
                    <span class="text-gray-800">${{ exp.cost }}</span>
                  </div>
                  <div class="flex justify-between text-xs font-bold">
                    <span class="text-gray-400">Tăng diện tích:</span>
                    <span class="text-blue-600">+1 Unit</span>
                  </div>
                  <div class="flex justify-between text-xs font-bold">
                    <span class="text-gray-400">Thuế/Ngày:</span>
                    <span class="text-red-500">+${{ exp.rentIncrease }}</span>
                  </div>
                </div>

                <button 
                  v-if="statsStore.expansionLevel < exp.id"
                  @click="purchaseExpansion"
                  :disabled="statsStore.expansionLevel + 1 !== exp.id || statsStore.money < exp.cost || statsStore.level < exp.requiredLevel"
                  :class="purchaseExpansionBtn.classes"
                  class="text-xs tracking-widest uppercase"
                >
                  {{ statsStore.expansionLevel + 1 === exp.id ? 'Mở Rộng Ngay' : 'Đang Khóa' }}
                </button>
                <div v-else class="text-center font-black text-green-600 uppercase text-xs tracking-widest py-3">
                  Đã Hoàn Thành
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'SETTINGS'" class="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-2xl mx-auto">
          <div class="bg-indigo-700 px-8 py-4 text-white font-bold flex items-center gap-2">
            <span>⚙️</span> Cấu hình hệ thống & Hiển thị
          </div>
          <div class="p-8 space-y-8">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-300 transition-colors">
              <div>
                <h4 class="font-bold text-gray-900 leading-tight">Hiển thị khung va chạm (Debug Physics)</h4>
                <p class="text-sm text-gray-500 mt-1">Bật/tắt các đường bao màu sắc giúp kiểm tra lỗi đặt đồ vật.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="statsStore.settings.showDebugPhysics" class="sr-only peer">
                <div class="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div class="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-800 text-sm">
              <p><strong>Mẹo:</strong> Bạn cũng có thể nhấn phím <kbd class="px-1.5 py-0.5 bg-white border border-indigo-200 rounded text-xs font-bold">G</kbd> trong khi chơi để bật/tắt nhanh chế độ này.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 8px; }
.custom-scroll::-webkit-scrollbar-track { background: #f3f4f6; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
