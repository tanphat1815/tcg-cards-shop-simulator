# MODULE 4: VUE UI & LUỒNG TƯƠNG TÁC

## 1. Cấu trúc Component Layout
- `#app`: Container ngoài cùng (Relative).
  - `.game-canvas` (Z-index 0): Nơi Phaser render.
  - `.ui-layer` (Z-index 10, Absolute/Pointer-events-none): Phủ lên trên game, dùng để hiển thị UI. Các menu con bên trong bật `pointer-events-auto` để click được.

## 2. Các UI Component Chính
- `TopBar.vue`: Hiển thị Tiền (Money), Tên Shop, và Nút Mở/Đóng cửa (Toggle Shop State).
- `InventoryMenu.vue`: Hiển thị danh sách Pack thẻ và Thẻ lẻ đang có. (Chỉ mở khi Player không ở màn hình thu ngân).
- `CashierMenu.vue`: Hiện lên khi Player tương tác với NPC ở quầy thu ngân. Nút bấm: "Tính tiền", "Thối tiền".
- `PackOpening.vue`: Màn hình đặc biệt (full screen overlay). Hiệu ứng click vào pack -> lắc lắc -> xé pack -> hiện ra 5 thẻ bài. 

## 3. Styling
- Sử dụng Tailwind CSS để style các Component. Ưu tiên UI phẳng, vuông vức mang phong cách game retro/pixel.