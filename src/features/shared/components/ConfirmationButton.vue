<template>
  <EnhancedButton
    v-bind="$attrs"
    :loading="isConfirming"
    :loading-text="confirmText"
    @click="handleClick"
  >
    <slot v-if="!isConfirming">{{ text }}</slot>
  </EnhancedButton>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EnhancedButton from './EnhancedButton.vue'
import type { EnhancedButtonConfig } from '../composables/useEnhancedButton'

interface Props extends EnhancedButtonConfig {
  text?: string
  confirmText?: string
  confirmDelay?: number
  onConfirm?: () => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  text: 'Delete',
  confirmText: 'Confirm?',
  confirmDelay: 2000
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isConfirming = ref(false)
let confirmTimeout: ReturnType<typeof setTimeout> | null = null

const handleClick = async () => {
  if (isConfirming.value) {
    // User confirmed - execute action
    try {
      if (props.onConfirm) {
        await props.onConfirm()
      }
      emit('confirm')
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      isConfirming.value = false
      if (confirmTimeout) {
        clearTimeout(confirmTimeout)
        confirmTimeout = null
      }
    }
  } else {
    // Start confirmation process
    isConfirming.value = true

    // Auto-cancel after delay
    confirmTimeout = setTimeout(() => {
      isConfirming.value = false
      emit('cancel')
      confirmTimeout = null
    }, props.confirmDelay)
  }
}

// Cleanup on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (confirmTimeout) {
    clearTimeout(confirmTimeout)
  }
})
</script>