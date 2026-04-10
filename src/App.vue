<script setup lang="ts">
import GameContainer from './components/GameContainer.vue'
import UIOverlay from './components/UIOverlay.vue'
import PackOpeningOverlay from './components/PackOpeningOverlay.vue'
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-gray-900">
    <GameContainer />
    <UIOverlay />
    <PackOpeningOverlay />
  </div>
</template>
