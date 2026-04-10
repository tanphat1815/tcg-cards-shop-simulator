<script setup lang="ts">
import { onMounted } from 'vue'
import GameContainer from './components/GameContainer.vue'
import UIOverlay from './components/UIOverlay.vue'
import PackOpeningOverlay from './components/PackOpeningOverlay.vue'
import EndOfDayModal from './components/EndOfDayModal.vue'
import BinderMenu from './components/BinderMenu.vue'
import { useGameStore } from './stores/gameStore'

const store = useGameStore()

onMounted(() => {
  store.loadSave()
  
  store.$subscribe((mutation, state) => {
    localStorage.setItem('tcg-shop-save', JSON.stringify({
      money: state.money,
      inventory: state.inventory,
      binder: state.binder,
      shelves: state.shelves,
      currentDay: state.currentDay,
      timeInMinutes: state.timeInMinutes,
      shopState: state.shopState
    }))
  }, { deep: true })
})
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-gray-900">
    <GameContainer />
    <UIOverlay />
    <PackOpeningOverlay />
    <EndOfDayModal />
    <BinderMenu />
  </div>
</template>
