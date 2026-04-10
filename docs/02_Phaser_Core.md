# MODULE 2: PHASER CORE & MÔI TRƯỜNG 2D

## 1. Thiết lập Game Config
- Type: `Phaser.AUTO`
- Scale: Bám theo kích thước của thẻ `div` chứa nó (Responsive).
- Physics Engine: `Arcade Physics` (gravity: 0 vì đây là game top-down).
- Pixel Art mode: `true` (để ảnh không bị mờ khi zoom).

## 2. Main Scene (Cửa hàng)
- **Tilemap:** Sử dụng Tiled để vẽ map cửa hàng. Cần có các layer: `Floor` (sàn nhà), `Walls` (tường - có collision), `Furniture` (kệ, bàn - có collision).
- **Camera:** Camera sẽ follow `Player` nhân vật chính. Chặn biên (setBounds) bằng với kích thước của Map.

## 3. Lớp Player (Nhân vật chủ shop)
- Kế thừa từ `Phaser.Physics.Arcade.Sprite`.
- Điều khiển bằng: Các phím W, A, S, D hoặc Arrow Keys.
- Animation: Đi lên, đi xuống, sang trái, sang phải.
- Có một vùng tương tác (Interaction Zone) phía trước mặt Player. Khi ấn phím 'E' hoặc 'Space', kiểm tra xem vùng này có đè lên Kệ hàng hay Quầy thu ngân không để trigger sự kiện.