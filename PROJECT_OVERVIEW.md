# 📦 Project Overview: TCG Card Shop Simulator

Dự án này là một game giả lập quản lý cửa hàng thẻ bài (Trading Card Game - TCG), kết hợp giữa sức mạnh đồ họa của **Phaser 3** và khả năng quản lý giao diện linh hoạt của **Vue 3**.

---

## 🏗️ Điều khiển (Controls)
- **Di chuyển**: Phím **WASD** hoặc **Các phím mũi tên**.
- **Tương tác**: Phím **E** (Thanh toán, Quản lý kệ hàng).
- **Xây dựng**: Phím **R** để xoay vật thể 90 độ.
- **Camera**: Click Chuột phải/Chuột giữa và kéo để di chuyển camera.
- **Hệ thống**: Phím **G** (Bật/tắt Debug Physics), Phím **P** (Chạy Diagnostics).

---

## 🛠 1. Công nghệ & Kiến trúc (Tech Stack)

### **Core Technologies:**
- **Game Engine**: [Phaser 3](https://phaser.io/) xử lý toàn bộ thế giới 2D, vật lý, di chuyển nhân vật (NPC/Player) và render đồ họa shop.
- **UI Framework**: [Vue 3](https://vuejs.org/) (Vite) xử lý các lớp giao diện người dùng (HUD, Menus, Modals).
- **State Management**: [Pinia](https://pinia.vuejs.org/) đồng bộ trạng thái giữa Vue và Phaser.
- **Styling**: Tailwind CSS (Thiết kế giao diện hiện đại, Premium).

### **Cài đặt & Khởi chạy:**
```bash
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (Dev)
npm run dev

# Build sản phẩm hoàn chỉnh
npm run build
```

---

## 🏗 2. Cấu trúc Thư mục (Project Structure)

```text
src/
├── components/       # Các UI Component Vue (Menu, HUD, Pack Opening)
├── game/             # Logic Phaser (Scenes, Managers)
│   ├── managers/     # Các module quản lý thực thể (NPC, Nhân viên, Nội thất, Môi trường)
│   └── MainScene.ts  # Scene chính điều phối toàn bộ game
├── stores/           # Hệ thống quản lý trạng thái (Pinia)
│   ├── modules/      # Tách nhỏ Store theo tính năng (Shop, Stats, Staff, Inventory)
│   └── gameStore.ts  # Facade Store - Cổng giao tiếp trung tâm
├── config/           # Cấu hình tĩnh (Dữ liệu thẻ bài, bảng giá nội thất, leveling)
└── types/            # Khai báo kiểu dữ liệu chung
```

---

## 🎮 3. Các Tính năng Chính (Core Features)

### 🏬 Hệ thống Quản lý Shop
- **Xây dựng & Quy hoạch**: Mua nội thất (Kệ, Bàn chơi bài, Quầy thu ngân) từ Online Shop và đặt vào cửa hàng với cơ chế **Build Mode/Ghost Preview**.
- **Expansion (Mở rộng)**: Nâng cấp diện tích shop theo từng giai đoạn (Lot A, B, C...) để chứa thêm nhiều đồ hơn.
- **Mở cửa/Đóng cửa**: Quản lý vòng lặp ngày đêm. Cuối ngày có hệ thống tổng kết doanh thu và trừ chi phí (Tiền thuê, Lương nhân viên).

### 👥 Hệ thống Nhân sự (NPC & Staff)
- **AI Khách hàng**: Khách tự động vào shop, tìm kiếm sản phẩm trên kệ, xếp hàng thanh toán hoặc tham gia chơi bài tại các bàn chơi.
- **AI Nhân viên**: Thuê nhân viên để tự động hóa công việc. 
    - **Cashier**: Phục vụ tại quầy thu ngân được chỉ định.
    - **Stocker**: Tự động đi kiểm tra và sắp xếp hàng hóa.
- **Trạng thái**: Nhân viên có chu kỳ làm việc và nghỉ ngơi phía trước cửa hàng.

### 🎲 Cơ chế Gacha & Thẻ bài (Gacha Mechanics)
- **Tỷ lệ hiếm**: Mỗi loại Pack (Basic, Rare, Silver, Golden) có trọng số rơi thẻ khác nhau (Common, Uncommon, Rare).
- **Thưởng XP**: Việc mở được thẻ hiếm sẽ mang lại lượng EXP lớn hơn cho shop.
- **Card Binder**: Hệ thống theo dõi bộ sưu tập cá nhân, lưu lại mọi thẻ bài bạn đã từng sở hữu.

### 💾 Hệ thống Lưu trữ (Persistence)
- Dữ liệu được tự động lưu vào **LocalStorage** mỗi khi có thay đổi quan trọng trong Store.
- Hệ thống hỗ trợ "Migration" cho các bản lưu cũ để đảm bảo tính ổn định khi cập nhật tính năng mới.

### 🃏 Hệ thống Thẻ bài (TCG System)
- **Mở Pack**: Hiệu ứng mở bao thẻ bài (Pack Opening) cực kỳ chân thực với âm thanh, hiệu ứng hạt và độ hiếm (Common, Uncommon, Rare).
- **Sưu tập (Binder)**: Xem lại các thẻ bài quý hiếm đã sưu tầm được trong Binder cá nhân.
- **Kinh doanh**: Bán các gói thẻ bài trên kệ để kiếm lợi nhuận và điểm kinh nghiệm (EXP).

---

## 🔄 4. Luồng Hoạt động (General Flow)

### Vòng lặp Dữ liệu:
1. **Store (Pinia)** thay đổi (Ví dụ: Người chơi nhặt một cái quầy lên).
2. **Phaser (MainScene)** nhận tín hiệu via `$subscribe` và gọi hàm `sync` tương ứng của Manager.
3. **Manager** cập nhật Sprite trong thế giới game (Xóa/Thêm/Di chuyển).

### Vòng lặp Gameplay:
1. **Chuẩn bị**: Mua hàng, bày biện kệ, sắp xếp quầy thu ngân trong chế độ Xây dựng.
2. **Kinh doanh**: Nhấn "Mở cửa". Khách bắt đầu vào. Nhân viên thu ngân thanh toán.
3. **Phát triển**: Thu tiền lãi -> Mở pack kiếm thẻ hiếm -> Nâng cấp shop -> Lên level mở khóa hàng hóa mới.
4. **Kết thúc**: Cuối ngày tổng kết tài chính, chuẩn bị cho ngày tiếp theo.

---

## 🚀 5. Điểm nhấn Kỹ thuật (Technical Highlights)

- **Modular Design**: Toàn bộ logic game trong Phaser được tách vào các `Manager` độc lập (NPC, Staff, Environment...), giúp việc mở rộng tính năng mới cực kỳ dễ dàng.
- **Physics-UI Synergy**: Phaser xử lý Collision (va chạm) và Hitbox, trong khi Vue xử lý các thao tác chuột phức tạp, cả hai giao tiếp mượt mà qua Store.
- **Optimization**: Sử dụng cơ chế Update Logic rời rạc (AI NPC chỉ tính toán mỗi 100ms thay vì 60fps) để đảm bảo hiệu năng.
- **Input Forwarding**: Tối ưu hóa `pointer-events` để đảm bảo UI không cản trở việc điều khiển game trong các chế độ Xây dựng chuyên sâu.

---
## 🔮 6. Hướng phát triển (Future Roadmap)

- [ ] **Hệ thống Nhiệm vụ**: Thêm các quest hàng ngày để người chơi nhận thưởng.
- [ ] **Giải đấu**: Cho phép tổ chức các giải đấu bài tại shop để thu hút thêm khách hàng VIP.
- [ ] **Nội thất nâng cao**: Thêm các loại máy bán hàng tự động, máy chơi game arcade.
- [ ] **Hệ thống nhân sự nâng cấp**: Nhân viên có thể thăng cấp và học kỹ năng mới.

---
> 💡 *Dự án này không chỉ là một game mà là một khung sườn (Framework) mạnh mẽ để xây dựng các loại game giả lập kinh doanh 2D hiện đại.*
