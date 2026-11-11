# NHÀ MƠ ƯỚC (DREAM HOUSE) - KIẾN TRÚC & XÂY DỰNG

> Website trưng bày thiết kế kiến trúc nhà ở cao cấp, tích hợp mô hình 3D tương tác thời gian thực, song ngữ Việt - Anh, kết nối dữ liệu đám mây Supabase (PostgreSQL + Auth + Storage).

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Bộ sưu tập thiết kế đa dạng:**
   - Phân loại rõ ràng: Nhà phố, Biệt thự vườn, Biệt thự tân cổ điển, Nhà cấp 4 mái Nhật / mái Thái.
   - Bộ lọc thông minh: Lọc theo loại hình nhà, tìm kiếm từ khoá tức thì, sắp xếp theo chi phí / diện tích sàn, lọc nhanh các mẫu đã đánh dấu yêu thích.

2. **Panel chi tiết kiến trúc chuyên sâu:**
   - **Ảnh thiết kế & phối cảnh thực tế:** Mặt đứng, ngoại thất sân vườn sắc nét.
   - **Mô hình 3D tương tác thực tế:** Xoay 360 độ bằng chuột hoặc cảm ứng trên điện thoại, con lăn thu phóng, các nút chuyển nhanh góc máy (Mặt tiền, Góc bên hông, Từ trên cao, Góc chuẩn).
   - **Cơ chế 3D kép thông minh:** Tự động nạp file `.glb` nếu có; nếu chưa có file 3D, hệ thống tự động sinh khối kiến trúc theo đúng số đo (rộng × sâu × số tầng × kiểu mái × ban công).

3. **Song ngữ Việt - Anh (VI | EN):**
   - Chuyển đổi tức thì tại thanh điều hướng mà không cần tải lại trang.
   - Nhớ lựa chọn của người dùng vào `localStorage`, tự nhận diện theo ngôn ngữ trình duyệt.
   - Tự động chuẩn hoá đơn vị tiền tệ dự toán (Bản tiếng Việt: "1.85 tỷ VNĐ", "850 triệu VNĐ"; Bản tiếng Anh: "≈ 1.85 billion VND").

4. **Xác thực & Bảo mật Supabase:**
   - Đăng ký tài khoản nhanh chóng bằng **Tên tài khoản (Username)** kèm ô xác nhận mật khẩu (không cần Email).
   - Đăng nhập linh hoạt bằng Tên tài khoản hoặc Email, có tính năng "Ghi nhớ tài khoản".
   - Đăng nhập 1-chạm với Google OAuth.
   - Tự động đồng bộ danh sách mẫu yêu thích từ trình duyệt vào tài khoản khi người dùng đăng nhập.
   - Phân quyền Quản trị viên (Admin) chặt chẽ bằng PostgreSQL Row Level Security (RLS).

5. **Kênh liên hệ đa dạng & Form tư vấn:**
   - Tích hợp Zalo, Hotline, Facebook Messenger và Email.
   - Nút "Nhận báo giá mẫu này" tự động đính kèm thông tin mẫu nhà đang xem vào nội dung liên hệ.

6. **Trung tâm Điều hành & Thống kê Thị hiếu Thời gian thực (Admin Analytics):**
   - Tích hợp 2 chuẩn thiết kế vi tương tác Lucian UX/UI Prompts (#047 & #097):
     - **Bộ chuyển đổi chu kỳ (Period Segmented Control):** Núm trượt cao su đàn hồi, bộ đếm cuộn số và biểu đồ sóng Bezier SVG động theo chu kỳ (Hôm nay, 7 ngày, 30 ngày, Toàn bộ).
     - **Biểu đồ tròn Donut tự chia lại thị phần (Donut that re-splits):** Di chuột trượt lát cắt ra ngoài, click bật/tắt phân loại để tự động tính toán lại góc quay và cuộn tổng số lượt tương tác.
     - **Bảng xếp hạng hiệu suất chi tiết:** Xếp hạng mẫu thiết kế được xem nhiều nhất và thả tim yêu thích nhiều nhất.

7. **Chuông Thông Báo Thông Minh Phân Quyền (Notification Bell Dropdown Lucian #074 - v8.1):**
   - Đặt cạnh Avatar với hiệu ứng rung chuông (Bell Shake), nhảy số thông báo (Badge Pop), danh sách trượt mượt mà.
   - **Phân quyền vai trò chuẩn xác (Role-Based Dispatching):**
     - *Tài khoản Admin:* Nhận thông báo tức thì khi có khách hàng gửi yêu cầu tư vấn mới, kèm nút bấm mở Modal xem chi tiết hồ sơ khách hàng (Tên, SĐT, email, mẫu quan tâm, lời nhắn, nút gọi hotline / Zalo 1-chạm).
     - *Tài khoản Khách hàng (User):* Chỉ nhận thông báo phản hồi từ KTS hoặc thông báo xác nhận khi đã gửi tư vấn thành công cho mẫu nhà đang xem.
   - Hỗ trợ thao tác *"Đã đọc tất cả"* xóa mờ từng chấm xanh tuần tự, phím tắt `Esc` và nhấp ngoài để đóng linh hoạt.

8. **Bộ Tính Dự Toán Chi Phí Xây Dựng Tương Tác (Interactive Cost Engine - v8.2):**
   - **Chuẩn kỹ thuật xây dựng dân dụng 2026:** Bóc tách diện tích quy đổi $S_{xd}$ (Móng 25%–75%, Thân nhà 100%, Mái 35%–100%) nhân với 4 gói vật tư thi công (Thô 3.8tr/m², Tiêu chuẩn 5.8tr/m², Nâng cao 7.2tr/m², Luxury 9.5tr/m²).
   - Tích hợp 2 cấp độ: Thẻ dự toán trực tiếp khi đang xoay 3D mẫu nhà và Modal dự toán toàn trang nhanh (`#quick-calc-modal`) có thanh trượt diện tích & tự động gợi ý mẫu nhà Dream House tương thích.
   - **Cầu nối tư vấn 1-chạm (1-Click Consultation Bridge):** Tự động điền toàn bộ kết quả bóc tách và dự toán vào Form gửi KTS tư vấn chi tiết.

9. **Bóc Tách Mặt Bằng 2D/3D Bố Trí Từng Tầng (Floor-by-Floor Layer Explorer & Vector CAD Engine - v8.3):**
   - **Động cơ vẽ bản vẽ CAD SVG Vector siêu nét:** Tỉ lệ chuẩn 1/100 theo tiêu chuẩn TCXDVN 2026 với tường chịu lực 200mm, tường ngăn 100mm, cửa quét cung mở $90^\circ$, thang 21 bậc Lỗ Ban, giếng trời, kim chỉ hướng Bắc, đường gióng kích thước chuẩn xác.
   - **Thanh điều hướng Visual Tabs 3 chế độ:** Phối cảnh (Photo) | 3D Tương tác (Viewer) | Mặt bằng tầng (Floorplan) kèm thanh chọn tầng trực quan (Tầng 1, Tầng 2, Tầng 3, Mái).
   - **Tương tác hai chiều (Bidirectional Real-Time Highlight):** Rê chuột vào phòng trên bản vẽ thì thẻ mô tả công năng bên dưới nổi bật và ngược lại.
   - **Nút Mặt cắt 3D (Isometric Top-Down 3D Cutaway):** Đưa camera 3D về góc nhìn bổ từ trên xuống, đối chiếu trực tiếp giữa bản vẽ phẳng 2D và không gian 3 chiều.
   - **Phóng to toàn màn hình (Fullscreen Lightbox Modal):** Trải nghiệm xem bản vẽ chi tiết khổ lớn trên mọi thiết bị.

10. **Tiện Ích Phong Thủy Bản Địa Hóa (Thước Lỗ Ban & Tra Cứu Bát Trạch Hướng Nhà - v8.4):**
   - **Thước Lỗ Ban trực tuyến 3 dải đo chạy song song:** 52.2cm Thông Thủy (cửa chính, cửa sổ, chiều cao trần); 42.9cm Dương Trạch (bệ bếp, bậc cầu thang, khuôn cửa, nội thất); 38.8cm Âm Phần (bàn thờ gia tiên).
   - **Trực quan sinh động & Chẩn đoán đa tầng:** Kim chỉ thị trung tâm màu vàng gold ánh kim, vạch đo trượt mượt mà theo tọa độ, phân tích rõ cung Đỏ (Cát) / cung Đen (Hung), ý nghĩa phong thủy và thuật toán tự động gợi ý tăng/giảm kích thước gần nhất để hóa giải cung xấu.
   - **Động cơ Bát Trạch & La Bàn 8 Hướng Hợp Tuổi:** Tính toán chính xác Can Chi, Ngũ Hành Niên Mệnh, Quẻ Cung Phi (Nam/Nữ) theo chuẩn phong thủy; hiển thị La Bàn Bát Quái Vector SVG 8 hướng phân chia rõ ràng 4 hướng Tốt (Sinh Khí, Thiên Y, Diên Niên, Phục Vị) và 4 hướng Xấu (Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Họa Hại).
   - **Bảng quy tắc bố trí công năng kiến trúc:** Hướng mở cửa chính, hướng ban thờ gia tiên (tọa cát hướng cát), bố trí bếp nấu chuẩn nguyên tắc "Tọa hung hướng cát", hướng giường ngủ đón vượng khí.
   - **Cầu nối tư vấn 1-chạm (1-Click Consultation Bridge):** Nút gửi thông số phong thủy tự động điền sẵn vào Form liên hệ KTS Võ Quốc Việt.

11. **Công Cụ So Sánh Mẫu Nhà Đối Đầu (Side-by-Side Design Compare - v8.5):**
   - **Khay so sánh nổi dưới màn hình (Floating Compare Dock):** Tự động hiển thị khi chọn từ 1 đến 3 mẫu nhà, chứa các slot thu nhỏ kèm thumbnail tròn, tên mẫu và nút xóa `✕` linh hoạt, lưu trữ danh sách qua `localStorage`.
   - **Bảng ma trận đối chuẩn đa tiêu chí 2–3 cột:**
     - Header cố định (Sticky Top) hiển thị ảnh phối cảnh, tên mẫu, phân loại và giá dự toán khi cuộn dọc.
     - Cột tiêu chí bên trái cố định (Sticky Left) đảm bảo dễ theo dõi khi cuộn ngang trên điện thoại.
     - Bóc tách 5 cụm tiêu chí: *Thông tin kiến trúc chung (kích thước, diện tích đất, $S_{xd}$); Quy mô & Kết cấu mái; Bố trí công năng phòng ốc; Dự toán chi phí 2026; Định hướng phong thủy hợp mệnh*.
   - **Công tắc "Chỉ hiện điểm khác biệt" (Highlight Differences Only):** Tự động lọc và làm nổi bật các thông số khác nhau giữa các mẫu nhà đang so sánh, ẩn các thông số giống nhau giúp gia chủ ra quyết định nhanh chóng.
   - **Cầu nối tư vấn 1-chạm (1-Click Consultation Bridge):** Nút *"Chọn mẫu này & Tư vấn"* tự động cuộn xuống Form liên hệ và điền toàn bộ thông số mẫu nhà đã chọn vào lời nhắn cho KTS Võ Quốc Việt.

---

## 🗺️ LỘ TRÌNH ĐỐI CHUẨN & NÂNG CẤP TÍNH NĂNG ĐỘT PHÁ (FEATURE ROADMAP)

Để đưa nền tảng Dream House vươn tầm các dịch vụ thiết kế kiến trúc chuẩn quốc tế và tạo ra trải nghiệm chuyển đổi khách hàng vượt trội, dự án xác lập lộ trình triển khai 5 tính năng trọng tâm sau:

| # | Tính năng đề xuất | Giải quyết vấn đề gì? | Lợi ích cho khách hàng & Chuyển đổi | Trạng thái |
|---|---|---|---|:---:|
| **1** | **Bộ tính dự toán chi phí tương tác** *(Interactive Cost Calculator)* | Trước đây dự toán chỉ là một con số tĩnh (ví dụ: 4,8 tỷ), khách hàng không rõ gồm những hạng mục cụ thể nào. | Cho phép gia chủ trượt chọn gói vật tư (Tiêu chuẩn / Nâng cao / Cao cấp / Thô), chọn loại móng và kiểu mái; tự động bóc tách chi phí: Phần Thô, Hoàn Thiện, Thiết Bị ME, Quản Lý & Dự Phòng. | ✅ **Đã hoàn thành** *(v8.2)* |
| **2** | **Bóc tách mặt bằng 2D/3D từng tầng** *(Floor-by-Floor Layer Explorer)* | Hiện chỉ xem được khối ngoại thất 3D, chưa thấy bố trí phòng ốc công năng bên trong từng tầng. | Thêm tab xem mặt bằng Tầng 1, Tầng 2, Tầng 3, Mái với diện tích từng phòng (Phòng khách, Bếp, PN Master, WC), tích hợp bản vẽ kỹ thuật CAD Vector chuẩn 1/100, tương tác 2 chiều và chế độ Mặt cắt 3D Top-Down. | ✅ **Đã hoàn thành** *(v8.3)* |
| **3** | **Tiện ích Phong Thủy bản địa hóa** *(Thước Lỗ Ban & Hướng Nhà)* | 90% người Việt Nam khi làm nhà đều xem phong thủy (kích thước thông thủy cửa chính, cửa sổ, hướng bếp, hướng nhà hợp tuổi). | Tích hợp Thước Lỗ Ban trực tuyến đa dải đo (52.2cm Thông thủy, 42.9cm Dương trạch, 38.8cm Âm phần) và công cụ nhập năm sinh/giới tính tra cứu Bát Trạch, Cung Mệnh, hướng nhà cát hung chính xác, kèm quy tắc bố trí mặt bằng chuẩn KTS. | ✅ **Đã hoàn thành** *(v8.4)* |
| **4** | **Công cụ So sánh mẫu nhà** *(Side-by-Side Compare)* | Khách hàng phân vân giữa 2–3 mẫu nhà nhưng phải mở đi mở lại các trang riêng lẻ khó đánh giá. | Chọn 2–3 mẫu và mở bảng so sánh đối đầu trực quan: Kích thước mặt tiền, chiều sâu, công năng số phòng ngủ, diện tích sàn quy đổi, đơn giá và tổng dự toán chi phí, kèm công tắc lọc điểm khác biệt. | ✅ **Đã hoàn thành** *(v8.5)* |
| **5** | **Xuất hồ sơ tóm tắt 1-Click** *(Download Concept PDF Brochure)* | Khách muốn mang bản vẽ sơ bộ, phối cảnh và bảng giá về bàn bạc cùng gia đình trước khi ký hợp đồng. | Bấm 1 nút tải ngay file PDF Concept chuyên nghiệp gồm ảnh phối cảnh, sơ đồ mặt bằng các tầng, bảng khái toán vật tư có sẵn logo Dream House và thông tin liên hệ Hotline/Zalo KTS Võ Quốc Việt. | ⏳ *Kế hoạch tiếp theo* |

---

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```text
DreamHouse/
├── index.html               # Trang chủ chính: Hero, Thư viện, Modal chi tiết, Modal Auth, Profile Modal
├── admin.html               # Trang quản trị: Quản lý mẫu nhà, Upload Storage, Xử lý Inquiry
├── style.css                # CSS giao diện tinh tế, phong cách Editorial Minimalist, Dark/Light Mode
├── generate-config.js       # Script Node.js tự động đọc .env và sinh js/config.js an toàn
├── start.bat                # Khởi động máy chủ Node.js cục bộ (Port 3000) với 1-click
├── components\
│   ├── heart-burst-like.html        # Nút yêu thích Heart Burst Like (022, Toggles & Pickers)
│   ├── circular-reveal-switch.html  # Chuyển đổi giao diện Circular Reveal (219, Navigation)
│   └── day-night-switch.html        # Chuyển đổi ngày đêm Day-Night Sky Switch (021)
├── js\
│   ├── config.js            # Cấu hình Supabase (URL, anon key) & Thông tin liên hệ (auto-generated)
│   ├── i18n.js              # Bộ từ điển song ngữ Việt - Anh & Hàm định dạng tiền tệ
│   ├── toast.js             # Hệ thống Toast Notification cao cấp (thay thế hoàn toàn alert)
│   ├── viewer3d.js          # Bộ dựng Three.js: Orbiting, ánh sáng, nạp .glb hoặc dựng procedural
│   └── app.js               # Logic điều phối giao diện, Auth, Profile Modal, lọc dữ liệu
├── supabase\
│   ├── 01_schema.sql        # Khởi tạo các bảng (profiles, templates, favorites, inquiries...) & Triggers
│   ├── 02_security.sql      # Cấu hình Row Level Security (RLS) & hàm is_admin()
│   ├── 03_storage.sql       # Khởi tạo Storage buckets (template-images, template-models) & Policies
│   ├── 04_sample_data.sql   # Dữ liệu ban đầu (6 mẫu nhà thực tế)
│   ├── 05_username_auth.sql # Hỗ trợ Đăng ký/Đăng nhập bằng Username & hàm RPC tạo user trực tiếp
│   ├── 08_fix_favorites_rls.sql # Khắc phục triệt để lỗi 403 Forbidden khi đồng bộ favorites
│   ├── 09_template_views_analytics.sql # Theo dõi lượt xem thời gian thực & RPC phân tích tương tác
│   └── all_in_one_setup.sql # Script tổng hợp thiết lập toàn bộ cơ sở dữ liệu trong 1 lần chạy
├── memories.md              # Bối cảnh, quyết định thiết kế cốt lõi và nhật ký tiến trình phát triển
├── README.md                # Tài liệu tổng quan và hướng dẫn sử dụng
├── AI_Config.md             # Hướng dẫn cấu hình chi tiết từng bước cho người mới và AI
├── AI_Debug.md              # Cẩm nang chẩn đoán & xử lý các lỗi thường gặp
└── GEMINI.md                # Quy tắc tự động cho AI Agent (Auto-log, auto-sync, cache-busting)
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### Bước 1: Khởi tạo Cơ sở dữ liệu trên Supabase
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com).
2. Tạo một Project mới (đặt tên ví dụ: `dream-house`).
3. Mở tab **SQL Editor** trong thanh menu bên trái.
4. Chạy tuần tự các file SQL theo đúng thứ tự số:
   - Chạy `supabase/01_schema.sql` (Tạo bảng và trigger user profile).
   - Chạy `supabase/02_security.sql` (Cài đặt hàm `is_admin` và các chính sách bảo mật RLS).
   - Chạy `supabase/03_storage.sql` (Tạo các bucket lưu ảnh và mô hình 3D).
   - Chạy `supabase/04_sample_data.sql` (Nạp 6 mẫu nhà ban đầu).

### Bước 2: Cấu hình biến môi trường
1. Tạo hoặc chỉnh sửa file `.env` tại thư mục gốc.
2. Điền `SUPABASE_URL` và `SUPABASE_ANON_KEY` của dự án Supabase.
3. Chạy lệnh sinh cấu hình:
   ```powershell
   node generate-config.js
   ```

### Bước 3: Chạy thử trên máy tính
- **Cách 1 (Nhanh nhất trên Windows):** Nhấp đúp chuột vào file `start.bat`. Máy chủ Node.js sẽ tự động chạy tại cổng 3000 và mở trình duyệt tại `http://localhost:3000`.
- **Cách 2 (Bằng npm / npx):**
  ```powershell
  npm run dev
  # hoặc: npx serve -p 3000
  ```
- **Cách 3:** Dùng VS Code Extension **Live Server** (chuột phải vào `index.html` > Open with Live Server).

---

## 🔒 THÔNG TIN BẢN QUYỀN & LIÊN HỆ
- **Đại diện kỹ thuật & Kiến trúc:** Võ Quốc Việt
- **Hotline / Zalo:** 0367020403
- **Email:** voviet4323@gmail.com
- **Facebook cá nhân:** [facebook.com/quocviet43](https://www.facebook.com/quocviet43)

