# Kế hoạch Tái cấu trúc Dự án (Dự kiến: 5-7 giai đoạn)



Mục tiêu chính là chia nhỏ `MainScene.ts` (1400+ dòng) và `gameStore.ts` (600+ dòng) thành các phần nhỏ hơn, có nhiệm vụ rõ ràng, dễ bảo trì và debug.



## 1. Cấu trúc thư mục mới đề xuất



```text

src/

  ├── types/               # Chứa các interface (gameTypes.ts, npcTypes.ts)

  ├── stores/

  │   └── modules/         # Các store nhỏ (stats, inventory, shop, staff)

  ├── game/

  │   ├── managers/        # Các bộ quản lý logic của MainScene

  │   │   ├── NPCManager.ts

  │   │   ├── BuildManager.ts

  │   │   ├── FurnitureManager.ts

  │   │   ├── StaffManager.ts

  │   │   └── EnvironmentManager.ts

  │   └── MainScene.ts     # Trở thành file điều phối (Orchestrator)

  └── utils/

      └── saveSystem.ts    # Hệ thống quản lý lưu trữ tập trung

```



## 2. Giai đoạn thực hiện



### Giai đoạn 1: Kiểu dữ liệu & Store (Nền móng)

- [ ] Chuyển các Interface (`Customer`, `ShelfData`, `Worker`...) vào thư mục `src/types/`.

- [ ] Chia tách `gameStore.ts` thành 4 file store nhỏ trong `stores/modules/`.

- [ ] **Lưu ý**: Giữ nguyên tên các hàm Action để giảm thiểu lỗi khi cập nhật UI.

- [ ] Thêm JSDoc tiếng Việt cho tất cả các store.



### Giai đoạn 2: Cập nhật Vue Components

- [ ] Mở 11 file `.vue` trong `src/components/`.

- [ ] Thay thế `useGameStore()` bằng các store chuyên biệt tương ứng.

- [ ] Kiểm tra tính ổn định của giao diện.



### Giai đoạn 3: Phaser Environment & Furniture Managers

- [ ] Tách logic vẽ tường/sàn/mở rộng shop sang `EnvironmentManager.ts`.

- [ ] Tách logic hiển thị Kệ/Bàn/Quầy sang `FurnitureManager.ts`.

- [ ] Thêm JSDoc tiếng Việt giải thích logic hiển thị.



### Giai đoạn 4: NPC & AI Manager (Phần khó nhất)

- [ ] Chuyển state machine và di chuyển của khách hàng sang `NPCManager.ts`.

- [ ] Di chuyển `npcLeaveShop` và các logic bỏ cuộc vào class mới.

- [ ] Thêm JSDoc chi tiết cho các trạng thái NPC (`WANDER`, `LEAVE`...).



### Giai đoạn 5: Build Mode & Staff Manager

- [ ] Chuyển logic đặt đồ (Ghost Sprite) sang `BuildManager.ts`.

- [ ] Chuyển logic nhân viên sang `StaffManager.ts`.

- [ ] Làm sạch `MainScene.ts`, chỉ giữ lại các bước khởi tạo chính (Preload, Create).



## 3. Rủi ro và Giải pháp (User Review Required)



> [!WARNING]

> - **Rủi ro mất Save**: Khi chia nhỏ store, cấu trúc dữ liệu lưu trong `localStorage` có thể thay đổi. Tôi sẽ viết một hàm `loadSave` thông minh tại `saveSystem.ts` để đọc và ánh xạ dữ liệu cũ vào các store mới.

> - **Hiệu năng**: Việc liên kết nhiều file có thể làm tăng nhẹ thời gian build nhưng hoàn toàn không ảnh hưởng đến tốc độ chạy game (FPS).



## 4. Kế hoạch kiểm tra (Verification)

- Chụp ảnh màn hình so sánh tính năng trước và sau.

- Chạy thử quy trình: Khởi động -> Mua đồ -> Đặt đồ -> Mở shop -> Kết thúc ngày.

## 5. Các Nguyên tắc Kỹ thuật Bắt buộc (Technical Constraints)"
1. Dependency Injection cho Phaser Managers:
Tuyệt đối không dùng các hàm tiện ích (utility functions) rời rạc cho NPCManager, BuildManager, v.v. Tất cả các Manager phải được thiết kế dưới dạng Class. Khi khởi tạo trong MainScene, phải truyền instance của Scene vào (Dependency Injection) để Manager có thể sử dụng this.scene.
Ví dụ kiến trúc: class NPCManager { constructor(public scene: Phaser.Scene) { ... } }.

2. Tránh import chéo (Circular Dependency) giữa các Managers:
Các Manager không được phép import trực tiếp lẫn nhau. Ví dụ: NPCManager không được gọi trực tiếp FurnitureManager để tìm kệ hàng. Nếu cần giao tiếp, phải thông qua MainScene (Orchestrator) hoặc sử dụng hệ thống Event của Phaser (this.scene.events.emit()).

3. Quản lý trạng thái chia nhỏ (Pinia Circular Dependency):
Khi tách gameStore.ts thành 4 modules nhỏ, phải cực kỳ cẩn thận với lỗi Circular Dependency trong Vue. Nếu shopStore cần dùng dữ liệu của inventoryStore, hãy gọi useInventoryStore() ở bên trong action, tuyệt đối không gọi ở global scope của file store.

4. Ranh giới Dữ liệu (Strict Data Boundary):
Tuyệt đối KHÔNG đưa các object của Phaser (như Sprite, Text, Container) vào bên trong Pinia state. Pinia chỉ lưu trữ Dữ liệu thuần (Numbers, Strings, Arrays, JSON). Phaser tự quản lý các Object đồ họa của nó.