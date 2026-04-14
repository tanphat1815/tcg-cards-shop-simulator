# Pokemon TCG Shop Simulator - Project Architecture Documentation

CHÀO MỪNG! Đây là tài liệu Onboarding toàn diện dành cho các lập trình viên (và các AI Agent) tham gia vào dự án. Tài liệu này giải thích **TẠI SAO** dự án được thiết kế như hiện tại, **CÁCH** các thành phần giao tiếp với nhau và **QUY TẮC** bạn phải tuân thủ để không làm "vỡ" game.

---

## 1. Tổng quan Dự án (Project Overview)

**Pokemon TCG Shop Simulator** là một game mô phỏng quản lý cửa hàng thẻ bài 2D chạy trên nền web. 

### Core Gameplay Loop:
1.  **Nhập hàng**: Người chơi mua các Box/Pack từ cửa hàng Online (dữ liệu lấy từ TCGdex API).
2.  **Trưng bày**: Đặt kệ (Shelves), quầy thu ngân (Cashier) và sắp xếp hàng hóa bằng chế độ **Build Mode / Ghost Preview**.
3.  **Vận hành**: Khách hàng (NPC) vào shop, tìm món đồ họ thích, xếp hàng và thanh toán.
4.  **Giải trí & Gacha**: Người chơi có thể tự xé Pack (mở thẻ ngẫu nhiên) để sưu tầm hoặc bán thẻ lẻ.
5.  **Mở rộng & Nâng cấp**: 
    - **Expansion**: Nâng cấp diện tích shop theo từng giai đoạn (Lot A, B, C...) để chứa thêm nội thất.
    - **Staff**: Thuê nhân viên (Cashier, Stocker) để tự động hóa vận hành.
    - **Leveling**: Tích lũy EXP để mở khóa hàng hóa và nội thất cao cấp.

---

## 2. Hệ thống Điều khiển (Controls)

Dành cho cả người chơi và lập trình viên khi cần debug:
*   **Di chuyển**: Phím **WASD** hoặc **Các phím mũi tên**.
*   **Tương tác (Interact)**: Phím **E** (Dùng để thanh toán tại quầy hoặc quản lý kệ hàng khi đứng gần).
*   **Xây dựng**: Phím **R** để xoay vật thể 90 độ khi đang cầm đồ vật.
*   **Chỉnh sửa nhanh**: Phím **X** để bật/tắt chế độ Edit Mode.
*   **Camera**: Giữ **Chuộc phải / Chuột giữa** và kéo để quan sát toàn cảnh shop.
*   **Hệ thống**: Phím **G** (Debug Physics), Phím **P** (Chạy Diagnostics báo cáo lỗi).

---

## 3. Hệ sinh thái Công nghệ (Tech Stack)

Chúng sử dụng một mô hình **Hybrid** giữa Web App truyền thống và Game Engine:

*   **Vue 3 (Composition API)**: Đóng vai trò là "Lớp vỏ UI". Toàn bộ Menu, Overlay, Dialog và bảng điều khiển được viết bằng Vue để có hiệu suất render văn bản và form tốt nhất.
*   **Phaser 3**: Đóng vai trò là "Động cơ Game". Xử lý toàn bộ đồ họa 2D, vật lý, di chuyển của nhân vật và tương tác trong không gian 3D giả (Isometric/Top-down).
*   **Pinia**: Đóng vai trò là "Bộ não / Bộ nhớ chung". Đây là nơi lưu trữ duy nhất cho toàn bộ trạng thái của game (Tiền, kho đồ, vị trí nội thất).
*   **TailwindCSS 4**: Dùng để styling UI nhanh chóng và hiện đại.
*   **TCGdex SDK**: Thư viện kết nối với cơ sở dữ liệu thẻ bài Pokemon thực tế.

---

## 4. Cấu trúc Thư mục (Feature-Based Architecture)

Dự án tuân thủ kiến trúc **Feature-based** (Tổ chức theo tính năng). Thay vì chia theo kiểu file (component, store, type), chúng ta chia theo "tính chất" của tính năng trong game.

### Sơ đồ src/
```text
src/
├── assets/             # Tài nguyên tĩnh (Images, JSON data)
├── features/           # <--- TRÁI TIM CỦA DỰ ÁN
│   ├── inventory/      # Quản lý kho, thẻ bài, API TCGdex
│   ├── furniture/      # Bàn, ghế, kệ, quầy thu ngân (Construction)
│   ├── customer/       # Hệ thống NPC, AI khách hàng
│   ├── staff/          # Hệ thống nhân viên (Hiring, AI làm việc)
│   ├── shop-ui/        # Các Overlay chính, Facade Store (gameStore)
│   ├── stats/          # Tiền tệ, Level, EXP, Save/Load
│   └── environment/    # Tường, sàn, mở rộng diện tích
├── game/               # Cấu hình Phaser chính (MainScene, Config)
└── components/shrared/ # Các UI Component dùng chung (Buttons, Modals)
```

**Tại sao lại dùng Feature-based?**
*   **Dễ tìm**: Bạn muốn sửa lỗi nhân viên? Hãy vào thẳng `features/staff`.
*   **Tính đóng gói**: Mỗi folder feature thường có `store/`, `components/`, `managers/` (logic Phaser) và `types/` riêng.
*   **Tránh rối loạn**: Khi dự án phình to, bạn không bị lạc trong một thư mục `components/` có hàng trăm file.

---

## 5. Phân tích Module Cốt lõi (Core Modules)

### 4.1 Orchestrator: MainScene.ts
Nằm tại `src/game/MainScene.ts`. Đây là "Người điều phối" của Phaser.
*   **Khởi tạo**: Nó không tự viết mọi logic, mà nó "gọi tên" các **Manager** (Dependency Injection).
*   **Kết nối**: Nó đăng ký lắng nghe sự thay đổi từ Pinia Store để ra lệnh cho các Manager vẽ lại đồ họa.

### 4.2 Game Managers
Mỗi feature sẽ có một `Manager` (ví dụ: `NPCManager.ts`).
*   **Trách nhiệm**: Chỉ xử lý việc hiển thị và vật lý của đối tượng đó trong Phaser.
*   **Nguyên tắc**: Manager nhận vào tham chiếu `scene` từ `MainScene` để có quyền vẽ lên màn hình.

### 4.3 State Management (Pinia)
Chúng ta có 5 store chính được điều phối bởi 1 **Facade Store** dùng chung:
1.  **inventoryStore**: Giữ danh sách thẻ, pack bạn đang có.
2.  **furnitureStore**: Giữ tọa độ và trạng thái của tất cả đồ đạc đã đặt.
3.  **customerStore**: Quản lý hàng chờ (queue) và số lượng khách.
4.  **statsStore**: Giữ Tiền, Level, EXP và Cài đặt.
5.  **gameStore (Facade)**: Cửa ngõ duy nhất. Vue UI chỉ được phép gọi qua `gameStore`.
6.  **apiStore**: Trái tim của việc kết nối dữ liệu bên ngoài. Lưu trữ bộ nhớ đệm (Cache) của các thẻ bài và Set lấy từ TCGdex, giúp game truy xuất thông tin Gacha ngay lập tức mà không cần chờ mạng.

---

## 6. Ma trận Giao tiếp & Quy tắc Vàng (Hard Rules)

Đây là phần quan trọng nhất để giữ cho dự án không bị lỗi xung đột.

> [!IMPORTANT]
> **QUY TẮC VÀNG (The Golden Bridge Rule):**
> 1. **Phaser KHÔNG bao giờ thao tác trực tiếp DOM**: Phaser chỉ vẽ lên Canvas. Nếu muốn hiện Menu, nó phải yêu cầu Pinia bật mode đó lên.
> 2. **Vue KHÔNG bao giờ gọi hàm trực tiếp trong Scene**: Vue không được gọi `scene.player.move()`.
> 3. **Mọi giao tiếp phải qua Pinia**:
>    *   **Vue -> Phaser**: Vue gọi `store.toggleEditMode()` -> Phaser Manager "lắng nghe" state đó thay đổi và bật hiệu ứng Edit.
>    *   **Phaser -> Vue**: Phaser phát hiện va chạm -> Gọi `store.gainExp()` -> Vue UI tự động cập nhật thanh EXP.

### Ngăn chặn Circular Dependency (Phụ thuộc vòng):
*   Store A **không** nên import Store B ở cấp độ Global. Hãy gọi `useStoreB()` bên trong một function để tránh lỗi khởi tạo.

---

## 7. Tích hợp API & Logic Gacha (TCGdex Integration)

Dự án sử dụng API thật từ TCGdex để mô phỏng hàng hóa.

### 6.1 Cơ chế Caching (BẮT BUỘC):
Tuyệt đối không gọi API mỗi khi mở Pack. Khi khởi động game, `apiStore` sẽ fetch (tải) danh sách các Set và toàn bộ thẻ bài của Set đó **1 LẦN DUY NHẤT** và lưu vào Cache (bộ nhớ đệm). Mọi thao tác mua hàng, xem thẻ, hay xé Pack đều phải đọc dữ liệu từ Cache này để tránh bị Rate Limit (Khóa API do gọi quá nhiều) và đảm bảo trải nghiệm tức thì (0 độ trễ).

### 6.2 Mapping & Rarity Weights:
Dữ liệu trả về từ TCGdex phải được ánh xạ (map) sang Interface nội bộ của game (`CardData`). Thuật toán mở Pack sử dụng Weighted Random (Lựa chọn ngẫu nhiên có trọng số):
*   **Phân loại Card Pool**: Phân loại Cache thành pool thẻ Common/Uncommon và pool thẻ Rare/Holo.
*   **Quy tắc xé Pack**: Rút 4 thẻ từ pool Common và 1 thẻ từ pool Rare, sau đó đưa thẳng vào `personalBinder` của người chơi kèm theo hiệu ứng hình ảnh.

### 6.3 AI của Khách hàng (NPC AI Logic)
NPC hoạt động theo một **Máy trạng thái (State Machine)**:
*   `SPAWN` -> `WANDER` (Đi dạo) -> `SEEK_ITEM` (Tìm đồ) -> `INTERACT` (Lấy đồ) -> `GO_CASHIER` (Xếp hàng) -> `WAITING` (Chờ tiền) -> `LEAVE`.
*   **Quyết định**: NPC dùng `Math.random()` để quyết định sẽ đi mua card hay đi đánh bài khi vừa vào cửa.

---

## 8. Hệ thống Đấu bài (5v5 Battle Skeleton)

Hiện tại hệ thống đấu bài giữa NPC được xây dựng theo cơ chế **Turn-based mô phỏng**:
*   **Trích xuất dữ liệu**: Game dùng **Regex** để đọc chuỗi Damage từ metadata của thẻ (Ví dụ: "30+" -> 30).
*   **Weakness Multiplier**: Nếu hệ của thẻ tấn công trùng với `Weakness` của đối thủ, sát thương sẽ được **x2**.
*   **5v5**: Mỗi bên có 5 thẻ, bên nào hết máu (HP) trước sẽ bị loại (Knockout).

---

## 9. Hệ thống Lưu trữ (Save/Load)

Game sử dụng `localStorage` để lưu tiến trình.

> [!CAUTION]
> **Kỹ thuật Tự động Lưu:**
> Trong `App.vue`, chúng ta không subscribe vào Facade `gameStore` (vì nó không chứa dữ liệu thật). Thay vào đó, chúng ta phải **subscribe vào từng store con** (`statsStore`, `inventoryStore`,...). Mỗi khi có bất kỳ thay đổi nhỏ nào (như tiền tăng), hàm `saveGame()` sẽ tự động được gọi.

---

## 10. Điểm nhấn Kỹ thuật & Tối ưu (Technical Highlights)

*   **Modular Design**: Toàn bộ logic trong Phaser được tách vào các `Manager` độc lập, dễ dàng mở rộng.
*   **Physics-UI Synergy**: Phaser xử lý va chạm và Hitbox, trong khi Vue xử lý các thao tác chuột phức tạp.
*   **Optimization (Tối ưu)**:
    - AI của NPC chỉ tính toán quyết định mỗi **100ms - 500ms** thay vì chạy mỗi frame (60fps) để tiết kiệm CPU.
    - Sử dụng `pointer-events-none` thông minh trên các lớp Overlay để không cản trở việc click vào thế giới game.
*   **Data Integrity**: Sử dụng cơ chế Migrations (trong `gameStore.ts`) để đảm bảo các bản lưu cũ không bị hỏng khi cập nhật logic mới.

---

## 11. Lộ trình Phát triển (Future Roadmap)

- [ ] **Hệ thống Nhiệm vụ (Quests)**: Thêm quest hàng ngày để nhận thưởng.
- [ ] **Giải đấu (Tournaments)**: Tổ chức đấu bài tại shop để thu hút khách VIP.
- [ ] **Nội thất Nâng cao**: Máy bán hàng tự động, máy arcade.
- [ ] **Hệ thống Nhân viên nâng cấp**: Nhân viên có thể thăng cấp và học kỹ năng mới.

---

## 12. Lời kết cho Onboarding
Dự án này được thiết kế để **Dữ liệu dẫn dắt Hình ảnh**. Nếu bạn muốn thêm một tính năng mới:
1.  Tạo Store để giữ dữ liệu.
2.  Tạo UI (Vue) để người dùng thao tác.
3.  Tạo Manager (Phaser) để thể hiện hành động đó lên màn hình.

Chúc bạn có những giờ phút lập trình thú vị với Pokemon TCG Shop Simulator!
