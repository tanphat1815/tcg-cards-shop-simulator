Đóng vai trò là một Principal Software Architect và Technical Writer. Tôi là một người quản lý dự án cực kỳ khắt khe về kiến trúc hệ thống và hiệu năng. Sau quá trình tái cấu trúc (refactor) quy mô lớn, tôi cần bạn tổng hợp toàn bộ hiện trạng dự án và tạo ra một tài liệu mang tên docs/PROJECT_ARCHITECTURE.md.

Tài liệu này sẽ đóng vai trò là 'Kinh thánh' (Single Source of Truth) để onboarding cho các lập trình viên mới hoặc làm Context Đầu Vào cho các AI Agent khác. Nó không chỉ mô tả dự án mà phải thiết lập các NGUYÊN TẮC KỸ THUẬT TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM.

Vui lòng viết file .md này bằng tiếng Việt, trình bày chuyên nghiệp (bảng, sơ đồ cây, blockquote cảnh báo) và BẮT BUỘC bao gồm các phần sau:

1. Tổng quan & Vòng lặp Gameplay (Core Loop):

Mô tả game: Pokemon TCG Shop Simulator 2D (Webgame).

Liệt kê vòng lặp: Nhập hàng (Box/Pack) -> Trưng bày lên kệ -> Phục vụ khách (Bán/Trade) -> Mở Pack cá nhân (Gacha) -> Đấu bài 5v5 -> Mở rộng shop & Thuê nhân viên.

2. Hệ sinh thái Công nghệ (Tech Stack):

Liệt kê: Vue 3 (Composition API), Vite, Phaser 3, Pinia, TailwindCSS, và đặc biệt là hệ thống SQLite chạy qua Web Worker để quản lý data thẻ bài offline.

3. Cấu trúc Thư mục (Feature-Based Architecture):

Vẽ sơ đồ cây src/ tập trung vào src/features/ (gồm: api, battle, customer, furniture, inventory, progression, shared, shop-ui, staff).

Giải thích rõ lý do dự án sử dụng Feature-based, mỗi feature phải tự đóng gói types, store, manager và components của riêng nó.

4. Phân tích Module Cốt lõi & Nguyên tắc Khởi tạo:

Orchestrator (MainScene.ts): Giải thích rõ chiến lược Hybrid Direct Import. MainScene PHẢI import các Managers trực tiếp từ các thư mục feature. TUYỆT ĐỐI cấm dùng file index.ts (barrel export) để gom nhóm manager nhằm giữ tính Modular 100%.

Game Managers: Nêu rõ trách nhiệm độc lập của NPCManager, FurnitureManager, StaffManager, CustomerServiceManager... và nguyên tắc Dependency Injection (truyền scene vào class).

State Management (Pinia): Giải thích vai trò của gameStore.ts (Facade Pattern) và các store con.

5. BỘ LUẬT THÉP VỀ GIAO TIẾP VÀ HIỆU NĂNG (Hard Rules):
Hãy dùng định dạng Cảnh báo đỏ (Warning/Danger) cho các nguyên tắc sau:

Rule 1 - Ranh giới Vue và Phaser: Phaser KHÔNG BAO GIỜ thao tác trực tiếp DOM. Vue KHÔNG BAO GIỜ gọi hàm trực tiếp trong Scene. Giao tiếp 1 chiều qua Pinia và Event Bus.

Rule 2 - Cấm Circular Dependency: Store không được import chéo nhau ở Global Scope. (Ví dụ: Không dùng gameStore bên trong action của inventoryStore để gọi save game).

Rule 3 - Tối ưu 3D Tilt Effect: Bắt buộc dùng Vanilla JS để can thiệp CSS Variables (--rotate-x, --rotate-y, --mouse-x) trong các sự kiện mousemove của thẻ bài (Component PokemonCard3D.vue). TUYỆT ĐỐI KHÔNG lưu tọa độ chuột vào ref() của Vue để tránh re-render làm sập FPS.

Rule 4 - Auto-Save: Trong App.vue, bắt buộc phải $subscribe vào từng store con riêng biệt để kích hoạt save game. Subscribe vào Facade Store sẽ không hoạt động.

6. Xử lý Dữ liệu & Gacha:

Giải thích cơ chế Web Worker + Local SQLite để query 130.000+ thẻ bài mà không làm treo UI.

Giải thích cơ chế Lazy Loading hình ảnh qua mạng.

Thuật toán Gacha: Weighted Random phân loại Rarity, và quy tắc thẻ hiếm nhất phải luôn nằm ở index cuối cùng (vị trí số 6) khi xé pack.

7. Hệ thống Đấu bài (Battle System):

Tóm tắt luồng Turn-based (Basic và Advanced).

Nhấn mạnh logic bóc tách sát thương bằng Regex (parseDamage) từ database và cơ chế tính Năng lượng (Energy)/Rút lui (Retreat) thuần bằng Class BattleLogic.ts (không dính dáng tới Vue Reactivity).

Hãy tiến hành quét toàn bộ codebase hiện tại, đối chiếu với các yêu cầu trên và tự động tạo ra file docs/PROJECT_ARCHITECTURE.md hoàn chỉnh. Báo cáo lại cho tôi khi hoàn thành