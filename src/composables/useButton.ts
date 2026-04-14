/**
 * useButton.ts - Composable cho button với các variant khác nhau
 *
 * Sử dụng:
 * const button = useButton('primary')
 * const button2 = useButton('secondary', 'sm')
 *
 * Trong template:
 * <button :class="button.classes" @click="handleClick">
 *   {{ button.text }}
 * </button>
 */

import { computed, type Ref } from 'vue'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'icon'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ButtonState {
  classes: Ref<string>
  isDisabled: Ref<boolean>
  isLoading: Ref<boolean>
}

export function useButton(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  disabled: boolean = false,
  loading: boolean = false,
  fullWidth: boolean = false
): ButtonState {
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

  const classes = computed(() => {
    let classList = [baseClasses, variantClasses[variant], sizeClasses[size]]

    if (fullWidth) classList.push('w-full')
    if (disabled || loading) classList.push('opacity-50 cursor-not-allowed hover:scale-100')

    return classList.join(' ')
  })

  const isDisabled = computed(() => disabled || loading)
  const isLoading = computed(() => loading)

  return {
    classes,
    isDisabled,
    isLoading
  }
}

/**
 * useIconButton.ts - Composable cho icon button
 *
 * Sử dụng:
 * const iconBtn = useIconButton('settings')
 *
 * Trong template:
 * <button :class="iconBtn.classes" :title="iconBtn.title">
 *   <span v-html="iconBtn.icon"></span>
 * </button>
 */

interface IconButtonState extends ButtonState {
  icon: string
  title: string
}

export function useIconButton(iconName: string, size: ButtonSize = 'md'): IconButtonState {
  const icons = {
    settings: '⚙️',
    shop: '🛒',
    build: '🏗️',
    minimize: '➖',
    maximize: '➕',
    close: '✕',
    edit: '✏️',
    delete: '🗑️',
    add: '➕',
    remove: '➖',
    save: '💾',
    load: '📁',
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    restart: '🔄',
    info: 'ℹ️',
    help: '❓',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  }

  const titles = {
    settings: 'Cài đặt',
    shop: 'Cửa hàng',
    build: 'Xây dựng',
    minimize: 'Thu nhỏ',
    maximize: 'Phóng to',
    close: 'Đóng',
    edit: 'Chỉnh sửa',
    delete: 'Xóa',
    add: 'Thêm',
    remove: 'Xóa',
    save: 'Lưu',
    load: 'Tải',
    play: 'Chơi',
    pause: 'Tạm dừng',
    stop: 'Dừng',
    restart: 'Khởi động lại',
    info: 'Thông tin',
    help: 'Trợ giúp',
    warning: 'Cảnh báo',
    error: 'Lỗi',
    success: 'Thành công'
  }

  const button = useButton('icon', size)

  return {
    ...button,
    icon: icons[iconName as keyof typeof icons] || iconName,
    title: titles[iconName as keyof typeof titles] || iconName
  }
}