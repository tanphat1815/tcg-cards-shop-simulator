<script setup lang="ts">
/**
 * ConfirmDialog.vue - Modal xác nhận có/không
 * 
 * Sử dụng:
 * <ConfirmDialog
 *   :isOpen="showDelete"
 *   title="Xác nhận xóa"
 *   message="Bạn chắc chắn muốn xóa không?"
 *   confirmText="Xóa"
 *   @confirm="handleDelete"
 *   @cancel="showDelete = false"
 * />
 */
import BaseModal from './BaseModal.vue'

interface Props {
  isOpen: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  confirmClass?: string
  isDangerous?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Xác nhận',
  message: 'Bạn chắc chắn không?',
  confirmText: 'Xác nhận',
  cancelText: 'Hủy',
  confirmClass: 'from-blue-600 to-blue-700',
  isDangerous: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="title"
    size="sm"
    @close="emit('cancel')"
  >
    <template #default>
      <div class="text-gray-300 text-center mb-6">
        {{ message }}
      </div>
    </template>

    <template #footer>
      <button
        @click="emit('cancel')"
        class="px-6 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all hover:scale-105 active:scale-95"
      >
        {{ cancelText }}
      </button>
      <button
        @click="emit('confirm')"
        class="px-6 py-2.5 rounded-lg text-white font-bold transition-all hover:scale-105 active:scale-95"
        :class="isDangerous
          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
          : `bg-gradient-to-r ${confirmClass} hover:opacity-80`
        "
      >
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>
