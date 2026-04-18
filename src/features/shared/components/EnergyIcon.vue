<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: string
  size?: 'sm' | 'md' | 'lg'
}>()

const iconClass = computed(() => {
  const t = props.type.toLowerCase().trim()
  // Mapping từ kiểu dữ liệu trả về của API sang class CSS trong globals.css
  if (t.includes('fire')) return 'icon-fire'
  if (t.includes('water')) return 'icon-water'
  if (t.includes('grass')) return 'icon-grass'
  if (t.includes('electric') || t.includes('lightning')) return 'icon-lightning'
  if (t.includes('psychic')) return 'icon-psychic'
  if (t.includes('fighting')) return 'icon-fighting'
  if (t.includes('darkness') || t.includes('dark')) return 'icon-darkness'
  if (t.includes('metal') || t.includes('steel')) return 'icon-metal'
  if (t.includes('fairy')) return 'icon-fairy'
  if (t.includes('dragon')) return 'icon-dragon'
  if (t.includes('colorless') || t.includes('normal')) return 'icon-colorless'
  
  return 'icon-colorless' // Fallback
})

const scale = computed(() => {
  if (props.size === 'sm') return 18 / 25
  if (props.size === 'lg') return 32 / 25
  return 26 / 25 // Default md
})
</script>

<template>
  <div class="energy-icon-wrapper" :style="{ width: (25 * scale) + 'px', height: (25 * scale) + 'px' }">
    <div 
      class="energy-icon" 
      :class="iconClass"
      :style="{ 
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }"
    ></div>
  </div>
</template>

<style scoped>
.energy-icon-wrapper {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  overflow: visible;
}

.energy-icon {
  display: block;
  flex-shrink: 0;
}
</style>
