<script setup lang="ts">
/**
 * AlertDialog.vue - Modal thông báo đơn
 * 
 * Sử dụng:
 * <AlertDialog
 *   :isOpen="showAlert"
 *   title="Thông báo"
 *   message="Thao tác thành công!"
 *   @close="showAlert = false"
 * />
 */
import BaseModal from './BaseModal.vue'

interface Props {
  isOpen: boolean
  title?: string
  message?: string
  buttonText?: string
  type?: 'info' | 'success' | 'warning' | 'error'
}

withDefaults(defineProps<Props>(), {
  title: 'Thông báo',
  message: '',
  buttonText: 'Đóng',
  type: 'info',
})

const emit = defineEmits<{
  close: []
}>()

const typeConfig = {
  info: { border: 'border-blue-500/30', icon: '💬' },
  success: { border: 'border-green-500/30', icon: '✓' },
  warning: { border: 'border-yellow-500/30', icon: '⚠' },
  error: { border: 'border-red-500/30', icon: '✕' },
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="title"
    size="sm"
    @close="emit('close')"
  >
    <template #default>
      <div class="mb-6">
        <div class="text-4xl text-center mb-3">{{ typeConfig[type].icon }}</div>
        <div class="text-gray-300 text-center">
          {{ message }}
        </div>
      </div>
    </template>

    <template #footer>
      <button
        @click="emit('close')"
        class="w-full px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold transition-all hover:scale-105 active:scale-95"
      >
        {{ buttonText }}
      </button>
    </template>
  </BaseModal>
</template>
