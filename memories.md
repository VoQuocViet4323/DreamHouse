# MEMORIES - DỰ ÁN NHÀ MƠ ƯỚC (DREAM HOUSE)

Tài liệu này lưu trữ toàn bộ bối cảnh kiến trúc, các quyết định thiết kế quan trọng, quy ước nghiệp vụ và **nhật ký tiến trình phát triển (Progress Log)** để thành viên mới hoặc AI Agent đọc hiểu tức thì và tiếp nối công việc liền mạch.

> **QUY TẮC BẮT BUỘC CHO AI AGENT:** Sau mỗi lần thực hiện thay đổi mã nguồn, thêm tính năng mới, sửa lỗi UI/UX hoặc cấu hình hệ thống, AI **bắt buộc phải tự động cập nhật tiến trình vào mục 6 của file `memories.md` này** trước khi kết thúc phản hồi.

---

## 1. Bối cảnh & Thông tin cốt lõi
- **Tên dự án:** Nhà Mơ Ước (Dream House)
- **Định vị:** Nền tảng web trưng bày thiết kế kiến trúc và xây dựng, phong cách tối giản biên tập (Editorial Minimalist Luxury), tập trung tôn vinh ảnh thực tế và mô hình 3D tương tác.
- **GitHub Repository:** `https://github.com/VoQuocViet4323/DreamHouse.git` (nhánh chính: `main`)
- **Supabase Project:**
  - Project URL: `https://qdkhqvsbtmbgkmoldazt.supabase.co`
  - Tài khoản Admin chính: `voviet4323@gmail.com`
- **Mô hình vận hành:**
  - Khách vãng lai xem mẫu, tương tác 3D, lọc mẫu nhà, gửi yêu cầu tư vấn báo giá ngay mà không bắt buộc đăng nhập.
  - Đăng nhập (Email hoặc Google OAuth) phục vụ mục đích: Lưu và đồng bộ danh sách yêu thích đa thiết bị, quản lý hồ sơ cá nhân, phân quyền Quản trị viên (Admin).
  - Không có giỏ hàng hay thanh toán online trực tiếp; mục tiêu cốt lõi là tạo phễu thu thập nhu cầu (leads) và chuyển đổi qua Zalo (`0367020403`)/Hotline/Facebook/Email.

---

## 2. Các quyết định kỹ thuật cốt lõi (Key Decisions)

### A. Kiến trúc Single-Page App tĩnh (Vanilla JS + HTML5 + CSS3 + Node Serve)
- **Lý do chọn:** Tốc độ tải trang siêu nhanh, không phụ thuộc framework cồng kềnh, triển khai miễn phí cực dễ trên Vercel, Netlify, Cloudflare Pages hoặc GitHub Pages.
- **Môi trường chạy cục bộ (Local Dev):**
  - Sử dụng thuần **Node.js** (`npx serve -l 3000`), không phụ thuộc Python.
  - Script `generate-config.js` tự động đọc `.env` để sinh `js/config.js` trước khi khởi chạy qua `start.bat` hoặc `npm run dev`.
- **Thư viện bên thứ ba:**
  - `Three.js` (r128) + `GLTFLoader` cho dựng và điều khiển 3D.
  - `@supabase/supabase-js` (v2) cho Database, Storage, Auth.

### B. Cơ chế 3D kép (Hybrid 3D Engine)
- Nếu trường `model_path` trong Database có link file: Three.js tải file `.glb` chuẩn từ Supabase Storage.
- Nếu `model_path` rỗng: Thuật toán trong `js/viewer3d.js` tự động dựng khối 3D hình học thực tế (procedural parametric block) dựa trên các thông số kỹ thuật (`width_m`, `depth_m`, `floors`, `roof`, `has_balcony`).

### C. Cơ chế đa ngôn ngữ (Bilingual Vi - En không reload)
- Toàn bộ text giao diện lưu trong dictionary `js/i18n.js`.
- Cơ chế bảo vệ UI trong `updateDOM()`: Chỉ ghi đè text khi tìm thấy bản dịch hợp lệ (`text && text !== key`), tuyệt đối không ghi đè mã key thô lên giao diện nếu trình duyệt lưu cache cũ.
- Định dạng tiền tệ tự động theo ngôn ngữ:
  - Bản tiếng Việt: `"1.85 tỷ VNĐ"`, `"850 triệu VNĐ"`.
  - Bản tiếng Anh: `"≈ 1.85 billion VND"` hoặc `"≈ 850 million VND"`.

### D. Kiến trúc Cơ sở dữ liệu & Phân quyền Supabase (PostgreSQL + RLS)
- **Bảo mật tuyệt đối:** RLS (Row Level Security) kích hoạt trên 100% các bảng (`templates`, `template_images`, `profiles`, `favorites`, `inquiries`) và các Storage buckets (`template-images`, `template-models`).
- **Hàm kiểm tra quyền:** `public.is_admin()` (`SECURITY DEFINER`, `STABLE`) kiểm tra `profiles.role = 'admin'` với `auth.uid()`.
- **Bảng `profiles`:** Lưu trữ `id`, `full_name`, `phone`, `avatar_url`, `role`, `created_at`, `updated_at`.
- **Đồng bộ User tự động:** Trigger `on_auth_user_created` trên bảng `auth.users` tự động điền `profiles` ngay khi người dùng đăng ký.

### E. Hiệu ứng Giao diện & Trải nghiệm người dùng (UI/UX Highlights)
1. **Chuyển đổi Giao diện Sáng/Tối (Circular-Reveal Dark Mode - Prompt #219):**
   - Sử dụng `document.startViewTransition` kết hợp `clip-path: circle(...)` lan tỏa mượt mà từ đúng tọa độ nút bấm mặt trời/mặt trăng trên thanh điều hướng.
   - Chuyển từ nền tối sang sáng lan tỏa vùng sáng, và từ sáng sang tối lan tỏa vùng tối (không bị nháy thanh navbar).
2. **Menu Tài khoản & Avatar Dropdown:**
   - Khi đăng nhập, hiển thị nút pill gồm Avatar (ảnh đại diện hoặc chữ cái đầu tên) + Tên hiển thị + Mũi tên xổ xuống.
   - Menu dropdown tích hợp: Thông tin vai trò & email, *Bảng quản trị Admin* (chỉ hiện với Admin), *Mẫu nhà đã lưu yêu thích*, *Chỉnh sửa hồ sơ*, *Cài đặt hệ thống*, và *Đăng xuất* (hiệu ứng trượt icon đỏ hiện đại).
   - Đã loại bỏ các nút trùng lặp trên thanh điều hướng chính để giữ bố cục tối giản.
3. **Panel Chỉnh sửa Hồ sơ cá nhân (`#profile-modal`) & Thẻ Bảo mật Mật khẩu (`.security-card`):**
   - Giao diện Modal sang trọng đồng bộ Light/Dark mode:
     - **Header:** Khung xem trước Avatar trực tiếp, huy hiệu vai trò (`★ Quản trị viên (Admin)`) tách hàng riêng biệt phía trên tiêu đề, nút đóng kính mờ (`✕`) góc phải.
     - **Thông tin cá nhân:** Họ và tên hiển thị, Số điện thoại liên hệ, Email (kèm huy hiệu `✓ Đã xác thực`), Đường dẫn ảnh đại diện kèm 4 chip chọn mẫu nhanh (*Kiến trúc sư*, *Kỹ sư*, *Thiết kế*, *Dùng chữ cái*).
     - **Thẻ Đổi mật khẩu (`.security-card`):** Thiết kế dạng thẻ bảo mật mở rộng/thu gọn, tích hợp nút con mắt Ẩn/Hiện mật khẩu cho cả 2 ô, thanh đo độ mạnh mật khẩu 4 mức màu thời gian thực (*Yếu*, *Trung bình*, *Khá*, *Rất mạnh*), nhãn kiểm tra khớp mật khẩu tự động (`✓ Khớp hoàn toàn` / `⚠️ Chưa khớp`) và checklist tiêu chuẩn bảo mật.
     - **Đồng bộ tức thì:** Lưu dữ liệu đồng thời vào bảng `public.profiles` và `Supabase Auth user_metadata`, cập nhật ngay tên và ảnh Avatar trên thanh Navbar mà không cần tải lại trang.

---

## 3. Quy ước và tiêu chuẩn dữ liệu mô hình 3D (SketchUp & Blender)
1. **Định dạng:** `.glb` (GL Transmission Format Binary).
2. **Kích thước file:** Dưới 5 MB (tối đa 10 MB).
3. **Toạ độ gốc (Origin):** Nằm chính giữa đáy của ngôi nhà $(0, 0, 0)$ trên mặt đất.
4. **Đơn vị đo:** Mét (Meters, tỉ lệ $1:1$).
5. **Texture:** Tối đa $2048 \times 2048\text{ px}$, định dạng nén JPG/WebP.

---

## 4. Trạng thái phân quyền (Role Matrix)

| Hành động | Khách vãng lai (Anon) | Thành viên (User) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: |
| Xem mẫu nhà đã `published` | ✅ | ✅ | ✅ |
| Xem mẫu nháp (`published=false`) | ❌ | ❌ | ✅ |
| Xoay và xem 3D / ảnh chi tiết | ✅ | ✅ | ✅ |
| Gửi form liên hệ tư vấn (`inquiries`) | ✅ | ✅ | ✅ |
| Lưu yêu thích cục bộ (Browser) | ✅ | ✅ | ✅ |
| Đồng bộ yêu thích lên Cloud DB | ❌ | ✅ | ✅ |
| Chỉnh sửa Hồ sơ cá nhân & Mật khẩu | ❌ | ✅ | ✅ |
| Thêm / Sửa / Xoá mẫu nhà (`admin.html`) | ❌ | ❌ | ✅ |
| Tải file lên Storage | ❌ | ❌ | ✅ |
| Xem và xử lý danh sách `inquiries` | ❌ | ❌ | ✅ |

---

## 5. Bảo mật & Kiểm toán (Security Audit Skill)
- Đã tích hợp bộ kỹ năng kiểm tra bảo mật của Cloudflare tại `.gemini/skills/security-audit/SKILL.md` (cùng các tài liệu tham chiếu `owasp.md`, `secrets.md`, `dependencies.md`).
- Mọi thay đổi liên quan đến xác thực, RLS, biến môi trường `.env` đều tuân thủ nguyên tắc không lộ `service_role` key ra client và kiểm soát quyền truy cập ở tầng cơ sở dữ liệu.

---

## 6. Nhật ký Tiến trình Phát triển (Development Progress Log)

### Giai đoạn 1: Khởi tạo Kiến trúc & Cơ sở dữ liệu
- [x] Xây dựng cấu trúc SPA thuần HTML5/CSS3/JS (`index.html`, `admin.html`, `style.css`, `js/app.js`, `js/viewer3d.js`, `js/i18n.js`).
- [x] Thiết lập bộ script SQL chuẩn cho Supabase (`01_schema.sql`, `02_security.sql`, `03_storage.sql`, `04_sample_data.sql`, `all_in_one_setup.sql`).
- [x] Chuyển đổi cơ chế chạy server cục bộ từ Python sang Node.js (`npx serve -l 3000` trong `start.bat` và `package.json`), tự động sinh `js/config.js` từ `.env`.
- [x] Kết nối thành công với dự án Supabase thực tế và đẩy toàn bộ mã nguồn lên GitHub `VoQuocViet4323/DreamHouse.git`.

### Giai đoạn 2: Tích hợp Kỹ năng Bảo mật & Hiệu ứng Chuyển đổi Nền (Dark/Light Mode)
- [x] Tích hợp `cloudflare/security-audit-skill` vào `.gemini/skills/security-audit/` để AI tự động rà soát bảo mật.
- [x] Thiết kế nút chuyển đổi giao diện Sáng/Tối trên thanh Navbar theo chuẩn **Circular-reveal dark mode (Prompt #219)** sử dụng View Transition API.
- [x] Khắc phục lỗi chớp nháy thanh Navbar và chuẩn hóa chiều lan tỏa vòng tròn: từ tối sang sáng tỏa màu sáng, từ sáng sang tối tỏa màu tối.

### Giai đoạn 3: Tối ưu Thanh điều hướng & Menu Tài khoản (User Dropdown)
- [x] Thiết kế lại cụm nút điều khiển trên Navbar hiện đại, đồng bộ chiều cao và hiệu ứng hover.
- [x] Chuyển nút Admin rời rạc vào trong **Menu Dropdown khi bấm vào Avatar/Tên người dùng**.
- [x] Xóa mục *"Cấu hình thêm mẫu mới"* bị trùng lặp chức năng với *"Bảng quản trị Admin"* trong menu xổ xuống.

### Giai đoạn 4: Thiết kế Panel Chỉnh sửa Hồ sơ & Thẻ Bảo mật Mật khẩu
- [x] Thay thế hộp thoại `prompt()` mặc định bằng **Panel Chỉnh sửa Hồ sơ cá nhân (`#profile-modal`)** hiện đại, hỗ trợ cập nhật Họ tên, Số điện thoại, Ảnh đại diện (URL + Preset mẫu nhanh) và đồng bộ trực tiếp lên Navbar.
- [x] Bổ sung cột `phone` vào bảng `public.profiles` trong các tệp SQL.
- [x] Thiết kế chuyên sâu **Thẻ Đổi mật khẩu (`.security-card`)** với nút con mắt ẩn/hiện mật khẩu, thanh đo độ mạnh 4 nấc màu thời gian thực, nhãn báo khớp mật khẩu và tiêu chuẩn bảo mật.
- [x] Khắc phục triệt để lỗi hiển thị mã key i18n thô do cache trình duyệt, sửa nút đóng `✕` kính mờ trong Dark mode và tách dòng huy hiệu `★ Quản trị viên (Admin)` để không chạm vào nút đóng góc phải.
- [x] Thiết lập quy tắc tự động cập nhật `memories.md` (`GEMINI.md`) cho mọi phiên làm việc tiếp theo.
- [x] **Khắc phục lỗi không đăng nhập được khi kéo dự án sang máy mới (`Failed to fetch` / `ERR_NAME_NOT_RESOLVED`):**
  - Sửa logic trong `generate-config.js` để tự động phát hiện và bỏ qua các giá trị mẫu (`https://your-project-id.supabase.co`, `your-supabase-publishable-key-here`) khi sinh từ `.env.example`, tự động fallback về khóa Publishable và URL chính thức của dự án Supabase (`https://qdkhqvsbtmbgkmoldazt.supabase.co`).
  - Cập nhật `.env`, `.env.example`, `js/config.js` và tăng phiên bản cache-busting lên `?v=1.5` trong `index.html` và `admin.html`.
- [x] **Chuẩn hóa đồng bộ tất cả nút Đóng `✕` (`.modal-close`, `.profile-close-btn`, `[id^="close-"][id$="-modal"]`) và các nút phụ trên toàn bộ website:**
  - Thiết lập hệ biến CSS toàn cục (`--btn-close-bg`, `--btn-close-border`, `--btn-close-color`, `--btn-subtle-bg`, `--btn-subtle-color`...) cho cả Light Mode và Dark Mode trong `style.css` để mọi nút đóng `✕` hiện tại và sau này tự động đồng bộ, không bao giờ lặp lại lỗi nền trắng chữ trắng.
  - Thay ký tự text `✕` bằng icon vector SVG sắc nét đồng nhất trên toàn bộ 4 hộp thoại (`#detail-modal`, `#auth-modal`, `#profile-modal` trong `index.html` và `#template-modal` trong `admin.html`).
  - Khắc phục đồng bộ các nút điều khiển góc nhìn 3D (`Front`, `Side`, `Top`, `Reset` - `.camera-presets button`), đoạn mô tả chi tiết (`.detail-desc-block`), nút lưu yêu thích (`.btn-outline-fav`, `.card-fav-btn`) và chữ `OR`/`HOẶC` trong Dark Mode; tăng cache-busting lên `?v=1.7`.

### Giai đoạn 5: Chuẩn hóa Toàn diện Hệ thống Tài liệu & Tự động lưu Tiến trình
- [x] **Cập nhật Cẩm nang Lỗi `AI_Debug.md`:**
  - Bổ sung Lỗi 8 (Lỗi `Failed to fetch` do ghi đè URL placeholder từ `.env.example`) và cách xử lý fallback trong `generate-config.js`.
  - Bổ sung Lỗi 9 (Nút Đóng và các nút phụ bị nền trắng chữ trắng trong Dark Mode) và giải pháp Design Tokens toàn cục.
  - Loại bỏ các đường dẫn tuyệt đối cũ (`e:\Dream-house\`), chuyển về đường dẫn tương đối chuẩn.
- [x] **Cập nhật Hướng dẫn Cấu hình `AI_Config.md` & `README.md`:**
  - Bổ sung cơ chế tự động đọc `.env` qua `generate-config.js` và khởi động 1-click qua `start.bat` / Node.js serve.
  - Chuẩn hóa cây thư mục dự án và các bước cài đặt cho người dùng mới.
- [x] **Nâng cấp Bộ Quy tắc Tự động `GEMINI.md`:**
  - Thiết lập cơ chế bắt buộc AI Agent tự động ghi nhật ký vào `memories.md`, lưu bug & giải pháp vào `AI_Debug.md`, cập nhật `AI_Config.md`/`README.md` và tự động commit/push GitHub sau mỗi phiên làm việc.

### Giai đoạn 6: Tối ưu Trải nghiệm Thoát xem Modal bằng Click Backdrop
- [x] **Tự động thoát chế độ xem khi bấm vào khoảng trống bên ngoài (Backdrop Click-to-Close):**
  - Gắn sự kiện click vào vùng trống overlay ngoài hộp thoại cho toàn bộ 4 modal: Chi tiết mẫu nhà (`#detail-modal`), Đăng nhập/Đăng ký (`#auth-modal`), Hồ sơ cá nhân (`#profile-modal`), và Quản trị thêm/sửa mẫu (`#template-modal`).
  - Áp dụng cơ chế kiểm tra `mousedown` -> `click` trên backdrop để chống đóng nhầm khi người dùng kéo chuột xoay mô hình 3D Three.js và nhả chuột ở ngoài viền canvas.
  - Tối ưu CSS với `cursor: pointer` trên `.modal-overlay` và `cursor: default` trên nội dung modal; tăng phiên bản cache-busting lên `?v=1.8`.

### Giai đoạn 7: Tối ưu Nút Ngôn ngữ Động & Hiệu ứng Chuyển đổi (VI / EN)
- [x] **Thiết kế nút ngôn ngữ động theo ngữ cảnh:**
  - Khi đang ở tiếng Việt: Nút hiển thị duy nhất nhãn `VI`.
  - Khi chuyển sang tiếng Anh: Nút hiển thị duy nhất nhãn `EN` với sắc vàng hoàng gia (`--color-accent`).
- [x] **Hiệu ứng Animation cơ học mượt mà (Spring Slide & Globe Rotation):**
  - Cấu trúc track trượt 2 tầng (`.lang-pill-track` và `.lang-code`): Khi chuyển ngôn ngữ, chữ trượt lên/xuống kèm spring physics `cubic-bezier(0.34, 1.56, 0.64, 1)` mà không gây layout shift hay nhấp nháy giật kích thước nút.
  - Tích hợp icon quả địa cầu thanh thoát (`.lang-globe-icon`), tự động xoay 180 độ mượt mà khi chuyển chế độ.
  - Hiệu ứng nhún đàn hồi (`langToggleBounce`) và gợn sáng hào quang vàng khi bấm; hỗ trợ hoàn hảo cả Dark Mode và Light Mode.
  - Tăng phiên bản cache-busting lên `?v=1.9` trong `index.html` và `admin.html`.

### Giai đoạn 8: Xây dựng Hệ thống Toast Notification Cao cấp (Thay thế hoàn toàn Alert)
- [x] **Xóa bỏ triệt để thông báo hộp thoại `alert()` mặc định của trình duyệt:**
  - Xây dựng module thông báo nổi cao cấp [`js/toast.js`](file:///d:/DreamHouse/js/toast.js) phong cách Animate-UI / Glassmorphism hỗ trợ 4 phân hệ thông báo: `success` (xanh ngọc), `error` (đỏ cam), `warning` (vàng hổ phách), `info` (xanh dương).
  - Tích hợp thanh tiến trình thời gian co dần (`.toast-progress-bar`), nút đóng nhanh `✕` và hiệu ứng trượt xuất hiện/biến mất mượt mà.
  - Ghi đè `window.alert` để bảo đảm tuyệt đối không bao giờ xuất hiện pop-up xám xịt của trình duyệt ở bất cứ tình huống nào.
  - Tích hợp bộ chuyển ngữ lỗi xác thực Supabase Auth tự động (`translateAuthError`): chuyển `Invalid login credentials` thành *"Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại."*.
  - Bổ sung khung cảnh báo inline `#auth-alert` trong form đăng nhập / đăng ký; tăng phiên bản cache-busting lên `?v=2.0`.

### Giai đoạn 9: Đồng bộ Toàn diện Hệ thống Thông báo & Hộp thoại Xác nhận (Custom Confirm Modal)
- [x] **Chuẩn hóa đồng bộ 1 kiểu thông báo duy nhất trên toàn bộ website:**
  - Triệt để loại bỏ hộp thoại xác nhận gốc `confirm()` của trình duyệt tại trang quản trị Admin khi xoá mẫu nhà (`admin.html`).
  - Phát triển tính năng **Hộp thoại xác nhận sang trọng (`window.confirmModal`)** phong cách Animate-UI trả về `Promise<boolean>`, hỗ trợ `async/await`.
  - Thiết kế hiệu ứng mờ hậu cảnh (`backdrop-filter: blur(8px)`), hiệu ứng phóng to/thu nhỏ chuyển động mượt mà, hỗ trợ đóng nhanh bằng phím `Escape`, bấm phím `Enter` để xác nhận, click vùng trống backdrop để thoát.
  - Nút đóng `✕` trong confirm dialog sử dụng trọn vẹn bộ Design Tokens CSS (`--btn-close-bg`, `--btn-close-color`...) và nút huỷ dùng `--btn-subtle-...` đảm bảo tương phản 100% trong cả Light Mode và Dark Mode.
  - Bổ sung thông báo Toast xúc giác tức thì cho các thao tác người dùng trước đây còn thiếu: Thêm/Gỡ mục yêu thích (`toggleFavorite`), Đăng xuất tài khoản (`logout`).
  - Cập nhật tham số phiên bản cache-busting lên `?v=2.1` trên toàn bộ tệp `index.html` và `admin.html`.

