import { ref, computed, readonly } from 'vue'

export interface ConfirmationConfig {
  text?: string
  confirmText?: string
  confirmDelay?: number
  onConfirm?: () => void | Promise<void>
}

export function useConfirmationButton(config: ConfirmationConfig = {}) {
  const {
    text = 'Delete',
    confirmText = 'Confirm?',
    confirmDelay = 2000,
    onConfirm
  } = config

  const isConfirming = ref(false)
  let confirmTimeout: ReturnType<typeof setTimeout> | null = null

  const buttonText = computed(() => {
    return isConfirming.value ? confirmText : text
  })

  const handleClick = async () => {
    if (isConfirming.value) {
      // User confirmed - execute action
      try {
        if (onConfirm) {
          await onConfirm()
        }
        return true // Success
      } catch (error) {
        console.error('Confirmation action failed:', error)
        return false // Failed
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
        confirmTimeout = null
      }, confirmDelay)

      return false // Not confirmed yet
    }
  }

  const cancel = () => {
    isConfirming.value = false
    if (confirmTimeout) {
      clearTimeout(confirmTimeout)
      confirmTimeout = null
    }
  }

  // Cleanup function
  const cleanup = () => {
    if (confirmTimeout) {
      clearTimeout(confirmTimeout)
    }
  }

  return {
    isConfirming: readonly(isConfirming),
    buttonText,
    handleClick,
    cancel,
    cleanup
  }
}