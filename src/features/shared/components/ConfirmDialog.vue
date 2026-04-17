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
import EnhancedButton from './EnhancedButton.vue'

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
      <EnhancedButton
        variant="secondary"
        size="md"
        @click="emit('cancel')"
      >
        {{ cancelText }}
      </EnhancedButton>
      <EnhancedButton
        :variant="isDangerous ? 'danger' : 'primary'"
        size="md"
        @click="emit('confirm')"
      >
        {{ confirmText }}
      </EnhancedButton>
    </template>
  </BaseModal>
</template>
