# **Báo cáo Phân tích Kỹ thuật, Thiết kế và Pháp lý: Khả thi hóa Dự án Webgame Mô phỏng Cửa hàng Thẻ bài**

## **Tổng quan và Tuyên bố Vấn đề**

Sự trỗi dậy của thể loại trò chơi mô phỏng quản lý kinh doanh, đặc biệt là các biến thể tập trung vào thị trường ngách như "TCG Card Shop Simulator", đã chứng minh sức hút khổng lồ đối với cộng đồng game thủ toàn cầu.1 Việc thiết kế một nguyên mẫu trò chơi trên nền tảng web (webgame) nhằm tái hiện trải nghiệm quản lý cửa hàng, thu thập và kinh doanh thẻ bài đòi hỏi sự kết hợp phức tạp giữa nhiều lĩnh vực kỹ thuật phần mềm. Câu hỏi được đặt ra là liệu một cá nhân hoặc một nhóm phát triển có thể tận dụng một kho lưu trữ khổng lồ chứa hàng nghìn tệp tin hình ảnh thẻ bài (cụ thể là hình ảnh Pokémon) để lập trình một dự án webgame mô phỏng hoạt động trên trình duyệt hay không.

Phân tích sâu rộng về mặt kỹ thuật phần mềm, thiết kế hệ thống, tối ưu hóa tài nguyên đồ họa và khuôn khổ pháp lý sở hữu trí tuệ chỉ ra rằng: việc xây dựng hệ thống phần mềm webgame là hoàn toàn khả thi và có thể đạt được hiệu suất cao thông qua các công nghệ web hiện đại. Tuy nhiên, việc sử dụng trực tiếp cơ sở dữ liệu hình ảnh Pokémon có bản quyền mang lại những rủi ro pháp lý nghiêm trọng, có khả năng dẫn đến việc dự án bị đình chỉ hoặc đối mặt với các vụ kiện tụng tốn kém. Báo cáo này sẽ bóc tách từng lớp của kiến trúc phần mềm, cơ chế trò chơi cốt lõi, phương pháp tối ưu hóa dữ liệu khổng lồ, và phân tích rủi ro pháp lý để phác thảo một lộ trình phát triển toàn diện.

## **Đánh giá và Lựa chọn Hệ sinh thái Công nghệ (Tech Stack)**

Để xây dựng một trò chơi mô phỏng quản lý cửa hàng trên nền tảng trình duyệt, bước đầu tiên là xác định chiều không gian của trò chơi: 2D (góc nhìn từ trên xuống hoặc đồ họa isometric) hay 3D (góc nhìn thứ nhất hoặc góc nhìn tự do). Quyết định này chi phối toàn bộ kiến trúc công nghệ lõi.

### **Công cụ Kết xuất Đồ họa (Rendering Engines)**

Trình duyệt web hiện đại hỗ trợ kết xuất đồ họa mạnh mẽ thông qua WebGL và chuẩn API mới nổi WebGPU.4 Tùy thuộc vào định hướng hình ảnh, các công cụ sau đây được đánh giá cao nhất trong hệ sinh thái JavaScript/TypeScript:

| Nền tảng (Engine) | Môi trường | Mô hình cấp phép | Điểm mạnh cốt lõi | Hạn chế |
| :---- | :---- | :---- | :---- | :---- |
| **Phaser.js** | 2D (Canvas/WebGL) | MIT (Mã nguồn mở) | Tốc độ kết xuất 2D cực nhanh, hệ thống vật lý tích hợp, dung lượng gói tải xuống siêu nhỏ (\<200KB), tài liệu phong phú.5 | Khả năng xử lý đồ họa 3D bị giới hạn, không phù hợp cho mô phỏng không gian thực tế.7 |
| **Three.js** | 3D (WebGL) | MIT (Mã nguồn mở) | Tiêu chuẩn ngành cho đồ họa 3D trên web, cộng đồng khổng lồ, khả năng kiểm soát đường ống kết xuất (rendering pipeline) mức độ thấp.4 | Yêu cầu kiến thức sâu về toán học không gian và đồ họa máy tính, quản lý trạng thái thủ công phức tạp.8 |
| **React Three Fiber (R3F)** | 3D (WebGL qua React) | MIT (Mã nguồn mở) | Tích hợp hoàn hảo với React, sử dụng cú pháp khai báo (declarative) để quản lý vòng đời đối tượng 3D, hệ sinh thái plugin (Drei) mạnh mẽ.9 | Phụ thuộc vào React, có thể gặp vấn đề về hiệu suất nếu không tối ưu hóa tốt các vòng lặp tái kết xuất (re-renders).12 |
| **PlayCanvas** | 3D (WebGL) | MIT / Độc quyền | Trình chỉnh sửa hình ảnh trực tuyến (visual editor) mạnh mẽ, tối ưu hóa cho thiết bị di động, hệ thống nén tài nguyên ưu việt.4 | Trình chỉnh sửa đám mây yêu cầu kết nối mạng, các dự án riêng tư có thể yêu cầu trả phí bản quyền.4 |
| **Godot (Web Export)** | 2D & 3D | MIT (Mã nguồn mở) | Hệ thống node linh hoạt, hỗ trợ GDScript (tương tự Python), xuất bản đa nền tảng dễ dàng.15 | Kích thước tệp tin xuất ra web (WebAssembly) thường lớn hơn các thư viện thuần JavaScript, hiệu suất web đôi khi không ổn định bằng ứng dụng gốc.14 |

Nếu dự án hướng tới việc tái tạo trải nghiệm của "TCG Card Shop Simulator" (vốn là một trò chơi 3D góc nhìn thứ nhất phát triển trên Unity), việc sử dụng **React Three Fiber (R3F)** kết hợp với hệ sinh thái **Next.js** được xem là phương án tối ưu cho webgame.10 R3F cho phép các nhà phát triển tận dụng luồng dữ liệu của React để xử lý giao diện người dùng (UI) phức tạp—chẳng hạn như menu cửa hàng, kho đồ, và hệ thống định giá—trong khi vẫn duy trì một không gian 3D sống động để người chơi sắp xếp các kệ hàng và tương tác với khách hàng.10 Tuy nhiên, nếu nhóm phát triển có nguồn lực hạn chế và muốn ưu tiên tốc độ phát triển, việc chuyển hướng sang đồ họa 2D góc nhìn từ trên xuống (Top-down) sử dụng **Phaser.js** sẽ giảm thiểu đáng kể chi phí sản xuất tài nguyên 3D và độ phức tạp toán học.5

### **Kiến trúc Dữ liệu và Quản lý Trạng thái (Backend & State Management)**

Một trò chơi mô phỏng kinh tế chứa hàng vạn biến số thay đổi liên tục mỗi giây: tọa độ của khách hàng, số lượng thẻ bài trên kệ, biến động giá cả thị trường, và dữ liệu vật lý.

**Backend và Đồng bộ hóa Đám mây:** Kiến trúc nguyên khối (Monolithic) truyền thống như Laravel (PHP) hay Django (Python) mặc dù mạnh mẽ, nhưng thường gặp độ trễ trong các ứng dụng yêu cầu thời gian thực (real-time).20 Thay vào đó, việc kết hợp **Next.js** với các nền tảng Backend-as-a-Service (BaaS) như **Supabase** hoặc **Firebase** đang trở thành tiêu chuẩn mới. Supabase, được xây dựng trên nền tảng PostgreSQL, cung cấp các luồng WebSockets cho phép cập nhật trạng thái trò chơi theo thời gian thực.21 Điều này đặc biệt hữu ích nếu webgame có kế hoạch tích hợp tính năng nhiều người chơi (multiplayer), cho phép người chơi trao đổi thẻ bài, định giá trên một thị trường chứng khoán ảo chung, hoặc ghé thăm cửa hàng của nhau.23

**Quản lý Trạng thái Cục bộ (Local State Management):** Trong môi trường React/Next.js, việc sử dụng Context API hoặc Redux để lưu trữ dữ liệu vòng lặp trò chơi là một sai lầm kỹ thuật nghiêm trọng. Context API sẽ kích hoạt tái kết xuất (re-render) toàn bộ cây thành phần mỗi khi một biến số nhỏ (như tọa độ khách hàng) thay đổi, dẫn đến sụt giảm tốc độ khung hình (FPS) thảm hại.25

Thay vào đó, **Zustand** nổi lên như một giải pháp quản lý trạng thái hoàn hảo cho các trò chơi dựa trên React.25 Zustand cung cấp khả năng lưu trữ trạng thái nằm ngoài vòng lặp kết xuất của React. Thông qua kỹ thuật cập nhật tạm thời (transient updates) và các bộ chọn (selectors), hệ thống có thể cập nhật vị trí của hàng trăm thẻ bài trên kệ mà không kích hoạt bất kỳ quá trình re-render nào trên giao diện người dùng.25 Kết hợp với hàm useShallow, Zustand giúp tối ưu hóa việc so sánh bộ nhớ, đảm bảo hiệu năng ở mức tối đa ngay cả khi quy mô cửa hàng mở rộng.29

### **Vòng lặp Trò chơi (Game Loop) và Mẫu Thiết kế ECS**

Mọi trò chơi mô phỏng đều cần một nhịp đập trung tâm, được gọi là Vòng lặp Trò chơi (Game Loop). Trái ngược với các ứng dụng web thông thường chỉ phản hồi khi có sự kiện từ người dùng (Event-driven), trò chơi yêu cầu một vòng lặp chạy liên tục để tính toán AI của khách hàng, cập nhật chu kỳ kinh tế và vẽ lại đồ họa.31

Việc sử dụng setInterval trong JavaScript bị coi là lỗi thời và thiếu chính xác do độ trễ bộ đệm và hiện tượng tụt đồng bộ (desync).34 Tiêu chuẩn hiện tại là sử dụng requestAnimationFrame kết hợp với thời gian delta (delta time \- khoảng thời gian giữa hai khung hình) để đảm bảo mô phỏng chạy nhất quán trên các thiết bị có tần số quét màn hình khác nhau (60Hz, 120Hz, 144Hz).35

Để quản lý hàng nghìn thẻ bài và hàng chục khách hàng cùng lúc mà không làm nghẽn bộ nhớ trình duyệt, kiến trúc hướng đối tượng (OOP) truyền thống cần được thay thế bằng mẫu thiết kế **Entity-Component-System (ECS)**.38 Trong mô hình ECS được triển khai bằng JavaScript:

* **Entity (Thực thể):** Không chứa logic hay phương thức, chỉ là một mã định danh (ID) duy nhất. Một gói thẻ bài hay một khách hàng chỉ là một ID.  
* **Component (Thành phần):** Chứa dữ liệu thuần túy. Ví dụ: PositionComponent chứa {x, y, z}, ValueComponent chứa {marketPrice, cost}.  
* **System (Hệ thống):** Chứa toàn bộ logic. PricingSystem sẽ lặp qua tất cả các thực thể có ValueComponent và tự động điều chỉnh giá trị của chúng theo thời gian.39

Mẫu thiết kế ECS giúp sắp xếp dữ liệu liên tục trong bộ nhớ đệm CPU (CPU Cache Line), giải quyết bài toán hiệu suất (Performance bottleneck) cho các mô phỏng quy mô lớn, cho phép trình duyệt xử lý hàng chục nghìn thực thể mà vẫn duy trì mức 60 FPS.41

## **Giải quyết Bài toán Tài nguyên Khổng lồ: Tối ưu hóa Dữ liệu Hình ảnh**

Câu hỏi cốt lõi của người dùng đề cập đến việc sở hữu "rất nhiều các file ảnh thẻ bài pokemon". Lượng dữ liệu này là một trong những rào cản kỹ thuật lớn nhất đối với một ứng dụng web. Trung bình, một trang web tiêu chuẩn tải khoảng 2MB dữ liệu, với hình ảnh chiếm hơn một nửa.44 Nếu một thư viện thẻ bài chứa 10,000 hình ảnh độ phân giải cao, tổng dung lượng có thể lên tới hàng chục Gigabyte. Nếu tải đồng loạt, bộ nhớ RAM của thiết bị khách sẽ tràn và trình duyệt sẽ bị sập (Crash).45

Để đảm bảo hiệu suất, đường ống quản lý tài nguyên (Asset Management Pipeline) cần tuân thủ nghiêm ngặt các quy tắc nén, phân phối và kết xuất.

### **Nén và Định dạng Dữ liệu Đầu nguồn**

Hình ảnh gốc dưới định dạng PNG hoặc JPEG không được nén có dung lượng cực lớn và không phù hợp cho môi trường web game.46 Bước đầu tiên là thiết lập một hệ thống tự động hóa quy trình chuyển đổi định dạng hình ảnh.

Các công cụ như ImageMagick, hoặc các đoạn mã Node.js chạy ngầm, cần được sử dụng để chuyển đổi toàn bộ thư viện thẻ bài sang các định dạng thế hệ mới như **WebP** hoặc **AVIF**.47 WebP cung cấp thuật toán nén không mất dữ liệu (lossless) và mất dữ liệu (lossy), giúp giảm kích thước tệp từ 30% đến 89% so với JPEG/PNG truyền thống trong khi vẫn bảo toàn độ trong suốt (Alpha channel) cần thiết cho viền thẻ bài.46 Hơn nữa, độ phân giải của hình ảnh thẻ bài cần được thu nhỏ (downscaling) xuống kích thước hiển thị thực tế trong trò chơi. Không có lý do gì để tải một tệp ảnh thẻ bài 4K (4096x4096px) khi nó chỉ chiếm một góc 200x300px trên màn hình người chơi.46

### **Phân phối Mạng (CDN) và Tải Lười (Lazy Loading)**

Trong môi trường web, chiến lược phân phối tài nguyên đóng vai trò quan trọng ngang bằng với quá trình nén ảnh. Toàn bộ hình ảnh thẻ bài không bao giờ được đóng gói trực tiếp vào mã nguồn ứng dụng (bundle). Thay vào đó, chúng phải được lưu trữ trên nền tảng đám mây (như AWS S3) và được phân phối thông qua **Mạng Phân phối Nội dung (CDN)** như Cloudflare, ImageKit, hoặc Cloudinary.51

CDN giúp phân phối dữ liệu từ máy chủ gần với vị trí địa lý của người chơi nhất, giảm thiểu độ trễ tải mạng.53 Thêm vào đó, các dịch vụ như Cloudinary cho phép thao tác URL động để tự động nén, cắt và chuyển đổi định dạng hình ảnh phù hợp với thiết bị đích đang yêu cầu (Smart Imaging).54

Cơ chế **Lazy Loading (Tải lười)** là quy định bắt buộc đối với UI quản lý bộ sưu tập (Album/Binder). Việc sử dụng thuộc tính HTML loading="lazy" hoặc IntersectionObserver API trong JavaScript đảm bảo trình duyệt chỉ tải về (fetch) các hình ảnh khi chúng thực sự đi vào vùng hiển thị (Viewport) của người dùng khi cuộn chuột.51 Các hình ảnh nằm ngoài màn hình sẽ không tiêu tốn băng thông, giải phóng luồng chính (Main thread) của trình duyệt để tập trung tính toán logic mô phỏng.44

### **Tối ưu hóa Kết xuất Đồ họa (GPU Draw Calls và InstancedMesh)**

Khi chuyển sang hiển thị không gian cửa hàng thẻ bài (Shop Floor), thách thức hiệu năng thay đổi từ băng thông mạng sang khả năng tính toán của GPU. Mọi đối tượng 3D, từ kệ gỗ, máy tính tiền, đến từng hộp thẻ bài đặt trên kệ, đều yêu cầu một "Draw Call" – lệnh từ CPU gửi đến GPU để vẽ vật thể đó.59 Nếu cửa hàng của người chơi trưng bày 5,000 thẻ bài và mỗi thẻ là một vật thể độc lập, sẽ có 5,000 Draw Calls được tạo ra mỗi khung hình. Điều này vượt quá giới hạn kiến trúc của WebGL và sẽ khiến tốc độ khung hình tụt xuống mức một chữ số.61

Kỹ thuật lập trình giải quyết vấn đề này được gọi là **Instancing** (Khởi tạo bản sao), cụ thể trong Three.js/R3F là sử dụng lớp InstancedMesh.59

Quy trình hoạt động của InstancedMesh:

1. **Định nghĩa Cốt lõi:** Hệ thống nạp một dạng hình học duy nhất (Geometry của tấm thẻ) và một vật liệu duy nhất (Material).  
2. **Khởi tạo Ma trận:** Thay vì gửi 5,000 lệnh vẽ, CPU biên dịch một ma trận dữ liệu mảng lớn (InstancedBufferAttribute), trong đó chứa thông tin về Vị trí (Position), Góc xoay (Rotation) và Tỷ lệ (Scale) của toàn bộ 5,000 tấm thẻ.  
3. **Kết xuất Đơn lẻ:** Toàn bộ dữ liệu được đẩy đến GPU trong đúng **1 Lệnh Draw Call duy nhất**. Lập trình viên Shader (Vertex Shader) sẽ sử dụng ID của từng bản sao để lấy tọa độ và áp dụng các mảng ảnh (Texture Arrays) tương ứng lên bề mặt thẻ.59

Bằng việc triển khai InstancedMesh, trình duyệt hoàn toàn có khả năng kết xuất một đại siêu thị chứa hàng chục nghìn thẻ bài ở tốc độ ổn định 60-120 FPS.60 Để tối ưu hơn nữa, hệ thống Mức độ Chi tiết (**Level of Detail \- LOD**) phải được áp dụng: các kệ thẻ bài nằm cách xa camera sẽ được thay thế bằng hình hộp đơn giản với kết cấu ảnh độ phân giải thấp (Mipmaps), giảm tải gánh nặng tính toán điểm ảnh (Pixel Shaders) cho GPU.65

## **Phân tích và Thiết kế Cơ chế Trò chơi (Game Mechanics)**

Một trò chơi mô phỏng xuất sắc không chỉ nằm ở đồ họa mà còn ở sự cân bằng và nhịp độ của hệ thống kinh tế mô phỏng. Sự thành công của "TCG Card Shop Simulator" xuất phát từ việc tạo ra một vòng lặp quản lý vi mô (micro-management) đan xen với các khoảnh khắc hưng phấn dựa trên yếu tố ngẫu nhiên (RNG/Gacha).

### **Vòng lặp Gameplay Kinh tế Cốt lõi (Core Economic Loop)**

Mạch máu của trò chơi dựa trên bốn giai đoạn liên kết tuần hoàn: Mua sắm (Procurement) \-\> Trưng bày (Merchandising) \-\> Bán lẻ (Commerce) \-\> Tái đầu tư (Expansion).68 Bắt đầu trong một căn phòng trống với ngân sách hạn hẹp, người chơi phải lựa chọn mặt hàng để kinh doanh. Logic cung \- cầu yêu cầu người chơi liên tục mở khóa các loại giấy phép kinh doanh (Licenses) mới bằng điểm kinh nghiệm (XP) và tiền tệ để đa dạng hóa mặt hàng, thu hút khách hàng có mức chi tiêu cao hơn.68

**Chiến lược Định giá và Lợi nhuận:** Phân tích dữ liệu từ các chuỗi mô phỏng cho thấy thuật toán khách hàng của trò chơi phản ứng cực kỳ nhạy cảm với mức giá. Nếu giá được đặt bằng với Giá Thị trường (Market Price), xác suất khách hàng mua vật phẩm gần như đạt mức tối đa. Tuy nhiên, để tối ưu hóa biên độ lợi nhuận mà không làm giảm đáng kể tần suất mua hàng, công thức **"Giá Thị trường \+ Biên độ 10% (Markup) và Làm tròn (Rounding)"** là chiến lược ưu việt nhất.72 Việc tăng giá lên 20% hoặc 30% sẽ tăng doanh thu trên mỗi đơn hàng nhưng làm giảm mạnh tốc độ thanh khoản, khiến hàng tồn kho đọng vốn và khách hàng thường xuyên bỏ đi.68

Bên cạnh việc bán hộp nguyên seal (Sealed products), việc xé vỏ hộp để bán thẻ bài lẻ (Singles) mang lại hiệu suất kinh tế khác biệt. Các bàn trưng bày thẻ bài (Card Tables) cung cấp nguồn thu nhập thụ động khổng lồ, do biên lợi nhuận của thẻ lẻ có thể đạt hàng ngàn phần trăm so với chi phí mua gói thẻ ban đầu.74

### **Động lực học Khách hàng (Customer Dynamics) và Chướng ngại vật**

Trong một webgame mô phỏng, dòng chảy khách hàng không sinh ra vô hạn. Trò chơi áp dụng hệ thống "Khe Khách hàng" (Customer Slots). Tại bất kỳ thời điểm nào, số lượng khách hàng tối đa có mặt trong cửa hàng bị giới hạn bởi công thức tỷ lệ thuận với Cấp độ Cửa hàng (Shop Level) và số lần mở rộng diện tích.68

Sự chậm trễ ở quầy thu ngân (do người chơi quét mã vạch chậm hoặc trả nhầm tiền thối) sẽ dẫn đến việc các khe khách hàng bị lấp đầy, ngăn chặn khách hàng mới bước vào, dẫn đến đình trệ kinh doanh.

Để phá vỡ sự tĩnh lặng của vòng lặp, trò chơi đưa ra một cơ chế quản lý khủng hoảng được gọi là **"Stink Mechanics" (Cơ chế Mùi hôi)**. Ở một xác suất nhất định phụ thuộc vào thời gian trong ngày, các khách hàng mang trạng thái "bốc mùi" sẽ xuất hiện. Các thực thể này phát ra vùng ảnh hưởng bán kính (AoE \- Area of Effect) làm giảm chỉ số hài lòng của khách hàng thông thường xung quanh, thậm chí kích hoạt hành vi hủy bỏ mua sắm và rời khỏi cửa hàng ngay lập tức.68 Để giải quyết bài toán này, người chơi phải đối mặt với lựa chọn đầu tư: tự tay xịt khử mùi cho từng cá nhân (tốn thời gian) hoặc đầu tư một khoản vốn lớn vào Máy xịt khử mùi tự động (Auto-scent machines) đặt tại các nút giao thông hẹp như cửa ra vào.68 Điều này buộc người chơi phải liên tục tối ưu hóa bố cục sàn (Floor Plan) để định tuyến hướng di chuyển của khách hàng một cách khoa học.

### **Tự động hóa và Nguồn nhân lực (Automation & Employees)**

Khi quy mô mở rộng, hệ thống buộc người chơi phải chuyển giao quyền lực bằng cách thuê Nhân viên (Employees). AI của nhân viên được chia thành hai máy trạng thái hữu hạn (Finite State Machines) cơ bản:

1. **Nhân viên Thu ngân (Cashier):** Ưu tiên nâng cấp chỉ số tốc độ (Speed). Thu ngân hoạt động như một hệ thống "giải phóng khe khách hàng", đảm bảo luồng lưu thông không bị tắc nghẽn. Theo các phân tích tối ưu, thu ngân không bao giờ nên được giao các nhiệm vụ phụ để tránh việc họ rời bỏ quầy thanh toán khi dòng khách hàng đang cao điểm.68  
2. **Nhân viên Xếp hàng (Restocker):** Lấy hàng từ kho (Storage) và lấp đầy các kệ trống dựa trên nhãn sản phẩm (Labels). Trong mã nguồn mô phỏng, một lỗ hổng cơ chế thường được tận dụng (The 8:00 AM Trick): nhân viên có thể tiến hành sắp xếp kho bãi vào lúc 8 giờ sáng, ngay cả khi người chơi chưa lật biển hiệu mở cửa (Open Sign). Bằng cách trì hoãn việc mở cửa hàng, người chơi cung cấp đủ thời gian (Time Delta) để AI của nhân viên quét toàn bộ cửa hàng và lấp đầy các khoảng trống, loại bỏ tình trạng khan hiếm cục bộ.68

## **Toán học đằng sau Cơ chế Gacha (Thuật toán Mở gói Thẻ)**

Trái tim của bất kỳ trò chơi mô phỏng TCG nào là trải nghiệm mở các gói thẻ (Pack Opening). Hệ thống này không chỉ tạo ra sự đa dạng cho kho thẻ lẻ mà còn tác động mạnh mẽ đến hệ thống trao thưởng dopamin của người chơi. Tỷ lệ rơi (Drop Rates) và thuật toán phân phối là yếu tố quyết định sự cân bằng của nền kinh tế trong trò chơi.

### **Phân phối Độ hiếm (Rarity Distribution)**

Trong hệ sinh thái Pokémon TCG thực tế, tỷ lệ xuất hiện của các thẻ bài được kiểm soát nghiêm ngặt. Việc mô phỏng webgame cần ánh xạ lại biểu đồ xác suất này để tạo cảm giác chân thực. Dữ liệu bóc tách từ các bộ mở rộng thực tế cho thấy cơ sở phân phối xác suất như sau:

| Cấp độ Độ hiếm (Rarity Tier) | Xác suất Kỳ vọng (Pull Rate) | Tần suất xuất hiện ước tính |
| :---- | :---- | :---- |
| **Common / Uncommon** | \~62.5% | Xuất hiện trong mọi gói thẻ |
| **Rare** | 18.8% | Khoảng 1 thẻ trong mỗi 5 gói |
| **Double / Ultra Rare** | \~8.5% \- 20.9% | Khoảng 1 thẻ trong mỗi 5 đến 12 gói |
| **Illustration Rare** | 11.20% | Khoảng 1 thẻ trong mỗi 9 gói |
| **Special Illustration Rare** | 1.23% | Khoảng 1 thẻ trong mỗi 81 gói |
| **Mega Hyper Rare / Ghost** | 0.06% | Khoảng 1 thẻ trong mỗi 1,786 gói |
| Bảng 1: Phân phối độ hiếm thẻ bài tiêu chuẩn (dữ liệu dựa trên khoảng tin cậy 95% của các set thực tế).79 |  |  |

Xác suất trong cơ chế này là **Xác suất Độc lập (Independent Probabilities)**. Khác với các cơ chế Gacha có "Pity System" (hệ thống tự động tăng tỷ lệ rơi thẻ hiếm nếu người chơi mở nhiều gói thất bại), hệ thống TCG mô phỏng tỷ lệ thực tế. Một tấm thẻ có tỷ lệ 1% sẽ luôn giữ mức 1% ở lần mở thứ 100 hay 1,000.81 Sự phân chia ngẫu nhiên độc lập này duy trì tính khan hiếm của các thẻ bài cấp "Ghost", đẩy giá trị thị trường của chúng lên mức trần, tạo động lực liên tục để người chơi mua hộp thẻ bài mới.74

### **Thuật toán Lựa chọn Ngẫu nhiên Có Trọng số (Weighted Random Selection)**

Việc viết mã thuật toán mở gói thẻ trong JavaScript đòi hỏi tính toán tối ưu, vì việc sử dụng một mảng phẳng (flat array) chứa 10,000 thẻ Common và 1 thẻ Hyper Rare sẽ tiêu tốn bộ nhớ khủng khiếp.82 Thay vào đó, thuật toán **Lựa chọn Ngẫu nhiên Có Trọng số (Weighted Random Algorithm)** được áp dụng.

Logic lập trình được triển khai qua các bước:

1. **Gán Trọng số:** Mỗi hạng mục độ hiếm (hoặc từng thẻ cụ thể) được gán một con số nguyên đại diện cho trọng lượng (Weight). Ví dụ: Common \= 100, Rare \= 20, Ultra Rare \= 5, Ghost \= 1\.  
2. **Tính Tổng:** Thuật toán tính tổng tất cả các trọng số trong cơ sở dữ liệu thẻ bài. Ở ví dụ trên là 126\.  
3. **Tạo Số Ngẫu nhiên:** Sử dụng Math.random() nhân với tổng trọng số (126) để tạo ra một điểm rơi mục tiêu (Target Point).  
4. **Duyệt và Trừ Tuyến tính:** Thuật toán duyệt qua mảng thẻ bài. Tại mỗi phần tử, nó lấy điểm rơi mục tiêu trừ đi trọng số của phần tử đó. Khi giá trị điểm rơi nhỏ hơn hoặc bằng 0, phần tử hiện tại chính là thẻ bài trúng thưởng.83

Việc phân cấp thuật toán theo hai tầng—đầu tiên chọn ngẫu nhiên phân khúc độ hiếm (Ví dụ: Trúng Ultra Rare), sau đó tiếp tục chọn ngẫu nhiên đồng đều (Uniform Random) một thẻ bài cụ thể nằm trong nhóm Ultra Rare—giúp tối ưu hóa độ phức tạp thuật toán thời gian ![][image1] của vòng lặp, cho phép người chơi xé hàng nghìn gói thẻ trong thời gian thực mà trình duyệt không bị treo.83

## **Rào cản Pháp lý: Quyền Sở hữu Trí tuệ và Tính rủi ro của Fan-game**

Mặc dù kiến trúc kỹ thuật và cơ chế nền kinh tế của webgame có thể được lập trình một cách hoàn chỉnh, rào cản lớn nhất và cũng là rủi ro chí tử của dự án nằm ở tiền đề ban đầu: **Sử dụng tệp ảnh thẻ bài Pokémon**. Phân tích sâu sắc về luật bản quyền quốc tế và thực tiễn xử lý vi phạm của Nintendo cho thấy việc triển khai dự án này dưới hình hài của Pokémon là một hành động mang tính tự sát về mặt pháp lý.87

### **Bản chất của Bản quyền và Thương hiệu Pokémon**

The Pokémon Company International (TPCi) và Nintendo (đơn vị nắm giữ cổ phần) sở hữu một trong những thương hiệu truyền thông sinh lời nhất mọi thời đại. Mọi yếu tố liên quan đến Pokémon—bao gồm tên gọi, thiết kế sinh vật, đồ họa thẻ bài, bố cục mặt sau thẻ, âm thanh, và cả hệ thống biểu tượng (logos)—đều là các tài sản Sở hữu Trí tuệ (Intellectual Property \- IP) được đăng ký bảo hộ toàn cầu.89

Các điều khoản pháp lý của TPCi quy định rõ ràng rằng, bất kỳ hành vi phân phối tác phẩm phái sinh (derivative works) nào sử dụng hình ảnh, nghệ thuật hoặc nhãn hiệu của Pokémon, dưới bất kỳ phương tiện lưu trữ nào hiện tại hay tương lai, đều không được phép nếu chưa có thỏa thuận cấp phép bằng văn bản.90 Ngay cả đối với các tác phẩm "Fan Art" (nghệ thuật do người hâm mộ sáng tác), TPCi tuyên bố có quyền sở hữu vô điều kiện và cảnh báo người hâm mộ không được sử dụng IP của họ vượt quá giới hạn "sử dụng cá nhân, phi thương mại tại nhà".89

### **Phá vỡ Lầm tưởng "Phi Thương mại" (The Non-Commercial Myth)**

Tồn tại một nhận thức sai lầm vô cùng phổ biến trong cộng đồng phát triển game độc lập: *"Nếu trò chơi được phát hành miễn phí (Free-to-play) và không chứa quảng cáo hay thu tiền, nó sẽ được bảo vệ bởi học thuyết Sử dụng Hợp lý (Fair Use)"*.88

Theo khía cạnh pháp lý, đặc biệt là theo Đạo luật Bản quyền Thiên niên kỷ Kỹ thuật số (DMCA), việc kiếm tiền hay không chỉ quyết định đến mức độ bồi thường thiệt hại, chứ không thay đổi bản chất của hành vi vi phạm bản quyền (Copyright Infringement).91 Luật bản quyền trao cho chủ sở hữu đặc quyền kiểm soát cách thức và thời điểm các sản phẩm phái sinh được ra mắt.87 Một webgame mô phỏng sử dụng kho ảnh Pokémon miễn phí có thể gây ra "thiệt hại thị trường" (Market Impact) bằng cách thu hút sự chú ý của cộng đồng khỏi các sản phẩm kỹ thuật số chính thống của TPCi (chẳng hạn như *Pokémon TCG Live* hoặc *Pokémon TCG Pocket*), từ đó triệt tiêu quyền áp dụng cơ chế Fair Use.92

Sự tàn nhẫn trong chiến dịch bảo vệ bản quyền của Nintendo được ghi nhận qua lịch sử tàn sát các dự án fan-game, bất kể chất lượng hay tình cảm cộng đồng:

* **Pokémon Uranium:** Một dự án RPG fan-made cực kỳ nổi tiếng, bị gỡ bỏ ngay lập tức sau 9 năm phát triển.87  
* **AM2R (Another Metroid 2 Remake):** Bị phát lệnh ngừng hoạt động (Cease and Desist) ngay sau khi nhận được sự ca ngợi của giới phê bình.87  
* **Pokémon Prism & Relic Castle:** Các bản mod và diễn đàn lưu trữ fan-game liên tục bị quét DMCA và đóng cửa vĩnh viễn.93

Gần đây nhất, trong trường hợp của trò chơi *Pokémon TCG Pocket*, khi phát hiện một thẻ bài chính thức có chi tiết nghệ thuật vô tình sao chép từ một bức tranh fan-art (vụ việc thẻ Ho-Oh EX), TPCi đã lập tức thu hồi thẻ bài đó trước giờ ra mắt toàn cầu và thay thế bằng màn hình đen với dòng chữ "New Art Coming Soon" để điều tra toàn diện.94 Sự nhạy cảm cao độ này chứng minh rằng, không có bất kỳ kẽ hở nào cho việc sao chép hình ảnh trái phép được tồn tại trong hệ sinh thái của Pokémon.

### **Khía cạnh Pháp lý tại Việt Nam và Tính Không biên giới của Internet**

Mặc dù có những lập luận cho rằng các quốc gia nằm ngoài khu vực tài phán trực tiếp của Hoa Kỳ hoặc Nhật Bản (như Trung Quốc hay Nga) có hệ thống thực thi bản quyền lỏng lẻo hơn 91, môi trường pháp lý tại Việt Nam lại không cung cấp một "nơi trú ẩn an toàn" (safe harbor) cho hành vi vi phạm IP.

Việt Nam là thành viên của Tổ chức Sở hữu Trí tuệ Thế giới (WIPO), Hiệp định TRIPS và Hệ thống Madrid.96 Khi Việt Nam ngày càng hội nhập sâu rộng vào nền kinh tế số, khung pháp lý về bảo vệ quyền sở hữu trí tuệ đã được thắt chặt. Việc sử dụng, phân phối hình ảnh có bản quyền trên internet, dù máy chủ được đặt ở đâu, đều có thể bị xử lý. Hơn nữa, việc tải mã nguồn lên các nền tảng mở như GitHub hoặc các máy chủ cung cấp dịch vụ web toàn cầu (Vercel, AWS) sẽ tự động đặt dự án dưới sự điều chỉnh của DMCA, cho phép đội ngũ pháp lý của Nintendo dễ dàng xóa sổ webgame chỉ bằng một email thông báo.91 Hình phạt cho việc xâm phạm bản quyền thương mại tại các tòa án quốc tế có thể lên tới $150,000 USD cho mỗi vi phạm.99

## **Kết luận: Tính Khả thi và Chiến lược Chuyển hướng (Mitigation Strategy)**

Dựa trên toàn bộ phân tích về công nghệ, thiết kế hệ thống và đánh giá rủi ro, dự án xây dựng một webgame theo phong cách "TCG Card Shop Simulator" đối mặt với các kết luận cụ thể sau:

1. **Về mặt Kiến trúc Phần mềm (Hoàn toàn Khả thi):**  
   Công nghệ web hiện đại đã đủ trưởng thành để gánh vác các dự án mô phỏng khổng lồ. Sự kết hợp giữa **Next.js**, **Supabase** (cho cơ sở dữ liệu và multiplayer), **Zustand** (để quản lý trạng thái hiệu suất cao) và **React Three Fiber / Three.js** (để kết xuất không gian 3D) cung cấp một khung sườn mạnh mẽ không thua kém các công cụ truyền thống như Unity hay Unreal Engine. Việc áp dụng mô hình Entity-Component-System (ECS) sẽ giải quyết triệt để vấn đề sụt giảm khung hình khi mô phỏng số lượng lớn khách hàng và AI trong vòng lặp trò chơi.  
2. **Về mặt Quản lý Tài nguyên (Khả thi với Tối ưu hóa):**  
   Thư viện hàng nghìn tệp hình ảnh không thể được tải trực tiếp. Phải bắt buộc triển khai đường ống nén hình ảnh (chuyển đổi sang WebP/AVIF), phân phối qua Mạng Phân phối Nội dung (CDN), sử dụng kỹ thuật Tải lười (Lazy Loading) trên giao diện 2D, và ứng dụng InstancedMesh cùng Texture Mipmapping để giảm thiểu các lệnh gọi đồ họa (Draw Calls) trên GPU xuống mức tối thiểu, đảm bảo trải nghiệm mượt mà trên trình duyệt.  
3. **Về mặt Thiết kế Cơ chế (Công thức Đã được Chứng minh):**  
   Các thuật toán vòng lặp kinh tế của cửa hàng và thuật toán "Gacha" lựa chọn ngẫu nhiên có trọng số để xé gói thẻ bài có thể dễ dàng mô phỏng bằng toán học JavaScript. Sự pha trộn giữa lập kế hoạch cửa hàng vi mô (micro-management) và cờ bạc xác suất tạo ra giá trị giải trí cao.  
4. **Về mặt Pháp lý (Chí tử \- Yêu cầu Hủy bỏ IP Pokémon):**  
   Việc sử dụng hình ảnh thẻ bài Pokémon, tên gọi, hoặc biểu tượng cho webgame này là **vi phạm pháp luật nghiêm trọng** và sẽ dẫn đến việc dự án bị tiêu diệt bằng lệnh DMCA (Takedown). Không có vùng xám pháp lý nào bảo vệ các trò chơi fan-made, dù là phi thương mại hay với mục đích học tập.

**Khuyến nghị Hành động:** Để dự án tồn tại và có cơ hội phát triển rực rỡ, nhà phát triển **phải từ bỏ việc sử dụng kho ảnh Pokémon**. Luật bản quyền bảo vệ hình ảnh nghệ thuật và thương hiệu, nhưng **không bảo vệ các quy tắc, cơ chế trò chơi hay thuật toán hệ thống**.88

Nhóm phát triển nên giữ lại toàn bộ kiến trúc lập trình kỹ thuật ưu việt, cơ chế kinh tế, thuật toán gacha đã thiết kế, nhưng hoán đổi toàn bộ lớp đồ họa bên ngoài. Hãy sáng tạo ra một Thương hiệu Thẻ bài Gốc (Original IP) bằng cách tự vẽ, hợp tác với họa sĩ minh họa, hoặc sử dụng sự trợ giúp của Trí tuệ Nhân tạo (AI Generative Tools) để tạo ra các thẻ quái thú giả tưởng của riêng mình (tương tự như cách các trò chơi như "Tetramon" trong TCG Simulator hoặc "Palworld" đã áp dụng).100 Bằng cách loại bỏ rủi ro pháp lý, dự án không chỉ an toàn tồn tại trên không gian mạng mà còn mở ra cánh cửa tiến tới khả năng thương mại hóa, cho phép gọi vốn và phát hành chính thức trong tương lai.

#### **Works cited**

1. TCG Card Shop Simulator | The Bonus World, accessed April 10, 2026, [https://thebonusworld.net/tag/tcg-card-shop-simulator/](https://thebonusworld.net/tag/tcg-card-shop-simulator/)  
2. I Played 2025's Tycoons So You Don't Waste Your Time \- YouTube, accessed April 10, 2026, [https://www.youtube.com/watch?v=7BxNn7gmtMc](https://www.youtube.com/watch?v=7BxNn7gmtMc)  
3. Best Tycoon Games: Top 11 Titles for Building Better Business in 2025 \- Eneba, accessed April 10, 2026, [https://www.eneba.com/hub/games/best-tycoon-games/](https://www.eneba.com/hub/games/best-tycoon-games/)  
4. Best JavaScript and HTML5 game engines (updated for 2025\) \- LogRocket Blog, accessed April 10, 2026, [https://blog.logrocket.com/best-javascript-html5-game-engines-2025/](https://blog.logrocket.com/best-javascript-html5-game-engines-2025/)  
5. Top Frameworks for Game Developers \- freeCodeCamp, accessed April 10, 2026, [https://www.freecodecamp.org/news/top-frameworks-for-game-developers/](https://www.freecodecamp.org/news/top-frameworks-for-game-developers/)  
6. Phaser \- A fast, fun and free open source HTML5 game framework | Phaser, accessed April 10, 2026, [https://phaser.io/](https://phaser.io/)  
7. What is the difference between Phaser.js and Three.js? \- Lemon.io, accessed April 10, 2026, [https://lemon.io/answers/phaser-js/what-is-the-difference-between-phaser-js-and-three-js/](https://lemon.io/answers/phaser-js/what-is-the-difference-between-phaser-js-and-three-js/)  
8. Phaser.js vs Three.js \- Cortance, accessed April 10, 2026, [https://cortance.com/answers/three-js/phaser-js-vs-three-js](https://cortance.com/answers/three-js/phaser-js-vs-three-js)  
9. Three js vs React Three Fiber \- YouTube, accessed April 10, 2026, [https://www.youtube.com/shorts/eUtOSB5m6Fo](https://www.youtube.com/shorts/eUtOSB5m6Fo)  
10. Why I Prefer React Three Fiber Over Vanilla Three.js | by Harry Hao \- Medium, accessed April 10, 2026, [https://medium.com/@koler778/why-i-prefer-react-three-fiber-over-vanilla-three-js-28025cb324ff](https://medium.com/@koler778/why-i-prefer-react-three-fiber-over-vanilla-three-js-28025cb324ff)  
11. Loading Models \- React Three Fiber \- Poimandres, accessed April 10, 2026, [https://r3f.docs.pmnd.rs/tutorials/loading-models](https://r3f.docs.pmnd.rs/tutorials/loading-models)  
12. Performance pitfalls \- React Three Fiber, accessed April 10, 2026, [https://r3f.docs.pmnd.rs/advanced/pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)  
13. Should I learn Three.js first or jump straight into React Three Fiber? \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/threejs/comments/1lvqj9a/should\_i\_learn\_threejs\_first\_or\_jump\_straight/](https://www.reddit.com/r/threejs/comments/1lvqj9a/should_i_learn_threejs_first_or_jump_straight/)  
14. Web Game Engines Comparison (2026) \- Cinevva, accessed April 10, 2026, [https://app.cinevva.com/guides/web-game-engines-comparison.html](https://app.cinevva.com/guides/web-game-engines-comparison.html)  
15. The Best Game Engines to Use in 2025: A Comprehensive Evaluation | by Afonsofaro, accessed April 10, 2026, [https://medium.com/@afonsofaro7/the-best-game-engines-to-use-in-2025-a-comprehensive-evaluation-c39cf8ff69c5](https://medium.com/@afonsofaro7/the-best-game-engines-to-use-in-2025-a-comprehensive-evaluation-c39cf8ff69c5)  
16. Best engine for web-based "virtual experience" : r/gamedev \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/gamedev/comments/1jlwt43/best\_engine\_for\_webbased\_virtual\_experience/](https://www.reddit.com/r/gamedev/comments/1jlwt43/best_engine_for_webbased_virtual_experience/)  
17. Godot Engine \- Free and open source 2D and 3D game engine, accessed April 10, 2026, [https://godotengine.org/](https://godotengine.org/)  
18. I built a multiplayer web game with React & Three.js as no one's hired me for the past year., accessed April 10, 2026, [https://www.reddit.com/r/developersIndia/comments/1oeua90/i\_built\_a\_multiplayer\_web\_game\_with\_react\_threejs/](https://www.reddit.com/r/developersIndia/comments/1oeua90/i_built_a_multiplayer_web_game_with_react_threejs/)  
19. What is the difference between Phaser.js and Three.js? \- Cortance, accessed April 10, 2026, [https://cortance.com/answers/phaser-js/what-is-the-difference-between-phaser-js-and-three-js](https://cortance.com/answers/phaser-js/what-is-the-difference-between-phaser-js-and-three-js)  
20. Choosing a tech stack for my card game platform \- Dunsap.com \- DevBlog, accessed April 10, 2026, [https://devblog.dunsap.com/posts/2022/07-10---choosing-a-tech-stack-for-my-card-game-platform/](https://devblog.dunsap.com/posts/2022/07-10---choosing-a-tech-stack-for-my-card-game-platform/)  
21. Let's build a typing game with Next.js & Supabase \- YouTube, accessed April 10, 2026, [https://www.youtube.com/watch?v=gmjq2I7jpAU](https://www.youtube.com/watch?v=gmjq2I7jpAU)  
22. Exploring Supabase Realtime By Building a Game \- aleksandra.codes, accessed April 10, 2026, [https://www.aleksandra.codes/supabase-game](https://www.aleksandra.codes/supabase-game)  
23. How do I make an online TCG game, online? : r/tabletopgamedesign \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/tabletopgamedesign/comments/1qb0fyf/how\_do\_i\_make\_an\_online\_tcg\_game\_online/](https://www.reddit.com/r/tabletopgamedesign/comments/1qb0fyf/how_do_i_make_an_online_tcg_game_online/)  
24. How I Built a Multiplayer Guessing Game Using React, Supabase & Next.js \- Medium, accessed April 10, 2026, [https://medium.com/@yogeshrana2301/how-i-built-a-multiplayer-guessing-game-using-react-supabase-next-js-a39a94c7825a](https://medium.com/@yogeshrana2301/how-i-built-a-multiplayer-guessing-game-using-react-supabase-next-js-a39a94c7825a)  
25. Zustand in React Native: A Modern State Management Solution \- DEV Community, accessed April 10, 2026, [https://dev.to/ersuman/zustand-in-react-native-a-modern-state-management-solution-p6g](https://dev.to/ersuman/zustand-in-react-native-a-modern-state-management-solution-p6g)  
26. How to Optimize React Components When Handling Multiple Zustand States into one data \#2362 \- GitHub, accessed April 10, 2026, [https://github.com/pmndrs/zustand/discussions/2362](https://github.com/pmndrs/zustand/discussions/2362)  
27. Redux vs Zustand: Choosing the Right React State Manager | Syncfusion Blogs, accessed April 10, 2026, [https://www.syncfusion.com/blogs/post/redux-vs-zustand-react-state-management](https://www.syncfusion.com/blogs/post/redux-vs-zustand-react-state-management)  
28. Comparison \- Zustand, accessed April 10, 2026, [https://zustand.docs.pmnd.rs/learn/getting-started/comparison](https://zustand.docs.pmnd.rs/learn/getting-started/comparison)  
29. How to optimise zustand? : r/reactjs \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/reactjs/comments/1jzye4v/how\_to\_optimise\_zustand/](https://www.reddit.com/r/reactjs/comments/1jzye4v/how_to_optimise_zustand/)  
30. How to Implement Global State Management with Zustand in React \- OneUptime, accessed April 10, 2026, [https://oneuptime.com/blog/post/2026-01-15-react-zustand-global-state-management/view](https://oneuptime.com/blog/post/2026-01-15-react-zustand-global-state-management/view)  
31. Game Loop Fundamentals: A 2025 Guide for Developers \- Blog \- Meshy AI, accessed April 10, 2026, [https://www.meshy.ai/blog/game-loop](https://www.meshy.ai/blog/game-loop)  
32. Anatomy of a video game \- Game development \- MDN Web Docs, accessed April 10, 2026, [https://developer.mozilla.org/en-US/docs/Games/Anatomy](https://developer.mozilla.org/en-US/docs/Games/Anatomy)  
33. Game Loop · Sequencing Patterns, accessed April 10, 2026, [https://gameprogrammingpatterns.com/game-loop.html](https://gameprogrammingpatterns.com/game-loop.html)  
34. Advanced game loop design intro, accessed April 10, 2026, [https://stephendoddtech.com/blog/game-design/javascript-advanced-game-loop-design](https://stephendoddtech.com/blog/game-design/javascript-advanced-game-loop-design)  
35. How to implement a gameloop with requestAnimationFrame across multiple React Redux components? \- Stack Overflow, accessed April 10, 2026, [https://stackoverflow.com/questions/54066805/how-to-implement-a-gameloop-with-requestanimationframe-across-multiple-react-red](https://stackoverflow.com/questions/54066805/how-to-implement-a-gameloop-with-requestanimationframe-across-multiple-react-red)  
36. Writing a Run Loop in JavaScript & React | by Luke Millar | projector\_hq | Medium, accessed April 10, 2026, [https://medium.com/projector-hq/writing-a-run-loop-in-javascript-react-9605f74174b](https://medium.com/projector-hq/writing-a-run-loop-in-javascript-react-9605f74174b)  
37. A Detailed Explanation of JavaScript Game Loops and Timing | Isaac Sukin, accessed April 10, 2026, [https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing](https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing)  
38. Tips for Implementing ECS in JavaScript: Data-Oriented Design and Batch Processing?, accessed April 10, 2026, [https://www.reddit.com/r/learnjavascript/comments/1m9jwgb/tips\_for\_implementing\_ecs\_in\_javascript/](https://www.reddit.com/r/learnjavascript/comments/1m9jwgb/tips_for_implementing_ecs_in_javascript/)  
39. An Entity Component System in Javascript \- Kartones' Blog, accessed April 10, 2026, [https://blog.kartones.net/post/ecs-in-javascript/](https://blog.kartones.net/post/ecs-in-javascript/)  
40. TodoMVC implemented using a game architecture — ECS. | by Andy Bulka | Medium, accessed April 10, 2026, [https://medium.com/@abulka/todomvc-implemented-using-a-game-architecture-ecs-88bb86ea5e98](https://medium.com/@abulka/todomvc-implemented-using-a-game-architecture-ecs-88bb86ea5e98)  
41. Why build an ECS? Why TypeScript? \- Maxwell Forbes, accessed April 10, 2026, [https://maxwellforbes.com/posts/typescript-ecs-why/](https://maxwellforbes.com/posts/typescript-ecs-why/)  
42. Making a game in Javascript (pt. 6\) \- Entity Component System \- YouTube, accessed April 10, 2026, [https://www.youtube.com/watch?v=wHHjKopa14g](https://www.youtube.com/watch?v=wHHjKopa14g)  
43. Engine / tech stack choice for a large-scale simulation (?) game : r/gamedev \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/gamedev/comments/1pvbmqk/engine\_tech\_stack\_choice\_for\_a\_largescale/](https://www.reddit.com/r/gamedev/comments/1pvbmqk/engine_tech_stack_choice_for_a_largescale/)  
44. Key performance issues \- web.dev, accessed April 10, 2026, [https://web.dev/learn/images/performance-issues](https://web.dev/learn/images/performance-issues)  
45. What is a good way to load more than a million images for a collectible card game? \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/gamedev/comments/173jpt/what\_is\_a\_good\_way\_to\_load\_more\_than\_a\_million/](https://www.reddit.com/r/gamedev/comments/173jpt/what_is_a_good_way_to_load_more_than_a_million/)  
46. Optimizing Images For Web Performance: All You Need To Know \- DebugBear, accessed April 10, 2026, [https://www.debugbear.com/blog/image-optimization-web-performance](https://www.debugbear.com/blog/image-optimization-web-performance)  
47. How to optimize images for web and performance \- Grid Dynamics, accessed April 10, 2026, [https://www.griddynamics.com/blog/how-to-optimize-images-for-web-and-performance](https://www.griddynamics.com/blog/how-to-optimize-images-for-web-and-performance)  
48. Optimizing Images for Web Performance – Frontend Masters Blog, accessed April 10, 2026, [https://frontendmasters.com/blog/optimizing-images-for-web-performance/](https://frontendmasters.com/blog/optimizing-images-for-web-performance/)  
49. Batch WebP Converter \- Download and install on Windows | Microsoft Store, accessed April 10, 2026, [https://www.microsoft.com/en-as/p/batch-webp-converter/9njgc0hzs66c](https://www.microsoft.com/en-as/p/batch-webp-converter/9njgc0hzs66c)  
50. Integrating Three.js with React: A Comprehensive Performance Guide for Production‑Ready Web Experiences | by Alfino Hatta | Medium, accessed April 10, 2026, [https://medium.com/@alfinohatta/integrating-three-js-278774d45973](https://medium.com/@alfinohatta/integrating-three-js-278774d45973)  
51. Lazy loading \- Performance \- MDN Web Docs \- Mozilla, accessed April 10, 2026, [https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy\_loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)  
52. Optimole: Real-time Image Processing and Image CDN for WordPress, accessed April 10, 2026, [https://optimole.com/](https://optimole.com/)  
53. Image Optimization Mastery: WebP, Lazy Loading, and CDNs. | by Joe Peach | Medium, accessed April 10, 2026, [https://medium.com/@joepeach226/image-optimization-mastery-webp-lazy-loading-and-cdns-a53705db6cc3](https://medium.com/@joepeach226/image-optimization-mastery-webp-lazy-loading-and-cdns-a53705db6cc3)  
54. Top Metadata Editors for Managing Image and Video Data | Cloudinary, accessed April 10, 2026, [https://cloudinary.com/guides/digital-asset-management/metadata-editor](https://cloudinary.com/guides/digital-asset-management/metadata-editor)  
55. Best practices for optimizing the quality of your images | Adobe Experience Manager, accessed April 10, 2026, [https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/assets/dynamicmedia/best-practices-for-optimizing-the-quality-of-your-images](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/assets/dynamicmedia/best-practices-for-optimizing-the-quality-of-your-images)  
56. Browser-level image lazy loading for the web | Articles, accessed April 10, 2026, [https://web.dev/articles/browser-level-image-lazy-loading](https://web.dev/articles/browser-level-image-lazy-loading)  
57. Optimizing Website Performance: Harnessing the Power of Image Lazy Loading, accessed April 10, 2026, [https://www.catchpoint.com/blog/optimizing-website-performance-harnessing-the-power-of-image-lazy-loading](https://www.catchpoint.com/blog/optimizing-website-performance-harnessing-the-power-of-image-lazy-loading)  
58. What's the best way to load a large number of images for a user? : r/webdev \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/webdev/comments/1gesxvo/whats\_the\_best\_way\_to\_load\_a\_large\_number\_of/](https://www.reddit.com/r/webdev/comments/1gesxvo/whats_the_best_way_to_load_a_large_number_of/)  
59. Scaling performance \- React Three Fiber, accessed April 10, 2026, [https://r3f.docs.pmnd.rs/advanced/scaling-performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)  
60. Three.js InstancedMesh Performance Optimizations \- VR Me Up, accessed April 10, 2026, [https://vrmeup.com/devlog/devlog\_10\_threejs\_instancedmesh\_performance\_optimizations.html](https://vrmeup.com/devlog/devlog_10_threejs_instancedmesh_performance_optimizations.html)  
61. Rendering thousands of objects results in low FPS but also low GPU usage \- three.js forum, accessed April 10, 2026, [https://discourse.threejs.org/t/rendering-thousands-of-objects-results-in-low-fps-but-also-low-gpu-usage/40142](https://discourse.threejs.org/t/rendering-thousands-of-objects-results-in-low-fps-but-also-low-gpu-usage/40142)  
62. 100 Three.js Tips That Actually Improve Performance (2026) \- Utsubo, accessed April 10, 2026, [https://www.utsubo.com/blog/threejs-best-practices-100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)  
63. Rendering enormous amount of images for NFT game \- Questions \- three.js forum, accessed April 10, 2026, [https://discourse.threejs.org/t/rendering-enormous-amount-of-images-for-nft-game/61470](https://discourse.threejs.org/t/rendering-enormous-amount-of-images-for-nft-game/61470)  
64. How to Use Sprites in InstancedMesh with Three.js and React Three Fiber in React?, accessed April 10, 2026, [https://stackoverflow.com/questions/76925695/how-to-use-sprites-in-instancedmesh-with-three-js-and-react-three-fiber-in-react](https://stackoverflow.com/questions/76925695/how-to-use-sprites-in-instancedmesh-with-three-js-and-react-three-fiber-in-react)  
65. Lazy loading parts of a large scene \- Questions \- three.js forum, accessed April 10, 2026, [https://discourse.threejs.org/t/lazy-loading-parts-of-a-large-scene/31831](https://discourse.threejs.org/t/lazy-loading-parts-of-a-large-scene/31831)  
66. Load textures progressively \- Questions \- three.js forum, accessed April 10, 2026, [https://discourse.threejs.org/t/load-textures-progressively/16922](https://discourse.threejs.org/t/load-textures-progressively/16922)  
67. Art optimization tips for mobile game developers part 1 \- Unity, accessed April 10, 2026, [https://unity.com/how-to/mobile-game-optimization-tips-part-1](https://unity.com/how-to/mobile-game-optimization-tips-part-1)  
68. TCG Card Shop Simulator – The Kinda Complete Guide (Updated to v0.66.8) \- Amiibo Doctor, accessed April 10, 2026, [https://amiibodoctor.com/2025/05/27/tcg-card-shop-simulator-the-kinda-complete-guide-as-of-v0-52/](https://amiibodoctor.com/2025/05/27/tcg-card-shop-simulator-the-kinda-complete-guide-as-of-v0-52/)  
69. TCG Card Shop Simulator | 2024 Guide for Complete Beginners | Episode 13 \- YouTube, accessed April 10, 2026, [https://www.youtube.com/watch?v=5ToIZoGEXTU](https://www.youtube.com/watch?v=5ToIZoGEXTU)  
70. TCG Card Shop Simulator | 2024 Guide for Complete Beginners | Episode 1 | Day 1 & 2, accessed April 10, 2026, [https://www.youtube.com/watch?v=YiiyNA-iIXQ](https://www.youtube.com/watch?v=YiiyNA-iIXQ)  
71. Guide :: Everything Customers (Update 0.61.5) \- Steam Community, accessed April 10, 2026, [https://steamcommunity.com/sharedfiles/filedetails/?id=3338043205](https://steamcommunity.com/sharedfiles/filedetails/?id=3338043205)  
72. Pricing Tip: Market Price, \+10%, Round : r/TCGCardShopSimulator \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/TCGCardShopSimulator/comments/1g0ahzh/pricing\_tip\_market\_price\_10\_round/](https://www.reddit.com/r/TCGCardShopSimulator/comments/1g0ahzh/pricing_tip_market_price_10_round/)  
73. What's your preferred markup? : r/TCGCardShopSimulator \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/TCGCardShopSimulator/comments/1rhdvg5/whats\_your\_preferred\_markup/](https://www.reddit.com/r/TCGCardShopSimulator/comments/1rhdvg5/whats_your_preferred_markup/)  
74. lets talk strategy \- TCG Card Shop Sim, PC Version : r/TCGCardTycoon \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/TCGCardTycoon/comments/1geyxk9/lets\_talk\_strategy\_tcg\_card\_shop\_sim\_pc\_version/](https://www.reddit.com/r/TCGCardTycoon/comments/1geyxk9/lets_talk_strategy_tcg_card_shop_sim_pc_version/)  
75. Card Shop Management Breakdown Guide \- Steam Community, accessed April 10, 2026, [https://steamcommunity.com/sharedfiles/filedetails/?id=3352858486](https://steamcommunity.com/sharedfiles/filedetails/?id=3352858486)  
76. TCG card shop simulator : r/TCGCardTycoon \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/TCGCardTycoon/comments/1fsexlb/tcg\_card\_shop\_simulator/](https://www.reddit.com/r/TCGCardTycoon/comments/1fsexlb/tcg_card_shop_simulator/)  
77. The Smelly Customer Mechanic Adds Nothing But Frustration :: TCG Card Shop Simulator General Discussions \- Steam Community, accessed April 10, 2026, [https://steamcommunity.com/app/3070070/discussions/0/4846527362886596365/](https://steamcommunity.com/app/3070070/discussions/0/4846527362886596365/)  
78. Please get rid of the stink/scent mechanic :: TCG Card Shop Simulator General Discussions, accessed April 10, 2026, [https://steamcommunity.com/app/3070070/discussions/0/4849904427680018383/?ctp=3](https://steamcommunity.com/app/3070070/discussions/0/4849904427680018383/?ctp=3)  
79. Pokémon TCG: Perfect Order Pull Rates \- TCGplayer, accessed April 10, 2026, [https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Perfect-Order-Pull-Rates/73148119-ebcb-40b7-84b6-52b3a6d0c631/](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Perfect-Order-Pull-Rates/73148119-ebcb-40b7-84b6-52b3a6d0c631/)  
80. Pokémon TCG Live Card Drop Rate Information \- Pokemon TCG, accessed April 10, 2026, [https://tcg.pokemon.com/en-us/tcgl/droprate/](https://tcg.pokemon.com/en-us/tcgl/droprate/)  
81. The Science of Gacha: Understanding Drop Rates and Fairness \- Loot Box Probability Mechanics, accessed April 10, 2026, [https://loot-box-probability-mechanics.pages.dev/blog/the-science-of-gacha-understanding-drop-rates-and-fairness](https://loot-box-probability-mechanics.pages.dev/blog/the-science-of-gacha-understanding-drop-rates-and-fairness)  
82. Randomizing Weighted Choices in Javascript \- Blobfolio, accessed April 10, 2026, [https://blobfolio.com/2019/randomizing-weighted-choices-in-javascript/](https://blobfolio.com/2019/randomizing-weighted-choices-in-javascript/)  
83. How to choose a weighted random array element in Javascript? \- Stack Overflow, accessed April 10, 2026, [https://stackoverflow.com/questions/43566019/how-to-choose-a-weighted-random-array-element-in-javascript](https://stackoverflow.com/questions/43566019/how-to-choose-a-weighted-random-array-element-in-javascript)  
84. How to: Weighted Random Selections \- LootLocker, The Game Publishing Platform, accessed April 10, 2026, [https://lootlocker.com/blog/random-with-weights](https://lootlocker.com/blog/random-with-weights)  
85. Inserting probabilities in a card game \- javascript \- Stack Overflow, accessed April 10, 2026, [https://stackoverflow.com/questions/60994841/inserting-probabilities-in-a-card-game](https://stackoverflow.com/questions/60994841/inserting-probabilities-in-a-card-game)  
86. BlackJack Application with JavaScript | by Ethan Jarrell | HackerNoon.com \- Medium, accessed April 10, 2026, [https://medium.com/hackernoon/blackjack-application-with-javascript-2c76db51dea7](https://medium.com/hackernoon/blackjack-application-with-javascript-2c76db51dea7)  
87. Fan Games and Legal Risks: What Developers Should Know \- Odin Law and Media, accessed April 10, 2026, [https://odinlaw.com/blog-fan-games-legal-risks/](https://odinlaw.com/blog-fan-games-legal-risks/)  
88. What are the rules/laws regarding making a "fanfic" game based off an existing property?, accessed April 10, 2026, [https://www.reddit.com/r/gamedesign/comments/14gacu9/what\_are\_the\_ruleslaws\_regarding\_making\_a\_fanfic/](https://www.reddit.com/r/gamedesign/comments/14gacu9/what_are_the_ruleslaws_regarding_making_a_fanfic/)  
89. Legal Information \- Pokemon.com, accessed April 10, 2026, [https://www.pokemon.com/us/legal/information](https://www.pokemon.com/us/legal/information)  
90. Media Usage Guidelines \- The Pokémon Company International Official Press Site, accessed April 10, 2026, [https://pokemon.gamespress.com/Media-Usage-Guidelines](https://pokemon.gamespress.com/Media-Usage-Guidelines)  
91. Read this Before Making ANY "Fan Game" : r/gamedev \- Reddit, accessed April 10, 2026, [https://www.reddit.com/r/gamedev/comments/18o2xc3/read\_this\_before\_making\_any\_fan\_game/](https://www.reddit.com/r/gamedev/comments/18o2xc3/read_this_before_making_any_fan_game/)  
92. Are Fan Games Fair Use? \- Game Developer, accessed April 10, 2026, [https://www.gamedeveloper.com/business/are-fan-games-fair-use-](https://www.gamedeveloper.com/business/are-fan-games-fair-use-)  
93. Intellectual property protection by Nintendo \- Wikipedia, accessed April 10, 2026, [https://en.wikipedia.org/wiki/Intellectual\_property\_protection\_by\_Nintendo](https://en.wikipedia.org/wiki/Intellectual_property_protection_by_Nintendo)  
94. Pokémon has a "License to Steal" \- Geimers, accessed April 10, 2026, [https://geimers.com/en/pokemon-has-a-license-to-steal/](https://geimers.com/en/pokemon-has-a-license-to-steal/)  
95. Pokémon TCG Pocket Suddenly Pulls Card Design Embroiled in Plagiarism Controversy, as Company Admits 'Production Issue' and Launches Wider Investigation \- IGN, accessed April 10, 2026, [https://www.ign.com/articles/pokmon-tcg-pocket-suddenly-pulls-card-design-embroiled-in-plagiarism-controversy-as-company-admits-production-issue-and-launches-wider-investigation](https://www.ign.com/articles/pokmon-tcg-pocket-suddenly-pulls-card-design-embroiled-in-plagiarism-controversy-as-company-admits-production-issue-and-launches-wider-investigation)  
96. Vietnam \- Protecting Intellectual Property \- International Trade Administration, accessed April 10, 2026, [https://www.trade.gov/country-commercial-guides/vietnam-protecting-intellectual-property](https://www.trade.gov/country-commercial-guides/vietnam-protecting-intellectual-property)  
97. Protection of copyright over creative works in the era of technological advancement in Vietnam, accessed April 10, 2026, [https://vietnamlawmagazine.vn/protection-of-copyright-over-creative-works-in-the-era-of-technological-advancement-in-vietnam-78969.html](https://vietnamlawmagazine.vn/protection-of-copyright-over-creative-works-in-the-era-of-technological-advancement-in-vietnam-78969.html)  
98. Nintendo Lawyers vs Pokemon Fan Games \- YouTube, accessed April 10, 2026, [https://www.youtube.com/watch?v=vtwa8ffkxJs](https://www.youtube.com/watch?v=vtwa8ffkxJs)  
99. Can You Use Licensed Characters Even In Fan-Made Games? | David Mullich, accessed April 10, 2026, [https://davidmullich.com/2014/05/26/is-it-okay-to-use-licensed-characters-in-fan-made-games/](https://davidmullich.com/2014/05/26/is-it-okay-to-use-licensed-characters-in-fan-made-games/)  
100. ULTIMATE TCG Card Shop Simulator Beginner Guide (NO Mods) \- YouTube, accessed April 10, 2026, [https://www.youtube.com/watch?v=l9QSQIcr778](https://www.youtube.com/watch?v=l9QSQIcr778)  
101. The Intersection of Pokémon and Copyright: Lessons from Recent Legal Challenges in Esports | Sports Litigation Alert, accessed April 10, 2026, [https://sportslitigationalert.com/the-intersection-of-pokemon-and-copyright-lessons-from-recent-legal-challenges-in-esports/](https://sportslitigationalert.com/the-intersection-of-pokemon-and-copyright-lessons-from-recent-legal-challenges-in-esports/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAYCAYAAACMcW/9AAACw0lEQVR4Xu2WTahNURTHl1CEJCJfhd5EDMhHlK8kMSDJgJSBCRMTnzG6yMCAECkpmTBgikJ5RRJGykchkQhhZkDh/7P37u277j7Xdd97ZfD+9evcu9bpnLXXXmvtY9an/19DxSBvbEEDxXBvbFUjxXKxTkwV/evdDZohzll7LyTQY2Ktd1Spn1gk7otrYmPkungu5nTdWqcJ4paY5h3/IBJzVcz1Di9WdVi8ssaA8J0RX8VM52NxZKPm7O1ohYWkUEJFEchp8cWqV8T2fxYnLQSXNF08i9fuirK5K9Z7R9JW8TNeqzRCPBCPxajMvkdcsfaaqKRD4rIY4B0d4p14KsY4X64U6GsxNtoIjiD3pZsy0XwLxKz4m12YJNZY8+ZcaeEd1H2dauKXhZU00xTx3uoD5cr/VemmTNvEAfHEwjtOiYNik3ghjlh9CSWxsLfm+oSi7bSw7ctyR0H4ue+2GBZtPPSDhczlYmeOi9EWnk8T5rV/PtpLTVNcfDLSJGxHM52wkPlaZiPQN/Gaa7bYYGH7yA7TJGUvlctNMSTacqWYGIsNxnw7S5poYY5+svpZWRVoErvwPV6TJlsIvqrUUkzbcyPdSxc3C5RM7LWQzR3O97dAaTLqmvpOYvR8E/MzW67i1jMCLoof1lhnSdQWNcbAZ97mIgAmBp3qVdri9L57FmbmZrE4+pIqn8lJQyCc0z6QpeKjOCoGOx9KO7LFO6yrPvMtTtki0zTaWWv8NqDbX1pFz+BkZHDGp/Ods/6RhWBLYwRhZ4E0mhdbSwKWZDYScUE8FDcsNJ0X7+608kT4IwYwq+BrifoYZ9UB5qLmWCAHQi6eh80/g/98gJROslQaNWfvEfHSOxY+KLqrDgv1y7VXtFpcsnIdtyoyvV/sjr97RTx4V6Tdlyy08DHim6vHRaPsFPO8owWNtzAdej3IPqHfLKl+4kLi+UMAAAAASUVORK5CYII=>