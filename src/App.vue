<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameContainer from './components/GameContainer.vue'
import UIOverlay from './components/UIOverlay.vue'
import PackOpeningOverlay from './components/PackOpeningOverlay.vue'
import EndOfDayModal from './components/EndOfDayModal.vue'
import BinderMenu from './components/BinderMenu.vue'
import ShelfManagementMenu from './components/ShelfManagementMenu.vue'
import OnlineShopMenu from './components/OnlineShopMenu.vue'
import DevModeMenu from './components/DevModeMenu.vue'
import BuildMenu from './components/BuildMenu.vue'
import SettingsModal from './components/SettingsModal.vue'
import { saveSystem } from './utils/saveSystem'

/**
 * Khởi tạo game và hệ thống tự động lưu.
 */
let saveInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Tải dữ liệu đã lưu khi vào game
  saveSystem.loadGame()
  
  // Thiết lập tự động lưu sau mỗi 30 giây
  saveInterval = setInterval(() => {
    saveSystem.saveGame()
  }, 30000)
})

onUnmounted(() => {
  if (saveInterval) clearInterval(saveInterval)
  // Lưu lần cuối trước khi thoát (nếu có thể)
  saveSystem.saveGame()
})
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-gray-900">
    <GameContainer />
    <UIOverlay />
    <PackOpeningOverlay />
    <EndOfDayModal />
    <BinderMenu />
    <ShelfManagementMenu />
    <OnlineShopMenu />
    <DevModeMenu />
    <BuildMenu />
    <SettingsModal />
  </div>
</template>
