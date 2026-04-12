<script setup lang="ts">
/**
 * BaseModal.vue - Reusable Modal Component
 * 
 * Sử dụng:
 * <BaseModal
 *   :isOpen="showModal"
 *   title="Tiêu đề"
 *   @close="showModal = false"
 * >
 *   <template #default>Nội dung modal</template>
 *   <template #footer>
 *     <button>Hành động</button>
 *   </template>
 * </BaseModal>
 */
interface Props {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeable?: boolean
  backdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeable: true,
  backdrop: true,
})

const emit = defineEmits<{
  close: []
}>()

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget && props.closeable) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto"
        :class="backdrop ? 'bg-black/80 backdrop-blur-sm' : ''"
        @click="handleBackdropClick"
      >
        <div 
          class="bg-gray-800 border-2 border-gray-600 rounded-3xl p-8 w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] transform"
          :class="[sizeClasses[size], 'animate-modal-in']"
        >
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 v-if="title" class="text-3xl font-black text-white uppercase tracking-widest">
              {{ title }}
            </h2>
            <button
              v-if="closeable"
              @click="emit('close')"
              class="text-gray-400 hover:text-gray-200 transition-colors text-2xl leading-none p-2"
            >
              ✕
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content mb-8">
            <slot />
          </div>

          <!-- Footer -->
          <div class="modal-footer flex gap-3 justify-end">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.animate-modal-in {
  animation: modalInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
