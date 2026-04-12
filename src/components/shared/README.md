# Shared Components Guide

## 📁 Cấu trúc

```
src/components/
├── shared/
│   ├── BaseModal.vue           # Nền tảng chính
│   ├── ConfirmDialog.vue       # Modal xác nhận (Có/Không)
│   ├── AlertDialog.vue         # Modal thông báo đơn
│   └── index.ts                # Export chung
├── EndOfDayModal.vue           # Sử dụng BaseModal
└── ...
```

## 🎯 Cách sử dụng

### 1. **BaseModal** - Nền tảng cho tất cả modal

```vue
<script setup>
import { ref } from 'vue'
import { BaseModal } from '@/components/shared'

const showModal = ref(false)
</script>

<template>
  <BaseModal
    :isOpen="showModal"
    title="Tiêu đề"
    size="md"          <!-- sm | md | lg | xl -->
    :closeable="true"
    @close="showModal = false"
  >
    <!-- Nội dung modal -->
    <template #default>
      <div>Nội dung ở đây</div>
    </template>

    <!-- Nút hành động (tùy chọn) -->
    <template #footer>
      <button @click="showModal = false">Hủy</button>
      <button @click="handleSave">Lưu</button>
    </template>
  </BaseModal>

  <button @click="showModal = true">Mở modal</button>
</template>
```

### 2. **ConfirmDialog** - Xác nhận hành động

```vue
<script setup>
import { ref } from 'vue'
import { ConfirmDialog } from '@/components/shared'

const showConfirm = ref(false)

const handleDelete = () => {
  console.log('Đã xóa!')
  showConfirm.value = false
}
</script>

<template>
  <ConfirmDialog
    :isOpen="showConfirm"
    title="Xác nhận xóa"
    message="Bạn chắc chắn muốn xóa mục này?"
    confirmText="Xóa"
    cancelText="Hủy"
    :isDangerous="true"
    @confirm="handleDelete"
    @cancel="showConfirm = false"
  />

  <button @click="showConfirm = true">Xóa</button>
</template>
```

### 3. **AlertDialog** - Thông báo đơn

```vue
<script setup>
import { ref } from 'vue'
import { AlertDialog } from '@/components/shared'

const showAlert = ref(false)
</script>

<template>
  <AlertDialog
    :isOpen="showAlert"
    title="Thành công!"
    message="Hành động đã hoàn thành"
    buttonText="Đóng"
    type="success"  <!-- info | success | warning | error -->
    @close="showAlert = false"
  />

  <button @click="showAlert = true">Thông báo</button>
</template>
```

## 🚀 Tạo Component Modal Mới

### Ví dụ: FormModal

```vue
<!-- src/components/shared/FormModal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'

interface Props {
  isOpen: boolean
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Form',
})

const emit = defineEmits<{
  close: []
  submit: [data: any]
}>()

const formData = ref({
  name: '',
  email: '',
})

const handleSubmit = () => {
  emit('submit', formData.value)
  formData.value = { name: '', email: '' }
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="title"
    size="md"
    @close="emit('close')"
  >
    <template #default>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Tên</label>
          <input
            v-model="formData.name"
            type="text"
            class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            placeholder="Nhập tên..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            v-model="formData.email"
            type="email"
            class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            placeholder="Nhập email..."
          />
        </div>
      </div>
    </template>

    <template #footer>
      <button @click="emit('close')" class="px-4 py-2 rounded-lg bg-gray-700 text-white">Hủy</button>
      <button @click="handleSubmit" class="px-4 py-2 rounded-lg bg-blue-600 text-white">Lưu</button>
    </template>
  </BaseModal>
</template>
```

Sau đó thêm vào `index.ts`:
```typescript
export { default as FormModal } from './FormModal.vue'
```

## 📋 Props của BaseModal

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `isOpen` | boolean | - | Hiển thị/ẩn modal |
| `title` | string | undefined | Tiêu đề modal |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Kích thước |
| `closeable` | boolean | true | Có nút đóng hay không |
| `backdrop` | boolean | true | Nền mờ |

## 🎨 Slots của BaseModal

| Slot | Mô tả |
|------|-------|
| `#default` | Nội dung chính của modal |
| `#footer` | Các nút hành động |

## 💡 Tips

1. **Sử dụng Composable để quản lý state modal:**
```typescript
// useModalState.ts
import { ref } from 'vue'

export function useModal(initialState = false) {
  const isOpen = ref(initialState)
  
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
    toggle: () => { isOpen.value = !isOpen.value }
  }
}
```

```vue
<script setup>
import { useModal } from '@/composables/useModal'

const confirmDialog = useModal()
</script>

<template>
  <ConfirmDialog
    :isOpen="confirmDialog.isOpen"
    @confirm="handleDelete"
    @cancel="confirmDialog.close"
  />
</template>
```

2. **Kết hợp multiple modal:**
```vue
<script setup>
const deleteModal = useModal()
const settingsModal = useModal()
</script>

<template>
  <ConfirmDialog :isOpen="deleteModal.isOpen" />
  <SettingsModal :isOpen="settingsModal.isOpen" />
</template>
```

## 🔄 Mở rộng sau này

Có thể thêm các component khác:
- `FormModal.vue` - Form input
- `LoadingModal.vue` - Loading state
- `ListModal.vue` - Danh sách lựa chọn
- `TabsModal.vue` - Modal với tabs
- `NotificationToast.vue` - Thông báo nhỏ
