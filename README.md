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

