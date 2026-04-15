# Naming Convention for Packs

Thư mục này chứa hình ảnh mặt trước của các gói bài (Booster Packs).

## Quy tắc đặt tên (Convention)
Sử dụng **setId** làm tên file chính. Code sẽ tự động tìm ảnh dựa trên ID này.

- **Định dạng ưu tiên**: `.webp`
- **Tên file**: `[setId].webp`

### Ví dụ:
- `base1.webp` -> Base Set
- `swsh1.webp` -> Sword & Shield Base Set
- `ex3.webp` -> EX Dragon

### Các file đặc biệt:
- `back.webp`: Hình ảnh mặt sau chung cho các gói bài (sẽ hiển thị ở giai đoạn mở pack).
- `default.webp`: Ảnh hiển thị mặc định nếu không tìm thấy setId tương ứng.
