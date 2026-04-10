# MODULE 3: KHÁCH HÀNG & AI (HỆ THỐNG STATE MACHINE)

## 1. Vòng đời của một NPC Khách hàng
Sử dụng Finite State Machine (FSM) đơn giản cho từng NPC. Các trạng thái (States) bao gồm:

- **SPAWN:** Xuất hiện ở cửa ra vào khi `shopState === OPEN`.
- **WANDER:** Đi dạo ngẫu nhiên bên trong cửa hàng để tìm kệ hàng.
- **SEEK_ITEM:** Nhận diện kệ hàng đang có sản phẩm, tìm đường đi tới đó.
- **INTERACT:** Đứng lại 1-2 giây để lấy sản phẩm. Xóa sản phẩm khỏi kệ (chuyển vào giỏ hàng của NPC).
- **GO_CASHIER:** Đi tới xếp hàng ở quầy thu ngân. Đợi Player đến thanh toán.
- **LEAVE:** Đi ra cửa và biến mất (`destroy()`).

## 2. Hệ thống Pathfinding (Tìm đường)
- Ban đầu, ưu tiên dùng hệ thống di chuyển dựa trên Grid (Grid-based movement) kết hợp Arcade Physics đơn giản (đi thẳng, gặp vật cản thì đổi hướng).
- NẾU dự án phát triển phức tạp hơn, áp dụng thuật toán `A* (A-Star)` hoặc dùng thư viện `navmesh` của Phaser để NPC đi lại mượt mà không bị kẹt vào tường/kệ.