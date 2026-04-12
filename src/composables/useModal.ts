/**
 * useModal.ts - Composable quản lý trạng thái modal
 * 
 * Sử dụng:
 * const modal = useModal()
 * modal.open()
 * modal.close()
 * modal.toggle()
 */

import { ref } from 'vue'
import type { Ref } from 'vue'

interface ModalState {
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
}

export function useModal(initialState: boolean = false): ModalState {
  const isOpen = ref(initialState)

  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    },
    toggle: () => {
      isOpen.value = !isOpen.value
    }
  }
}

/**
 * useAlert.ts - Composable cho Alert Dialog
 * 
 * Sử dụng:
 * const alert = useAlert()
 * alert.show('Thành công!', 'Hành động hoàn thành', 'success')
 */

interface AlertState extends ModalState {
  title: Ref<string>
  message: Ref<string>
  type: Ref<'info' | 'success' | 'warning' | 'error'>
  show: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
}

export function useAlert(): AlertState {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const type = ref<'info' | 'success' | 'warning' | 'error'>('info')

  return {
    isOpen,
    title,
    message,
    type,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
    toggle: () => { isOpen.value = !isOpen.value },
    show: (t: string, m: string, typ: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      title.value = t
      message.value = m
      type.value = typ
      isOpen.value = true
    }
  }
}

/**
 * useConfirm.ts - Composable cho Confirm Dialog
 * 
 * Sử dụng:
 * const confirm = useConfirm()
 * await confirm.show('Xác nhận xóa?', 'Hành động này không thể hoàn tác')
 */

interface ConfirmState extends ModalState {
  title: Ref<string>
  message: Ref<string>
  isDangerous: Ref<boolean>
  resolve: Ref<((value: boolean) => void) | null>
  show: (title: string, message: string, isDangerous?: boolean) => Promise<boolean>
}

export function useConfirm(): ConfirmState {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const isDangerous = ref(false)
  const resolve = ref<((value: boolean) => void) | null>(null)

  return {
    isOpen,
    title,
    message,
    isDangerous,
    resolve,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
    toggle: () => { isOpen.value = !isOpen.value },
    show: (t: string, m: string, dangerous: boolean = false): Promise<boolean> => {
      return new Promise((res) => {
        title.value = t
        message.value = m
        isDangerous.value = dangerous
        resolve.value = (confirmed: boolean) => {
          isOpen.value = false
          res(confirmed)
        }
        isOpen.value = true
      })
    }
  }
}
