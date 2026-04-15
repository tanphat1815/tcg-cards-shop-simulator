# Naming Convention for Entities

Thư mục này chứa hình ảnh của các đối tượng khác trong trò chơi như NPC, Đồ nội thất, Trang trí...

## Quy tắc đặt tên (Convention)

Để dễ quản lý, hãy chia nhỏ thành các thư mục con:

### 1. NPC (`public/assets/entities/npc/`)
- `cashier.webp`: Nhân viên thu ngân.
- `customer.webp`: Khách hàng mặc định.

### 2. Đồ nội thất (`public/assets/entities/furniture/`)
- `shelf_basic.webp`: Kệ hàng cơ bản.
- `display_case.webp`: Tủ kính trưng bày.

## Tùy chỉnh trong Code
Bạn có thể ánh xạ (map) các file này trong file:
`src/features/inventory/config/assetRegistry.ts`

Trong biến `ASSET_OVERRIDES.entities`, ví dụ:
```typescript
entities: {
  'npc_cashier': `${ENTITIES_PATH}/npc/cashier.webp`,
}
```
