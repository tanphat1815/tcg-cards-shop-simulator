/**
 * useEnhancedButton.ts - Enhanced button composable với icon và loading support
 *
 * Features:
 * - Icon support (left/right position)
 * - Loading state với spinner
 * - Custom loading text
 * - Tooltip support
 * - ARIA attributes
 */

import { computed, type Ref } from 'vue'
import type { ButtonVariant, ButtonSize } from './useButton'

export type IconPosition = 'left' | 'right'

export interface ButtonIcon {
  name: string
  position?: IconPosition
}

export interface EnhancedButtonConfig {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: ButtonIcon
  loadingText?: string
  tooltip?: string
  ariaLabel?: string
}

export interface EnhancedButtonState {
  classes: Ref<string>
  isDisabled: Ref<boolean>
  isLoading: Ref<boolean>
  hasIcon: Ref<boolean>
  iconClasses: Ref<string>
  spinnerSize: Ref<ButtonSize>
  ariaAttributes: Ref<Record<string, string>>
}

export function useEnhancedButton(config: EnhancedButtonConfig = {}): EnhancedButtonState {
  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon,
    tooltip,
    ariaLabel
  } = config

  // Base classes từ useButton gốc
  const baseClasses = 'font-bold uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 rounded-xl shadow-lg border flex items-center justify-center gap-2'

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-blue-500/30 shadow-blue-500/20',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white border-gray-500/30 shadow-gray-500/20',
    success: 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white border-green-500/30 shadow-green-500/20',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-red-500/30 shadow-red-500/20',
    warning: 'bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white border-yellow-500/30 shadow-yellow-500/20',
    info: 'bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white border-indigo-500/30 shadow-indigo-500/20',
    outline: 'bg-transparent border-2 border-gray-500 text-gray-300 hover:bg-gray-500/10 hover:border-gray-400',
    ghost: 'bg-transparent text-gray-300 hover:bg-gray-500/10 border-transparent',
    link: 'bg-transparent text-blue-400 hover:text-blue-300 underline hover:no-underline border-transparent',
    icon: 'bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700/50 p-2'
  }

  const sizeClasses = {
    xs: 'text-[9px] py-1 px-2',
    sm: 'text-[10px] py-1.5 px-3',
    md: 'text-xs py-2 px-4',
    lg: 'text-sm py-3 px-6',
    xl: 'text-base py-4 px-8'
  }

  // Computed properties
  const classes = computed(() => {
    let classList = [baseClasses, variantClasses[variant], sizeClasses[size]]

    if (fullWidth) classList.push('w-full')
    if (disabled || loading) classList.push('opacity-50 cursor-not-allowed hover:scale-100')

    return classList.join(' ')
  })

  const isDisabled = computed(() => disabled || loading)
  const isLoading = computed(() => loading)
  const hasIcon = computed(() => !!icon)

  const iconClasses = computed(() => {
    const baseIconClasses = 'w-4 h-4'
    return icon?.position === 'right' ? `${baseIconClasses} order-1` : baseIconClasses
  })

  const spinnerSize = computed(() => {
    const sizeMap: Record<ButtonSize, ButtonSize> = {
      xs: 'xs',
      sm: 'xs',
      md: 'sm',
      lg: 'md',
      xl: 'lg'
    }
    return sizeMap[size]
  })

  const ariaAttributes = computed(() => {
    const attrs: Record<string, string> = {}

    if (ariaLabel) attrs['aria-label'] = ariaLabel
    if (tooltip) attrs['title'] = tooltip
    if (loading) attrs['aria-busy'] = 'true'
    if (disabled) attrs['aria-disabled'] = 'true'

    return attrs
  })

  return {
    classes,
    isDisabled,
    isLoading,
    hasIcon,
    iconClasses,
    spinnerSize,
    ariaAttributes
  }
}