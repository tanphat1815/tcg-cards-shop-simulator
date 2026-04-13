# TCG Card Shop - API Overhaul, Level Progression & 5v5 Skeleton

Tài liệu này yêu cầu tái cấu trúc hệ thống cửa hàng nhập hàng (Online Shop) bằng API TCGdex, áp dụng cơ chế mở khóa theo cấp độ người chơi, đa dạng hóa mặt hàng (Box & Pack) và thiết lập sườn đấu bài.

@AI: Hãy đọc cấu trúc project hiện tại, tìm các script đang đảm nhiệm chức năng tương ứng để chỉnh sửa, KHÔNG tạo script mới trừ khi thực sự cần thiết. Tận dụng các bảng dữ liệu Level/XP hiện có của project.

---

## 1. Cập nhật Shop Online (Box, Pack & Hệ thống Cấp độ)

**Mô tả:** Online Shop cần bán cả Booster Box và Booster Pack riêng lẻ dựa trên dữ liệu thật từ API TCGdex. Các mặt hàng này phải bị khóa và chỉ mở dần theo cấp độ (Level) của người chơi.

**Task dành cho AI:**
1. **Tìm script:** Xác định script quản lý Online Shop và hệ thống Level/Unlock của người chơi.
2. **Fetch Data & Generate Items:** Gọi API lấy danh sách `Sets`. Với mỗi Set trả về, tự động sinh ra **2 mặt hàng** trên cửa hàng:
   - `[set.name] Booster Box` (Giá nhập cao).
   - `[set.name] Booster Pack` (Giá nhập thấp, sử dụng `artwork_front` từ mảng `boosters`).
3. **Logic Mở khóa theo Cấp độ (Level Lock):**
   - Viết logic phân bổ cấp độ (Require Level) cho các Set. 
   - Mapping dữ liệu: Gắn các Set cơ bản (ví dụ các set có `cardCount` thấp hoặc release từ lâu) vào Level 1 để người chơi khởi nghiệp.
   - Các Set đặc biệt, mở rộng hoặc mới hơn sẽ yêu cầu Level cao hơn (ví dụ Level 5, 10, 20...).
   - Trên UI Online Shop, làm mờ (gray out) hoặc gắn icon ổ khóa cho các Box/Pack chưa đạt đủ cấp độ yêu cầu.

---

## 2. Logic Xé Pack, Rarity Weights & Binder

**Mô tả:** Cập nhật tính năng xé pack, đảm bảo bài rớt ra đúng Set, áp dụng tỷ lệ rớt thẻ hiếm và liên kết với Binder cá nhân.

**Task dành cho AI:**
1. **Tìm script:** Xác định script quản lý xé Pack, Inventory và Binder.
2. **Logic Sinh Thẻ (Rarity Weights):** Khi xé 1 Pack thuộc Set cụ thể:
   - Gọi API lấy mảng `cards` của Set đó.
   - Chọn ra 5 thẻ với trọng số độ hiếm: Đảm bảo 4 thẻ đầu tiên là Common/Uncommon. Thẻ thứ 5 có tỷ lệ rớt Rare, Ultra Rare hoặc Secret Rare dựa trên logic tự định nghĩa.
3. **Lấy Full Data:** Dùng API `/cards/{id}` lấy toàn bộ chỉ số (HP, đòn đánh, ảnh) cho 5 thẻ này.
4. **Lưu trữ:** Đưa 5 thẻ vào Inventory để người chơi trưng bày bán hoặc cất vào Binder phục vụ đấu bài.

---

## 3. Bộ khung Đấu bài 5v5 (Sát thương cố định)

**Mô tả:** Xây dựng sườn Battle 5v5 với NPC dựa trên hệ thống thẻ từ Binder. 

**Task dành cho AI:**
1. **Chuẩn bị Deck:** Tạo UI cho người chơi chọn 5 lá bài từ Binder đưa vào mảng `PlayerDeck`. NPC random 5 lá làm `EnemyDeck`.
2. **Battle State:** Xây dựng Turn-based logic. Thẻ ở vị trí index [0] là Active Card. Đọc `hp` từ API làm lượng máu.
3. **Logic Đánh (Fixed Damage):** - Lượt ai nấy đánh. Đọc mảng `attacks` của Active Card, lấy sát thương của đòn đánh đầu tiên (Dùng RegEx tách số nguyên: "90+" -> lấy 90).
   - So sánh hệ tấn công với `weaknesses` của mục tiêu, trùng hệ -> X2 sát thương.
   - Trừ HP trực tiếp. `HP <= 0` -> Loại thẻ, thẻ ở index tiếp theo đẩy lên thay thế.
4. **Kết quả:** Bên nào hết 5 lá trước thì thua trận.