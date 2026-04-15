MODULE 8: HOLOGRAPHIC 3D CARD INTEGRATION (simeydotme/pokemon-cards-css)
Tài liệu này cung cấp hướng dẫn tích hợp hệ thống CSS Holographic của @simeydotme vào dự án Vue 3 + Vite. Hệ thống này sẽ thay thế toàn bộ các hiệu ứng 3D thô sơ trước đây.

@AI Coder: Hãy đọc kỹ và thực thi ĐÚNG cấu trúc dưới đây. TUYỆT ĐỐI KHÔNG cài đặt các thư viện rác (như vue-pokemon-cards-css). Chúng ta sẽ sử dụng CSS gốc và viết logic Mouse Tracking bằng Vanilla JS bên trong Vue 3 để tối ưu hiệu năng.

1. Tích hợp Asset & CSS (Global Styling)
Hệ thống của Simey yêu cầu một bộ CSS cốt lõi và một số hình ảnh texture (để làm hiệu ứng lấp lánh, galaxy).

Task 1: Tạo file src/assets/styles/pokemon-cards.css. Truy cập F:\Phatnt-sources\Pokemon\pokemon-cards-css-main\pokemon-cards-css-main và copy toàn bộ CSS lõi (các class .card, .card__shine, .card__glare và các pseudo-elements) vào file này.

Task 2: Import file css này vào src/main.ts hoặc App.vue để nó trở thành Global CSS.

Task 3: (Tùy chọn) Tải các file hình ảnh texture (như cosmos-holo.webp, rainbow-holo.webp) từ thư mục public của repo đó và bỏ vào public/assets/holo/ của dự án chúng ta. Cập nhật lại đường dẫn URL trong file CSS vừa copy.

2. Logic Ánh xạ Dữ liệu (TCGdex API Mapping)
Dữ liệu Rarity của TCGdex rất đa dạng, trong khi CSS của Simey sử dụng các thuộc tính data-rarity cụ thể.

Task 4: Tạo file src/features/shared/utils/cardRarityMapper.ts.

Task 5: Viết một function mapRarityToCSS(tcgdexRarity: string): string. Sử dụng rules sau:

Nếu chứa "VMAX", "VSTAR" -> return 'rare holo vmax'

Nếu chứa "V" -> return 'rare holo v'

Nếu chứa "Hyper" hoặc "Secret" hoặc "Gold" -> return 'rare secret'

Nếu chứa "Ultra" hoặc "Illustration" hoặc "Full Art" -> return 'rare ultra'

Nếu chứa "Shiny" hoặc "Radiant" -> return 'radiant rare'

Nếu chứa "Holo" hoặc "ACE SPEC" -> return 'rare holo'

Mặc định (Common, Uncommon, None) -> return 'common'

3. Core Component: PokemonCard3D.vue
Đây là Component trung tâm sẽ được dùng ở MỌI NƠI (Binder, Pack Opening, Battle).

Vị trí: src/features/shared/components/PokemonCard3D.vue

Props: Nhận vào một card: CardData (Từ TCGdex).

3.1. Cấu trúc HTML (Bắt buộc phải đúng class của thư viện):html
<div class="card__shine"></div>

<div class="card__glare"></div>

<div v-if="!isLoaded" class="card__loading">Loading...</div>
3.2. Hard Rules về Hiệu năng (Mouse Tracking Logic):
Hệ thống của Simey hoạt động bằng cách truyền các biến CSS (CSS Variables) vào style của thẻ HTML dựa trên tọa độ chuột.

TUYỆT ĐỐI KHÔNG lưu các biến --mx, --my, --rx, --ry vào ref() của Vue. Điều này sẽ khiến Vue re-render hàng chục lần mỗi giây gây tụt FPS nghiêm trọng.

Cách làm đúng: Trong hàm handleMouseMove(e), dùng Vanilla JS để tính toán và gán trực tiếp vào Style:

TypeScript
const handleMouseMove = (e: MouseEvent) => {
  if (!cardElement.value) return;

  // Tính toán tọa độ và góc nghiêng (Tilt)
  const rect = cardElement.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const px = Math.max(Math.min((100 / rect.width) * x, 100), 0);
  const py = Math.max(Math.min((100 / rect.height) * y, 100), 0);

  // Tính góc xoay (thường từ -15deg đến 15deg)
  const rx = (px - 50) * -0.3; // Chỉnh hệ số 0.3 để tăng/giảm độ nghiêng
  const ry = (py - 50) * 0.3;

  // Dùng requestAnimationFrame hoặc inject trực tiếp vào DOM
  cardElement.value.style.setProperty('--pointer-x', `${px}%`);
  cardElement.value.style.setProperty('--pointer-y', `${py}%`);
  cardElement.value.style.setProperty('--rx', `${rx}deg`);
  cardElement.value.style.setProperty('--ry', `${ry}deg`);
  // Cài đặt thêm các biến như --posx, --posy tùy theo yêu cầu của CSS gốc
};

const handleMouseLeave = () => {
  if (!cardElement.value) return;
  cardElement.value.style.removeProperty('--pointer-x');
  // Trả thẻ về trạng thái tĩnh với transition mượt mà
};
4. Tích hợp vào UI hiện tại
Vào CardDetailOverlay.vue (được tạo ở bước trước), thay thế phần hiển thị thẻ bài bằng component <PokemonCard3D :card="selectedCard" /> này.

Mở rộng sử dụng component này cho màn hình Gacha (Xé Pack). Khi bài đang úp, ẩn .card__front và hiện mặt lưng của thẻ, khi lật lên thì áp dụng hiệu ứng Holo này.

5. Verification Check (Nghiệm thu)
AI Coder sau khi code xong phải đảm bảo:

Rê chuột lên thẻ bài, thẻ phải lật nghiêng theo hướng chuột.

Với thẻ Rare trở lên, phải thấy lớp cầu vồng/galaxy lướt qua mặt thẻ dựa trên hướng sáng (Glare & Shine).

FPS của trình duyệt không được tụt khi rê chuột liên tục (Nhờ tối ưu DOM trực tiếp).

***