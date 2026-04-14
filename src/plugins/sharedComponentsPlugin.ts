/**
 * sharedComponentsPlugin.ts
 * 
 * Plugin để register các shared components globally (tùy chọn).
 * Nếu muốn dùng shared components mà không cần import, hãy gọi plugin này trong main.ts
 * 
 * Cách sử dụng trong main.ts:
 * import { registerSharedComponents } from '@/plugins/sharedComponentsPlugin'
 * app.use(registerSharedComponents)
 */

import type { App } from 'vue'
import BaseModal from '../components/shared/BaseModal.vue'
import ConfirmDialog from '../components/shared/ConfirmDialog.vue'
import AlertDialog from '../components/shared/AlertDialog.vue'

export function registerSharedComponents(app: App) {
  /**
   * Register components globally so they can be used without explicit imports
   * 
   * Sau khi plugin này được use, bạn có thể dùng:
   * <BaseModal />, <ConfirmDialog />, <AlertDialog /> ở bất kỳ template nào
   * mà không cần import
   */
  app.component('BaseModal', BaseModal)
  app.component('ConfirmDialog', ConfirmDialog)
  app.component('AlertDialog', AlertDialog)

  // Có thể thêm các component khác ở đây sau này
}

export default registerSharedComponents
