# MODULE 1: KIẾN TRÚC HỆ THỐNG & GIAO TIẾP VUE - PHASER

## 1. Single Source of Truth (Nguồn dữ liệu chuẩn)
- Dùng **Pinia** làm trung tâm lưu trữ toàn bộ Global State của Game.
- Các State bao gồm: `money` (tiền), `inventory` (số lượng pack/thẻ đang có), `shopState` (OPEN/CLOSED), `shopItems` (các item đang trưng bày trên kệ).

## 2. Giao tiếp từ Vue xuống Phaser (Vue -> Phaser)
- Vue không bao giờ gọi trực tiếp các hàm của Phaser Scene.
- Vue sẽ gọi action trong Pinia Store.
- Trong Phaser Scene, ở hàm `init()` hoặc `create()`, tiến hành `$subscribe` vào Pinia Store hoặc lắng nghe một Global Event Bus để phản ứng lại (Ví dụ: Khi Vue đổi `shopState` thành OPEN, Phaser sẽ cho phép spawn NPC).

## 3. Giao tiếp từ Phaser lên Vue (Phaser -> Vue)
- Phaser không bao giờ thao tác DOM hay gọi trực tiếp Component của Vue.
- Khi một sự kiện vật lý xảy ra trong Phaser (VD: Player chạm vào quầy thu ngân), Phaser sẽ `emit` một Custom Event thông qua Event Bus hoặc gọi trực tiếp action của Pinia để cập nhật State.
- Các Component của Vue sẽ tự động re-render (hiện Menu Thu ngân) nhờ tính reactive của Pinia.

## 4. Quản lý Game Instance
- Khởi tạo Phaser instance bên trong `onMounted` của một Vue component (ví dụ: `GameContainer.vue`).
- Hủy Phaser instance trong `onUnmounted` để tránh memory leak.