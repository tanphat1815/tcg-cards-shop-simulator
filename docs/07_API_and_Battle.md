MODULE 7: TCGdex API INTEGRATION, PROGRESSION & 5v5 BATTLE
Tài liệu này hướng dẫn tái cấu trúc nguồn dữ liệu của cửa hàng bằng TCGdex API, đồng thời thiết lập hệ thống Battle 5v5.

@AI: Hãy đọc kỹ các nguyên tắc dưới đây. Ưu tiên sử dụng lại kiến trúc Store hiện có, KHÔNG phá vỡ logic của FurnitureManager và NPCManager.

1. Nguyên tắc Caching và Mapping Dữ liệu (BẮT BUỘC)
Caching: KHÔNG gọi API mỗi khi xé pack. Khi game khởi tạo, hãy fetch một danh sách các Sets (ví dụ: series Sword & Shield) và lưu vào apiStore.ts (Pinia). Khi người chơi mua Box/Pack của Set nào, hãy fetch toàn bộ Cards của Set đó 1 lần duy nhất và cache lại.

Mapping: Các Box/Pack sinh ra từ API phải được ánh xạ (map) về đúng interface ShopItem cũ (có id, name, type: 'pack'|'box', buyPrice, marketPrice).

2. Cập nhật Online Shop & Hệ thống Cấp độ
Dùng API /series/swsh (Sword & Shield) để lấy danh sách các Sets.

Vòng lặp qua các Sets, với mỗi Set tạo 2 mặt hàng trong Online Shop:

Box: Chứa 32 Packs. Giá nhập: random $40 - $60.

Pack: Chứa 5 Cards. Giá nhập: BoxPrice / 32.

Level Lock: Gán requiredLevel tăng dần theo index của mảng Sets. (VD: Set 0 cần Level 1, Set 1 cần Level 3, Set 2 cần Level 5). Trên UI, làm mờ (grayscale) và vô hiệu hóa nút mua nếu playerLevel < requiredLevel.

3. Logic Xé Pack & Rarity Weights
Khi xé 1 Pack của một Set, đọc mảng thẻ từ Cache.

Phân loại thẻ thành 2 mảng: commonPool (Common/Uncommon) và rarePool (Rare, Ultra Rare, Secret Rare...).

Random bốc 4 thẻ từ commonPool và 1 thẻ từ rarePool.

Fetch chi tiết 5 thẻ này bằng endpoint /cards/{id} (hoặc lấy từ Cache nếu có). Lưu 5 thẻ này vào mảng personalBinder của người chơi.

4. Bộ khung Đấu bài 5v5 (Fixed Damage & Turn-based)
UI Chuẩn bị: Một màn hình cho phép người chơi chọn 5 thẻ từ personalBinder đưa vào PlayerDeck. Máy tự random 5 thẻ làm EnemyDeck.

Chỉ số:

HP lấy từ thuộc tính hp của API.

Attack: Chọn đòn đánh đầu tiên trong mảng attacks. Sử dụng Regex `parseInt(attack.damage.replace(/\D/g, '')) |

| 10` để dọn dẹp các ký tự thừa (+, x, -) và đảm bảo luôn có sát thương tối thiểu.

Logic Trận đấu:

Đánh theo lượt (Turn-based). Thẻ ở index 0 là thẻ Active.

Check hệ: Nếu types của thẻ tấn công nằm trong mảng weaknesses.type của mục tiêu, sát thương x2.

Khi HP <= 0, loại thẻ đó, đẩy thẻ ở index tiếp theo lên thành Active.

Bên nào hết 5 thẻ trước là thua. Trả về kết quả (Nhận XP nếu thắng).

2. Các bước Prompt dành cho Antigravity
Vì lượng code thay đổi rất lớn, bạn tuyệt đối không bắt Antigravity làm hết file .md này trong 1 lần. Hãy gửi lần lượt 3 prompt sau:

Prompt 1: Tích hợp API và Nâng cấp Online Shop
"Hãy đọc file docs/07_API_and_Battle.md (Phần 1 và 2).
Nhiệm vụ của bạn:

Tạo một apiStore.ts bằng Pinia để xử lý việc gọi API TCGdex.

Cập nhật component OnlineShopMenu.vue. Khi mở component, hãy fetch danh sách các Sets (dùng series 'swsh' - Sword & Shield) và cache lại.

Tự động sinh ra 2 loại hàng (Box và Pack) cho mỗi Set, kèm theo logic Level Lock (khóa theo cấp độ người chơi).

Đảm bảo dữ liệu mua từ cửa hàng vẫn đẩy vào shopInventory theo đúng chuẩn interface cũ để game không bị lỗi."

Lưu ý: Test thử xem mua pack từ shop có trừ tiền và có hiện trong kho không rồi mới đi tiếp.

Prompt 2: Nâng cấp Logic Xé Pack (Gacha)
"Tiếp tục với Phần 3 của file docs/07_API_and_Battle.md.
Nhiệm vụ của bạn:

Cập nhật hàm mở Pack. Khi người chơi xé 1 Pack, hãy lấy danh sách thẻ của Set tương ứng từ TCGdex API (nhớ Cache lại để lần sau không phải fetch lại).

Viết thuật toán lọc: chọn ngẫu nhiên 4 thẻ Common/Uncommon và 1 thẻ có độ hiếm cao hơn.

Fetch chi tiết thông tin (HP, đòn đánh, ảnh) của 5 thẻ này.

Hiển thị UI xé pack và sau đó đưa 5 thẻ này vào personalBinder."

Prompt 3: Phát triển Hệ thống Đấu bài 5v5 (Minigame)
"Cuối cùng, hãy làm Phần 4 của docs/07_API_and_Battle.md.
Nhiệm vụ của bạn:

Tạo một UI mới tên là BattleArena.vue (có thể truy cập qua PC hoặc một cái Bàn chơi đặc biệt).
 
Viết UI cho phép người chơi lướt personalBinder và chọn đúng 5 lá bài để tạo Deck.

Viết vòng lặp trận đấu (Game Loop) theo kiểu Turn-based. Sử dụng Regex an toàn để trích xuất số sát thương từ text của TCGdex. Nhớ xử lý logic điểm yếu (Weakness x2 sát thương).

Hiển thị thanh máu (HP bar) đơn giản dưới mỗi thẻ đang Active và hiệu ứng chữ bay lên khi nhận sát thương.

Thông báo Thắng/Thua khi kết thúc trận."

Với sự cẩn thận về việc Caching và Regex an toàn này, game của bạn sẽ vừa có dữ liệu thật xịn xò, vừa mượt mà không lo bị crash do nghẽn mạng! Bạn tiến hành thử Bước 1 xem Antigravity xử lý API TCGdex mượt không nhé.

https://tcgdex.dev/

https://github.com/RealrealChaiR/elestrals-tcg-card-shop-simulator