# THÔNG TIN DỰ ÁN: POKEMON TCG SHOP SIMULATOR (2D TOP-DOWN)

## 1. Tổng quan (Overview)
Đây là một dự án cá nhân, mô phỏng việc quản lý một cửa hàng bán thẻ bài Pokémon. Người chơi sẽ điều khiển chủ shop chạy quanh cửa hàng, đặt thẻ/pack lên kệ. Khách hàng (NPC) sẽ tự động đi vào, chọn hàng và ra quầy thanh toán.
Dự án sử dụng tên thật và dữ liệu thật của Pokémon (Không cần quan tâm bản quyền vì đây là local/private project).

## 2. Tech Stack (Công nghệ sử dụng)
- **Frontend Framework:** Vue 3 (Composition API) + Vite.
- **State Management:** Pinia (dùng để lưu trữ tiền, inventory, và đồng bộ dữ liệu giữa UI và Game).
- **Game Engine:** Phaser 3 (chạy trong 1 component của Vue).
- **Styling:** Tailwind CSS (cho các menu UI của Vue).

## 3. Kiến trúc Cốt lõi (Core Loop)
1. **Sáng:** Nhập hàng (Pack thẻ bài) -> Đặt lên kệ.
2. **Ngày:** Mở cửa -> NPC đi vào -> NPC tìm kệ có hàng -> Lấy hàng -> Ra thu ngân -> Player tương tác để tính tiền.
3. **Tối:** Đóng cửa -> Mở pack kiếm thẻ hiếm (Gacha) hoặc bán thẻ lẻ.

## 4. Nguyên tắc Code cho AI (Coding Guidelines)
- Luôn giữ Code Modularity: Tách biệt hoàn toàn logic UI (Vue) và logic Game vật lý (Phaser).
- Vue và Phaser giao tiếp độc quyền thông qua Event Emitter hoặc Pinia Store, tuyệt đối không thao tác DOM trực tiếp từ Phaser.
- Luôn sử dụng tiếng Anh cho việc đặt tên biến, hàm (Variable/Function names), nhưng comment giải thích bằng tiếng Việt nếu cần.
- Cấu trúc thư mục dự kiến:
  /src
    /components (Vue UI)
    /game (Phaser logic: scenes, entities, systems)
    /stores (Pinia)
    /assets (Images, JSON data)