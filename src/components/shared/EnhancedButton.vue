<template>
  <button
    :class="classes"
    :disabled="isDisabled"
    v-bind="ariaAttributes"
    @click="$emit('click', $event)"
  >
    <!-- Loading Spinner -->
    <Spinner
      v-if="isLoading"
      :size="spinnerSize"
      class="flex-shrink-0"
    />

    <!-- Left Icon -->
    <span
      v-if="hasLeftIcon"
      :class="iconClasses"
      class="shrink-0"
    >
      {{ getIconComponent(props.icon?.name ?? '') }}
    </span>

    <!-- Button Content -->
    <span v-if="isLoading && loadingText" class="shrink-0">
      {{ loadingText }}
    </span>
    <span v-else-if="!isLoading" class="shrink-0">
      <slot>{{ defaultText }}</slot>
    </span>

    <!-- Right Icon -->
    <span
      v-if="hasRightIcon && !isLoading"
      :class="iconClasses"
      class="shrink-0"
    >
      {{ getIconComponent(props.icon?.name ?? '') }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Spinner from './Spinner.vue'
import { useEnhancedButton, type EnhancedButtonConfig } from '../../composables/useEnhancedButton'

interface Props extends EnhancedButtonConfig {
  defaultText?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultText: 'Button'
})

const emit = defineEmits<{
  click: [event: Event]
}>()

const {
  classes,
  isDisabled,
  isLoading,
  iconClasses,
  spinnerSize,
  ariaAttributes
} = useEnhancedButton(props)

// Icon helpers
const hasLeftIcon = computed(() =>
  props.icon && (!props.icon.position || props.icon.position === 'left') && !isLoading.value
)

const hasRightIcon = computed(() =>
  props.icon && props.icon.position === 'right' && !isLoading.value
)

// Simple icon component resolver (you can expand this)
const getIconComponent = (iconName: string) => {
  // For demo purposes, return a simple span with emoji
  // In real app, you would use a proper icon library
  const iconMap: Record<string, string> = {
    'check': '✅',
    'close': '❌',
    'search': '🔍',
    'settings': '⚙️',
    'user': '👤',
    'cart': '🛒',
    'heart': '❤️',
    'star': '⭐',
    'arrow-right': '→',
    'arrow-left': '←',
    'plus': '➕',
    'minus': '➖',
    'edit': '✏️',
    'delete': '🗑️',
    'save': '💾',
    'download': '📥',
    'upload': '📤'
  }

  return iconMap[iconName] || '❓'
}
</script>