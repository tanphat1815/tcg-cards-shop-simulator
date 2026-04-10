# Kế Hoạch Xây Dựng Cửa Hàng Trực Tuyến (Online Shop)

Hệ thống Online Shop sẽ là nơi người chơi tiêu số tiền kiếm được để mở rộng quy mô kinh doanh. Tính năng này bao gồm việc nhập hàng hóa mới và mua sắm nội thất cao cấp, tất cả đều bị ràng buộc bởi cấp độ của người chơi.

## User Review Required
> [!IMPORTANT]
> - **Hệ thống Đặt Nội thất**: Hiện tại kế hoạch chỉ dừng lại ở việc "Mua và cất vào kho nội thất". Sau khi mua xong, bạn có muốn tôi viết thêm logic để người chơi có thể "Đặt" (Place) các kệ mới này vào trong cửa hàng Phaser không? (Hiện tại Game chỉ mặc định có 2 kệ cố định).
> - **Cân bằng Kinh tế**: Tôi sẽ thiết lập các mốc giá và level như yêu cầu. Bạn có muốn thêm phí vận chuyển (Shipping) hay thời gian chờ hàng về không? (Hiện tại là mua phát có ngay).

## Proposed Changes

---

### 1. Cấu trúc Dữ liệu & Cấu hình
#### [NEW] [shopData.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/config/shopData.ts)
- Định nghĩa danh sách hàng hóa (`STOCK_ITEMS`):
    - **Basic Pack**: $10, LV 1.
    - **Silver Pack**: $25, LV 5 (Bán $40).
    - **Golden Pack**: $60, LV 12 (Bán $100).
- Định nghĩa danh sách nội thất (`FURNITURE_ITEMS`):
    - **Single Sided Shelf**: $300, LV 3.
    - **Double Sided Shelf**: $750, LV 11.

#### [MODIFY] [gameStore.ts](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/stores/gameStore.ts)
- Thêm state:
    - `showOnlineShop: boolean`.
    - `purchasedFurniture: Record<string, number>` (Lưu trữ số lượng kệ đã mua).
- Thêm actions:
    - `buyStock(itemId)`: Kiểm tra tiền + level -> Trừ tiền -> Cộng `shopInventory`.
    - `buyFurniture(furnitureId)`: Kiểm tra tiền + level -> Trừ tiền -> Cộng `purchasedFurniture`.

---

### 2. Giao diện (Vue Components)
#### [NEW] [OnlineShopMenu.vue](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/components/OnlineShopMenu.vue)
- Thiết kế giao diện theo phong cách "Trình duyệt web" hiện đại trên máy tính:
    - Sidebar hoặc Top Tabs để chuyển đổi giữa **Stock** và **Furniture**.
    - Grid hiển thị các Card sản phẩm.
    - **Tính năng Grayscale**: Nếu Level thấp hơn yêu cầu:
        - Sử dụng CSS `filter: grayscale(1) blur(1px)`.
        - Nút `Mua` đổi thành màu xám và bị `disabled`.
        - Hiển thị Badge: "🔒 Yêu cầu Cấp {{ X }}".
    - Âm thanh "Cha-ching!" khi mua hàng thành công.

#### [MODIFY] [UIOverlay.vue](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/components/UIOverlay.vue)
- Thêm icon **Laptop 💻** hoặc nút "🛒 ONLINE SHOP" ở thanh điều khiển phía trên.

---

### 3. Tích hợp & Lưu trữ
#### [MODIFY] [App.vue](file:///f:/Phatnt-sources/tcg-cards-shop-webpage/src/App.vue)
- Import và mount `<OnlineShopMenu />`.
- Cập nhật $subscribe để lưu thêm `purchasedFurniture` vào localStorage.

## Verification Plan
1. Chạy game, kiểm tra xem Level 1 có thể thấy các món đồ LV 3 bị mờ đi không.
2. Mở vài Pack để lên Level 3 -> Quay lại shop xem kệ Single Sided đã sáng lên chưa.
3. Nhấn Mua -> Kiểm tra tiền có trừ và số lượng hàng trong Inventory có tăng đúng theo loại hàng mới không.
4. Mua Kệ -> Kiểm tra log hoặc state xem `purchasedFurniture` có ghi nhận không.
