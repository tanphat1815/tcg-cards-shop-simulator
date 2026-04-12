<template>
  <div class="inline-block animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" :class="sizeClasses[size]">
    <span class="sr-only">Loading...</span>
  </div>
</template>

<script setup lang="ts">
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  size?: SpinnerSize
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
}
</script>