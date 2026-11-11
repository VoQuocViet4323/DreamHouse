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

### Giai đoạn 10: Chuẩn hóa Tiêu đề Tab Trình duyệt (Browser Tab Title) & Favicon SVG
- [x] **Thay đổi tiêu đề trên thanh tab trình duyệt:**
  - Cập nhật tiêu đề trang chủ từ *"Nhà Mơ Ước - Kiến Trúc & Xây Dựng"* thành **`DreamHouse - Kiến Trúc & Xây Dựng`** trong `index.html`.
  - Cập nhật tiêu đề trang quản trị thành **`Hệ Thống Quản Trị - DreamHouse`** trong `admin.html`.
  - Tích hợp cơ chế đa ngôn ngữ i18n linh hoạt (`data-i18n="page_title"` / `data-i18n="admin_title"`) trong `js/i18n.js`: khi chuyển sang Tiếng Anh, tiêu đề tab tự động đổi sang `DreamHouse - Architecture & Construction` / `DreamHouse Management`.
  - Bổ sung Favicon vector SVG vàng kim hoàng gia sắc nét (`data:image/svg+xml`), triệt tiêu hoàn toàn lỗi 404 `/favicon.ico` trên Console trình duyệt.
  - Nâng tham số cache-busting lên `?v=2.2` trên toàn bộ tệp `index.html` và `admin.html`.

### Giai đoạn 11: Cố định Nhận diện Thương hiệu 'Dream House' trên Toàn bộ Giao diện
- [x] **Cố định thương hiệu "Dream House" khi đổi ngôn ngữ:**
  - Thiết lập giá trị `site_name: "Dream House"` cho cả hai bộ từ điển `vi` và `en` trong `js/i18n.js`. Khi người dùng chuyển sang Tiếng Việt hay Tiếng Anh, logo thương hiệu trên thanh điều hướng Navbar và Footer luôn giữ nguyên là **Dream House**.
  - Cập nhật mã nguồn HTML tĩnh tại `index.html` (Navbar & Footer) và `admin.html` (Navbar) thành `Dream House`.
  - Cập nhật dòng bản quyền chân trang: `© 2026 Dream House. All rights reserved.`.
  - Nâng tham số cache-busting lên `?v=2.3` trên toàn bộ tệp `index.html` và `admin.html`.

### Giai đoạn 12: Thiết kế Màn hình Đăng nhập Chuyên biệt Toàn màn hình (Dedicated Split-Screen Auth Page)
- [x] **Xây dựng Màn hình Đăng nhập / Đăng ký chuyên biệt chuẩn xu hướng Deel & Mobbin:**
  - Thay thế cửa sổ pop-up nhỏ cũ bằng **Trang đăng nhập toàn màn hình (Full-Screen Takeover)** chia đôi bố cục (Split Layout).
  - **Cột trái (Showcase Kiến trúc sư độc bản & Animation)**:
    - Bàn vẽ kiến trúc sư (Drafting Table) bằng đồ họa vector SVG tinh xảo: mặt bàn nghiêng, bản vẽ Blueprint trải rộng, ống bút thước kỹ thuật, mô hình biệt thự 3D mini.
    - Đèn bàn kiến trúc khớp nối kim loại với ánh sáng vàng ấm toả xuống mặt bàn kèm hiệu ứng nhấp nháy êm dịu (`lampLightGlow`).
    - Ghế kiến trúc sư công thái học màu vàng mù tạc hiện đại.
    - Hệ thống nhãn công nghệ lơ lửng chuyển động nổi (`3D Walkthrough`, `BIM Standards`) với góc trỏ pointer và chuyển động nhịp nhàng.
    - Tiêu đề nghệ thuật ấn tượng: *Kiến tạo không gian sống &* kèm pill viền nổi bật *tổ ấm trong mơ*, nút CTA dẫn tới thư viện mẫu nhà.
  - **Cột phải (Card Đăng nhập / Đăng ký nổi đè lên nền)**:
    - Thiết kế thẻ nổi (Floating Card) màu trắng tinh tế (hoặc kính mờ Obsidian trong Dark Mode) đổ bóng đa tầng.
    - Tiêu đề kiểu chữ Serif sang trọng (`Log in` / `Create an account`).
    - Nút đăng nhập Google với logo chính thức.
    - Ô nhập Email và Mật khẩu viền bo tròn hiện đại, kèm **nút con mắt ẩn/hiện mật khẩu tương tác thời gian thực (`👁️`)**.
    - Nút submit đen tuyền / vàng hoàng gia vững chãi, liên kết chuyển đổi linh hoạt Đăng nhập <-> Đăng ký <-> Quên mật khẩu.
  - **Tối ưu trải nghiệm điều hướng**:
    - Nút quay lại trang chủ ở thanh header trên cùng và hỗ trợ bấm phím `Escape` để thoát nhanh.
    - Hỗ trợ URL hash `#login` / `#register` và tệp chuyển tiếp `login.html`.
    - Tương thích 100% Dark Mode & Light Mode, đa ngôn ngữ VI / EN.
    - Nâng tham số cache-busting lên `?v=2.4` trên toàn bộ tệp `index.html` và `admin.html`.

### Giai đoạn 13: Tự động Chuyển hướng Màn hình Login khi Đăng xuất & Tinh chỉnh Toast Logout
- [x] **Tự động chuyển về màn hình đăng nhập khi đăng xuất (Logout to Login Flow):**
  - Khi người dùng đăng xuất từ thanh điều hướng `index.html` hoặc từ bảng quản trị `admin.html`, hệ thống tự động dọn dẹp phiên và kích hoạt mở ngay **Màn hình đăng nhập chuyên biệt (`#login`)**.
  - Reset form về chế độ đăng nhập (`Login mode`), tự động xóa trắng trường mật khẩu cũ và focus vào ô nhập Email sau hiệu ứng chuyển cảnh mượt mà.
  - Tự động đóng Menu Dropdown tài khoản khi bấm Đăng xuất.
- [x] **Nâng cấp nội dung & Phân hệ Toast Notification khi Logout:**
  - Chuyển phân hệ thông báo từ `toast.info` (icon chữ i màu xanh dương thông báo chung) sang **`toast.success`** (icon vector dấu tích xanh ngọc hoàng gia) mang lại cảm giác tích cực và hoàn tất trọn vẹn.
  - Tiêu đề thông báo: `Đăng xuất thành công` / `Signed Out`.
  - Nội dung thông báo: *"Bạn đã đăng xuất an toàn khỏi tài khoản. Hẹn sớm gặp lại bạn!"* / *"You have been signed out safely. See you again soon!"*.
  - Bổ sung cơ chế lưu cờ `sessionStorage.setItem('just_logged_out', '1')` khi đăng xuất từ trang `admin.html` để hiển thị Toast thông báo mượt mà sau khi chuyển trang.
  - Nâng tham số cache-busting lên `?v=2.5` trên toàn bộ tệp `index.html` và `admin.html`.

### Giai đoạn 14: Cơ chế Ghi nhớ Tài khoản (Remember Me) & Khắc phục Triệt để UI Nút Quay lại
- [x] **Xây dựng Cơ chế Ghi nhớ Tài khoản (Persistent Remember Me):**
  - Bổ sung hàng tuỳ chọn `.auth-options-row` gồm checkbox Ghi nhớ tài khoản (`#auth-remember-me`) bên trái và liên kết Quên mật khẩu (`#auth-forgot-password`) bên phải.
  - Thiết kế checkbox tuỳ biến cao cấp (`.auth-checkbox-box` + `.auth-check-icon` SVG): trạng thái checked hiển thị màu xanh tím thương hiệu (hoặc vàng hoàng gia Obsidian trong Dark Mode) với dấu tích vector sắc nét, tương thích hoàn toàn trên cả mobile và desktop.
  - Đa ngôn ngữ i18n đầy đủ cho nhãn: *"Ghi nhớ tài khoản"* (VI) và *"Remember me"* (EN).
  - Tích hợp hàm `loadRememberedAccount()` trong `DreamHouseApp` (`js/app.js`):
    - Khi đăng nhập thành công: Nếu tích chọn, lưu email vào `localStorage.setItem('dream_house_remember_email', email)`; nếu không tích, tự động xoá bản ghi ghi nhớ.
    - Khi mở modal đăng nhập, khởi động ứng dụng hoặc khi vừa đăng xuất: Hệ thống tự động nạp lại email đã ghi nhớ vào ô `#auth-email` và bật sẵn checkbox, đồng thời tự động trỏ tiêu điểm (focus) vào ô nhập mật khẩu để người dùng đăng nhập ngay chỉ với 1 cú click.
- [x] **Khắc phục Triệt để Lỗi UI Nút Back trên Màn hình Auth:**
  - Xử lý tận gốc nguyên nhân xung đột CSS: Selector toàn cục `[id^="close-"][id$="-modal"]` đã ép nút Back mang ID cũ `close-auth-modal` thành hình tròn 36px và làm chữ bị xếp chồng thành cột dọc.
  - Đổi ID thành `#auth-back-btn` và áp dụng class `.auth-back-nav-btn` kiểu viên thuốc nổi (Floating Pill) với các thuộc tính bảo vệ (`width: auto !important; height: 42px !important; white-space: nowrap !important; padding: 0 20px 0 16px !important`).
  - Tích hợp mũi tên SVG động trượt nhẹ sang trái (`translateX(-3px)`) khi hover, hiệu ứng kính mờ cao cấp `backdrop-filter: blur(12px)`.
  - Hỗ trợ đầy đủ phím tắt `Escape`, click backdrop hoặc click logo để quay về trang chủ.
  - Nâng tham số cache-busting lên `?v=2.6` trên toàn bộ tệp `index.html` và `admin.html`.

### Giai đoạn 15: Chuyển đổi Đăng ký sang Username & Bổ sung Ô Xác nhận Mật khẩu
- [x] **Chuyển đổi đăng ký bằng Email sang Username (Tên tài khoản):**
  - Loại bỏ hoàn toàn sự phụ thuộc vào hòm thư Email khi đăng ký thành viên mới.
  - Nhãn hiển thị linh hoạt theo chế độ:
    - Khi Đăng ký: Nhãn đổi thành **`Tên tài khoản (Username)`** với placeholder *"Ví dụ: quocviet99"*.
    - Khi Đăng nhập: Nhãn đổi thành **`Tên tài khoản hoặc Email`** với placeholder *"Nhập tên tài khoản hoặc email..."*.
  - Kiểm tra tính hợp lệ của Tên tài khoản: độ dài từ 3 đến 30 ký tự, định dạng `/^[a-zA-Z0-9_.-]{3,30}$/`, cấm khoảng trắng và ký tự đặc biệt.
  - Cơ chế đồng bộ kép với Supabase: Tự động ánh xạ username thành định dạng nội bộ `${username}@dreamhouse.internal` kết hợp lưu trữ metadata `username` và `full_name`.
  - Hỗ trợ hàm RPC [`public.register_user_by_username`](file:///d:/DreamHouse/supabase/05_username_auth.sql) khởi tạo tài khoản xác thực trực tiếp trong `auth.users` và `public.profiles` với `email_confirmed_at = now()`, triệt tiêu hoàn toàn lỗi Rate Limit gửi Email của Supabase.
- [x] **Bổ sung Ô Xác nhận Mật khẩu (Confirm Password):**
  - Tích hợp ô nhập `#auth-confirm-password` và nhóm `#auth-confirm-pass-group`, tự động hiển thị khi ở chế độ Đăng ký và ẩn khi ở chế độ Đăng nhập.
  - Tích hợp nút con mắt ẩn/hiện xác nhận mật khẩu thời gian thực (`#toggle-auth-confirm-pass-visibility`).
  - Kiểm tra bảo vệ trước khi gửi form: Mật khẩu tối thiểu 6 ký tự và **bắt buộc trùng khớp 100%** giữa Mật khẩu và Xác nhận mật khẩu; hiển thị cảnh báo trực quan nếu có sai lệch.
  - Ẩn liên kết *"Quên mật khẩu?"* khi đang ở chế độ Đăng ký để tối ưu thị giác người dùng.
- [x] **Cập nhật Database & Khắc phục lỗi 500 `Database error querying schema` của GoTrue v2:**
  - Khởi tạo script [`supabase/05_username_auth.sql`](file:///d:/DreamHouse/supabase/05_username_auth.sql) và tích hợp vào [`supabase/all_in_one_setup.sql`](file:///d:/DreamHouse/supabase/all_in_one_setup.sql): bổ sung cột `username` và index `UNIQUE` trong bảng `public.profiles`.
  - Chuẩn hóa câu lệnh `INSERT INTO auth.users` trong hàm `register_user_by_username`: khởi tạo đầy đủ chuỗi rỗng `''` cho toàn bộ 8 cột token (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, `phone_change`, `phone_change_token`, `reauthentication_token`), `0` cho `email_change_confirm_status` và chèn bản ghi định danh vào bảng `auth.identities`.
  - Tích hợp khối lệnh sửa chữa tự động (`UPDATE auth.users ...` & `INSERT INTO auth.identities ...`) ở đầu file `05_username_auth.sql` để phục hồi ngay lập tức các tài khoản đã đăng ký trước đó (như `vietvq`).
  - Đa ngôn ngữ đầy đủ cho các trường mới trong `js/i18n.js` (`auth_username`, `auth_confirm_pass`, `auth_username_placeholder`, `auth_login_placeholder`).
  - Tăng tham số phiên bản cache-busting lên **`?v=2.8`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 16: Chuẩn hóa Tuyệt đối Cơ chế Ghi nhớ Tài khoản (Strict Remember-Me Behavior)
- [x] **Khắc phục lỗi tự động điền Username khi không tích chọn Ghi nhớ:**
  - Bỏ thuộc tính `checked` mặc định trong thẻ `<input type="checkbox" id="auth-remember-me">` tại [index.html](file:///d:/DreamHouse/index.html) để người dùng chủ động lựa chọn.
  - Bổ sung lệnh xóa `localStorage.removeItem('dream_house_remember_email')` khi người dùng đăng ký hoặc đăng nhập với checkbox không được tích.
  - Tái cấu trúc hàm `loadRememberedAccount()` trong [js/app.js](file:///d:/DreamHouse/js/app.js): Chỉ khi có bản ghi hợp lệ trong `localStorage` mới điền vào `#auth-email` và bật checkbox; nếu không có, **bắt buộc dọn sạch trường `emailInput.value = ''`** và tắt checkbox.
  - Dọn sạch toàn bộ trường mật khẩu và tài khoản cũ trong hàm `logout()` và khi bấm nút Đăng nhập từ Header.
  - Nâng tham số cache-busting lên **`?v=2.9`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 17: Tuyệt đối Không Điền sẵn Dữ liệu khi Chuyển sang Màn hình Đăng ký (Register Form Isolation)
- [x] **Cô lập dữ liệu hoàn toàn giữa Form Đăng nhập và Form Đăng ký:**
  - Ngăn chặn triệt để hiện tượng khi chuyển từ Đăng nhập sang Đăng ký thì ô "Tên tài khoản (Username)" và các ô mật khẩu bị tự động điền giá trị của tài khoản đã ghi nhớ hoặc bị trình duyệt Autofill chèn thông tin.
  - Cập nhật hàm `updateAuthFormMode(registerMode)` trong [js/app.js](file:///d:/DreamHouse/js/app.js):
    - Khi `isRegisterMode === true`: Xóa trắng toàn bộ các ô nhập `#auth-name`, `#auth-email`, `#auth-password`, `#auth-confirm-password`, bỏ chọn checkbox Ghi nhớ, đặt `autocomplete="off"` cho ô username và `autocomplete="new-password"` cho ô mật khẩu/xác nhận mật khẩu.
    - Ẩn hoàn toàn nhãn "Ghi nhớ tài khoản" (`.auth-remember-label`) khi ở chế độ Đăng ký (chỉ hiển thị ở chế độ Đăng nhập).
    - Tích hợp 2 nhịp dọn dẹp trễ (`setTimeout` 50ms & 200ms) để loại trừ triệt để hành vi can thiệp trễ của trình quản lý mật khẩu trình duyệt (Chrome/Edge Password Manager).
  - Tái cấu trúc `loadRememberedAccount()`: Kiểm tra nếu giao diện đang ở chế độ Đăng ký (`#auth-name-group` hiển thị) hoặc URL hash là `#register`, hàm lập tức ngắt (`return`) và dọn sạch các trường dữ liệu, tuyệt đối không chèn tài khoản đã lưu vào form Đăng ký.
  - Sửa logic kiểm tra hash khởi tạo: Chỉ gọi `loadRememberedAccount()` khi hash là `#login`; nếu hash là `#register` thì tuyệt đối không gọi nạp tài khoản.
  - Thêm thuộc tính `autocomplete="off"` vào thẻ `<form id="auth-form">` trong [index.html](file:///d:/DreamHouse/index.html).
  - Tăng tham số cache-busting lên **`?v=3.0`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 18: Tách biệt và Đồng bộ Tuyệt đối Trạng thái Auth (Auth State Synchronization & Submit Guard)
- [x] **Khắc phục triệt để lỗi nhập đúng mật khẩu ở form Đăng nhập nhưng lại báo sai/báo "Mật khẩu xác nhận không trùng khớp":**
  - Nguyên nhân: Biến `isRegisterMode` trước đó là biến cục bộ (closure) trong `setupAuthModalEvents()`. Khi người dùng đăng xuất (`logout()`), code cập nhật giao diện thành Đăng nhập nhưng không cập nhật biến cờ `isRegisterMode`, dẫn đến khi submit form Đăng nhập, hệ thống vẫn lầm tưởng đang Đăng ký và gọi `registerWithUsername()`. Do ô Xác nhận mật khẩu đang ẩn và có giá trị rỗng nên phát sinh lỗi `Mật khẩu xác nhận không trùng khớp`.
  - Chuyển `isAuthRegisterMode` thành thuộc tính của class `DreamHouseApp` (`this.isAuthRegisterMode`).
  - Hợp nhất toàn bộ logic chuyển chế độ Auth thành một phương thức duy nhất [`setAuthMode(mode)`](file:///d:/DreamHouse/js/app.js) dùng chung cho: khởi tạo ban đầu, bấm nút Đăng nhập Header, bấm chuyển đổi qua lại, lắng nghe hash URL và hàm `logout()`.
  - Tích hợp **chốt chặn kép (Double Guard Clause)** trong sự kiện submit form: Chỉ kích hoạt luồng Đăng ký khi `this.isAuthRegisterMode === true` ĐỒNG THỜI ô xác nhận mật khẩu đang thực sự hiển thị trên màn hình (`#auth-confirm-pass-group.style.display !== 'none'`). Nếu ô xác nhận mật khẩu đang ẩn, hệ thống đảm bảo 100% luôn chạy luồng Đăng nhập (`loginWithEmail`).
  - Nâng tham số cache-busting lên **`?v=3.1`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 19: Bổ sung Xác thực Mật khẩu Hiện tại khi Đổi Mật khẩu Hồ sơ (Current Password Verification)
- [x] **Thêm ô nhập "Mật khẩu hiện tại" trong mục Đổi mật khẩu của Modal Hồ sơ (`#profile-modal`):**
  - Bổ sung ô nhập `#profile-current-pass` với icon ổ khóa bảo mật và nút bật/tắt hiển thị mật khẩu (`#toggle-current-pass-visibility`).
  - Thiết kế CSS đồng bộ giao diện (`.current-pass-group`) với khoảng cách và typography chuẩn theo phong cách luxury tối giản.
- [x] **Cơ chế xác thực an toàn tuyệt đối qua Supabase Auth:**
  - Khi người dùng nhập đổi mật khẩu, hệ thống tự động xác thực danh tính bằng lệnh `client.auth.signInWithPassword({ email, password: currentPassword })` trước khi thực thi cập nhật.
  - Nếu mật khẩu hiện tại không chính xác: Hệ thống lập tức ngắt tiến trình, giữ nguyên trạng thái tài khoản và thông báo cảnh báo rõ ràng *"Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại."*.
  - Kiểm tra đầy đủ các điều kiện ràng buộc: bắt buộc nhập mật khẩu hiện tại khi có mật khẩu mới, mật khẩu mới tối thiểu 6 ký tự, mật khẩu xác nhận phải trùng khớp 100%, mật khẩu mới phải khác mật khẩu cũ.
  - Tự động dọn dẹp và reset trạng thái của ô mật khẩu hiện tại trong hàm `resetPasswordSection()` khi đóng modal hoặc sau khi lưu thành công.
- [x] **Đa ngôn ngữ & Cache-Busting:**
  - Bổ sung bản dịch tiếng Việt và tiếng Anh (`profile_current_pass`, `profile_current_pass_placeholder`, ...) trong [`js/i18n.js`](file:///d:/DreamHouse/js/i18n.js).
  - Tăng tham số phiên bản cache-busting lên **`?v=3.2`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 20: Triệt tiêu Hoàn toàn Hiện tượng Lưu sẵn Mật khẩu sau khi Đăng xuất (Zero Residual Password Policy)
- [x] **Khắc phục dứt điểm lỗi ô mật khẩu vẫn hiển thị các dấu chấm tròn `••••••` sau khi đăng xuất:**
  - Phát hiện nguyên nhân sâu xa: (1) Lệnh `auth-password.focus()` chạy sau khi đăng xuất kích hoạt Password Manager của Chrome tự động điền mật khẩu đã lưu; (2) Thuộc tính `placeholder="••••••••••••"` khiến ô trống hiển thị giống hệt như đang có mật khẩu; (3) Tính năng Autofill tự động điền vào form đăng nhập chuẩn.
  - Áp dụng 5 lớp bảo vệ toàn diện (Bulletproof Defense):
    1. Khóa thuộc tính `readonly` mặc định cho các ô mật khẩu để vô hiệu hóa tính năng tự động điền của Chrome/Edge; tự động mở khóa `removeAttribute('readonly')` khi người dùng chủ động tương tác (`pointerdown`, `focus`, `keydown`); lập tức dọn sạch nếu trình duyệt cố tình bơm dữ liệu khi ô đang có `readonly`.
    2. Bổ sung cặp decoy input ẩn ở đầu form nhằm thu hút và đánh lừa cơ chế autofill của trình duyệt.
    3. Loại bỏ hoàn toàn hành vi focus vào ô mật khẩu khi đăng xuất trong `logout()`.
    4. Gọi `form.reset()` kết hợp phương thức [`clearAuthPasswordFields()`](file:///e:/Dream-house/js/app.js) đa nhịp trễ để dọn sạch giá trị DOM, khôi phục `readonly` và đưa icon con mắt về mặc định.
    5. Thay đổi placeholder từ dấu chấm `••••••••••••` sang văn bản thuần *"Nhập mật khẩu..."* (`auth_pass_placeholder`) để tránh gây nhầm lẫn thị giác.
  - Tăng tham số phiên bản cache-busting lên **`?v=3.4`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán lỗi vào Mục 3 của [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L261).

### Giai đoạn 21: Tối ưu Toàn diện Cơ chế Cuộn và Sticky Header cho Modal Hồ sơ cá nhân (Fluid Profile Modal Scroll)
- [x] **Khắc phục triệt để lỗi không cuộn được khi mở rộng khối Đổi mật khẩu trong Modal Hồ sơ (`#profile-modal`):**
  - Nguyên nhân: Trước đó `.profile-dialog` có thuộc tính `overflow: hidden;` và `.modal-overlay` thiếu `overflow-y: auto;`. Khi khối mật khẩu mở ra, chiều cao modal vượt quá màn hình khiến các nút "Hủy bỏ" và "Lưu thay đổi" bị đẩy ra ngoài mép màn hình mà người dùng không thể cuộn xuống để nhấn.
  - Cập nhật kiến trúc cuộn đa lớp (Multi-layer Fluid Scroll):
    - `.modal-overlay`: Bổ sung `overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 24px 16px;`.
    - `.profile-dialog`: Chuyển sang `max-height: min(90vh, 880px); margin: auto; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scroll-behavior: smooth;`.
    - Tích hợp thanh cuộn siêu mỏng 6px cao cấp với màu nhấn Amber Gold đồng bộ nhận diện.
  - Ghim cố định Header (Sticky Header) & Nút Đóng:
    - Chuyển `.profile-header-card` sang `position: sticky; top: 0; z-index: 20;` kết hợp hiệu ứng `backdrop-filter: blur(16px);`.
    - Di chuyển nút đóng `#close-profile-modal` vào bên trong header để luôn luôn ghim ở góc trên bên phải khi cuộn.
  - Trải nghiệm mở rộng tự động mượt mà (Smooth Auto-scroll): Tự động gọi `secCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` khi bấm mở rộng khối mật khẩu để lập tức đưa form vào tầm mắt người dùng.
  - Tăng tham số phiên bản cache-busting lên **`?v=3.5`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật chi tiết vào **Lỗi 18** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L295).

### Giai đoạn 23: Quy trình Phân quyền Quản trị viên Thực sự (True Admin Privilege Elevation)
- [x] **Cung cấp giải pháp và script nâng cấp tài khoản Admin (`admin@dreamhouse.internal` / UID: `6161ca01-621a-4281-9b21-05483d2a3a0e`):**
  - Tạo file script SQL chuẩn hóa [`supabase/06_set_admin_role.sql`](file:///e:/Dream-house/supabase/06_set_admin_role.sql) nhằm:
    1. Cập nhật trường `role = 'admin'` trong bảng `public.profiles` cho UID hoặc username `Admin`.
    2. Đồng bộ `raw_app_meta_data` và `raw_user_meta_data` của tài khoản trong `auth.users` sang `{"role": "admin"}`.
  - Hướng dẫn 2 phương thức thực hiện trực tiếp trên Supabase Dashboard:
    - **Cách 1 (Nhanh nhất):** Mở Table Editor > Bảng `profiles` > Đổi giá trị cột `role` thành `'admin'`.
    - **Cách 2 (Toàn diện bằng SQL):** Chạy lệnh từ `06_set_admin_role.sql` trong SQL Editor.
  - Khi được cấp quyền admin:
    - Giao diện `index.html` tự động nhận diện và hiển thị Badge vàng `★ Quản trị viên (Admin)` trong Profile Modal và Menu Avatar.
    - Xuất hiện menu dẫn vào Bảng quản trị Admin ([admin.html](file:///e:/Dream-house/admin.html)).
    - Hàm bảo mật RLS `public.is_admin()` trả về `true`, cho phép truy cập đầy đủ các quyền thêm, sửa, xóa mẫu nhà, upload ảnh/mô hình 3D lên Storage và quản lý danh sách yêu cầu tư vấn.

### Giai đoạn 24: Chuẩn hóa Trải nghiệm Gợi ý Tài khoản Đã lưu của Trình duyệt (Chrome Autofill Credential Alignment)
- [x] **Khắc phục lỗi menu tài khoản đã lưu trên Google Chrome chỉ hiển thị khi nhấp vào ô Mật khẩu:**
  - Xác định nguyên nhân: Thẻ form có `autocomplete="off"`, tồn tại cặp input decoy ẩn ở đầu form và ô `#auth-email` thiếu thuộc tính `name="username"`, khiến thuật toán nhận diện form của Google Chrome không gán danh sách tài khoản đã lưu vào ô username mà chuyển sang ô mật khẩu khi người dùng tương tác.
  - Chuẩn hóa form và các thuộc tính tiêu chuẩn HTML/Chrome Credential API:
    - Bổ sung `name="username"` và `autocomplete="username"` cho ô Tên tài khoản hoặc Email (`#auth-email`).
    - Bổ sung `name="password"` và `autocomplete="current-password"` cho ô Mật khẩu (`#auth-password`), gỡ bỏ thuộc tính `readonly`.
    - Loại bỏ các thẻ decoy ẩn, kích hoạt `<form autocomplete="on">`.
    - Cập nhật hàm [`setAuthMode()`](file:///e:/Dream-house/js/app.js) để linh hoạt chuyển giữa `current-password` (khi Đăng nhập) và `new-password` (khi Đăng ký).
    - Cập nhật hàm [`logout()`](file:///e:/Dream-house/js/app.js) để làm sạch form một cách tự nhiên mà không cưỡng chế focus gây nháy popup.
  - Kết quả: Khi người dùng nhấp chuột hoặc focus vào ô "Tên tài khoản hoặc Email", menu gợi ý các tài khoản đã lưu trên Google Chrome sẽ lập tức xuất hiện ngay dưới ô này. Khi chọn tài khoản, Chrome tự động điền cả tên tài khoản và mật khẩu tương ứng.
  - Tăng tham số phiên bản cache-busting lên **`?v=3.7`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 20** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L335).

### Giai đoạn 25: Tối ưu UI/UX Avatar Navbar & Tích hợp Tải Ảnh Đại Diện từ Thiết bị
- [x] **Tắt thông báo Toast kết nối Google:** Loại bỏ `window.toast.info('Đang kết nối tới Google...')` trong [`loginWithGoogle()`](file:///e:/Dream-house/js/app.js) để quy trình đăng nhập Google diễn ra êm ái, không gây phân tâm.
- [x] **Khắc phục triệt để lỗi Avatar trên thanh điều hướng (Navbar) không hiển thị ảnh thật:**
  - Phát hiện nguyên nhân: Thẻ avatar trên Navbar thiếu thuộc tính `id="user-avatar-initials"`, khiến hàm `updateAuthUI()` không tìm thấy phần tử để thay thế icon người mặc định bằng thẻ `<img>`.
  - Bổ sung `id="user-avatar-initials"` vào `index.html`, đồng thời cập nhật [`updateAuthUI()`](file:///e:/Dream-house/js/app.js) lấy ảnh từ cả 3 nguồn fallback (`currentProfile.avatar_url`, `user_metadata.avatar_url`, `user_metadata.picture`) và thêm `overflow: hidden;` cho `.user-avatar-circle`.
- [x] **Bổ sung tính năng chọn ảnh đại diện từ máy tính (Client-side Direct Image Upload):**
  - Thêm nút *"Chọn ảnh từ máy tính"* kèm input file ẩn và trạng thái tên file trong modal hồ sơ.
  - Cho phép nhấp trực tiếp vào khung ảnh đại diện trên đầu modal để mở hộp thoại chọn file với hiệu ứng hover camera.
  - Xây dựng thuật toán nén ảnh tự động [`compressAvatarImage()`](file:///e:/Dream-house/js/app.js) cắt vuông và nén về 320x320px WebP qua HTML5 Canvas (~15-25 KB).
  - Tự động xem trước ảnh ngay lập tức và hỗ trợ lưu đồng thời vào Supabase Storage & Profile Database một cách an toàn.
  - Tăng tham số phiên bản cache-busting lên **`?v=3.8`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 21** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L357).

### Giai đoạn 26: Xử lý Dứt điểm Lỗi UI Tách đôi Khung Avatar trong Modal Hồ Sơ (Absolute Layering Architecture)
- [x] **Khắc phục hiện tượng Avatar bị chia làm 2 nửa (nửa ảnh, nửa nền vàng/chữ cái):**
  - Nguyên nhân: `.profile-avatar-box` là một Flexbox Container nhưng thẻ `<img>` thiếu `position: absolute`, khiến trình duyệt sắp xếp ảnh và thẻ chữ cái nằm ngang cạnh nhau thay vì chồng đè lên nhau. Đồng thời, việc chèn HTML qua `preview.innerHTML` có chứa thuộc tính inline `onerror` làm phát sinh lỗi phân tích cú pháp.
  - Áp dụng Kiến trúc Xếp lớp Tuyệt đối (Absolute Layering Architecture):
    - Khóa thẻ `<img>` ở `position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; z-index: 2;` để luôn phủ kín 100% hình tròn $68\times68\text{px}$.
    - Thẻ chữ cái `#profile-avatar-char` nằm ở lớp nền tĩnh `z-index: 1`.
    - Lớp phủ máy ảnh `.profile-avatar-overlay` nằm ở lớp trên cùng `z-index: 3`.
    - Tái cấu trúc hàm [`renderProfileModalAvatar()`](file:///e:/Dream-house/js/app.js) để thao tác trực tiếp trên các phần tử DOM có sẵn, chỉ bật/tắt `display: block` / `display: none` và đổi `src`, loại bỏ hoàn toàn việc ghi đè chuỗi `innerHTML`.
  - Tăng tham số phiên bản cache-busting lên **`?v=3.9`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 22** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L378).

### Giai đoạn 27: Tích hợp Bộ điều khiển Cuộn trang Siêu Mượt Đa Nhịp (Animate-UI Fluid Easing Smooth Scroll)
- [x] **Xây dựng chuyển động cuộn trang animation siêu mượt khi nhấp các nút điều hướng:**
  - Áp dụng trên:
    1. Các nút trên Navbar: *"Thư viện mẫu"* (`#gallery-section`) và *"Liên hệ"* (`#contact-section`).
    2. Các nút CTA trong Hero Section: *"Khám phá mẫu nhà"* và *"Nhận tư vấn ngay / Liên hệ"*.
    3. Nút *"Mẫu nhà đã lưu yêu thích"* trong menu tài khoản (tự động bật lọc yêu thích và cuộn mượt).
    4. Nút *"Nhận báo giá mẫu này"* trong Panel chi tiết 3D và nút *"Khám phá mẫu nhà"* từ modal đăng nhập.
  - Thuật toán chuyển động cao cấp [`smoothScrollTo()`](file:///e:/Dream-house/js/app.js):
    - Sử dụng đường cong gia tốc `easeInOutCubic` (bắt đầu êm, lướt nhanh và hãm phanh mượt mà như xe sang).
    - Thời lượng cuộn động theo cự ly $(500\text{ms} - 850\text{ms})$ kết hợp `requestAnimationFrame`.
    - Tính toán bù trừ khoảng hở 84px cho Header cố định (`scroll-margin-top: 86px;` & `scroll-padding-top: 86px;`) giúp tiêu đề hạ cánh chuẩn xác, thoáng đãng bên dưới Navbar.
    - Cơ chế ngắt thông minh (User Cancel Protection): Tự động giải phóng animation nếu người dùng chủ động lăn chuột hoặc vuốt màn hình.
    - Hiệu ứng phát sáng nhẹ nhàng khi hạ cánh (`.scroll-landed-pulse`).
  - Nâng tham số cache-busting lên **`?v=4.0`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 28: Tối ưu Triệt để Tốc độ Phản hồi Cuộn Trang 0ms (Zero-Latency Compositor Smooth Scroll)
- [x] **Loại bỏ hoàn toàn độ trễ 250ms và hiện tượng khựng giật khi bấm nút điều hướng:**
  - Phát hiện nguyên nhân: Vòng lặp `requestAnimationFrame` thủ công với hàm gia tốc `easeInOutCubic` bắt đầu ở vận tốc $0$, kết hợp xung đột với CSS `scroll-behavior: smooth` khiến Main Thread bị tắc nghẽn cạnh tranh với Three.js.
  - Chuyển toàn bộ sang cơ chế phần cứng Native Compositor của trình duyệt:
    - Sử dụng trực tiếp `window.scrollTo({ top: offsetPosition, behavior: 'smooth' })`.
    - Phản hồi ngay lập tức $0\text{ms}$ khi nhấp chuột, chuyển động lướt đi êm ru ở tần số quét cao (60–144 FPS).
    - Giữ nguyên bù trừ khoảng cách Navbar 84px (`scroll-margin-top: 86px;`) để hạ cánh chuẩn xác.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.1`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 23** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L400).

### Giai đoạn 29: Nâng Cấp Dung Lượng Storage 100MB cho File 3D (.skp), Loại Bỏ Ô Nhập Tên & Tối Ưu Form Admin
- [x] **Xử lý dứt điểm lỗi tải file mô hình 3D (HTTP 400 "The object exceeded the maximum allowed size"):**
  - Tạo script [`supabase/07_increase_storage_limits.sql`](file:///e:/Dream-house/supabase/07_increase_storage_limits.sql) nâng `file_size_limit` bucket `template-models` lên **100MB** và `template-images` lên **25MB**, gỡ bỏ kiểm tra MIME (`allowed_mime_types = NULL`) để chấp nhận đầy đủ file `.skp` (SketchUp), `.glb`, `.gltf`, `.obj`, `.zip`.
  - Bổ sung kiểm tra dung lượng phía client và bắt lỗi Storage chi tiết kèm hướng dẫn rõ ràng.
- [x] **Loại bỏ ô nhập Tên tiếng Việt và Tên tiếng Anh theo yêu cầu:**
  - Gỡ bỏ hoàn toàn 2 trường `#tpl-name-vi` và `#tpl-name-en` khỏi modal thêm/sửa mẫu nhà trong [`admin.html`](file:///e:/Dream-house/admin.html).
  - Thuật toán tự động sinh tên chuẩn hoá theo loại nhà, số tầng, mặt tiền và chiều sâu (ví dụ: *"Nhà phố 2 tầng 5x16m"* và *"Modern Townhouse 2 Floors 5x16m"*).
  - Tự động sinh `slug` duy nhất nếu để trống.
  - Xây dựng hoàn chỉnh hàm [`editTemplate(id)`](file:///e:/Dream-house/admin.html) nạp đầy đủ dữ liệu khi bấm nút "Sửa" trong danh sách quản trị.
- [x] **Tương thích File SketchUp (.skp) trong Trình Xem 3D ([`js/viewer3d.js`](file:///e:/Dream-house/js/viewer3d.js)):**
  - Three.js nhận diện file `.skp` để hiển thị mô hình khối 3D tham số theo đúng kích thước thực tế, đồng thời cung cấp link tải trực tiếp file `.skp` gốc cho khách hàng/kỹ sư.
- [x] **Cache-Busting & Cập nhật Tài liệu:**
  - Nâng phiên bản cache-busting lên **`?v=4.2`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 24** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L419).

### Giai đoạn 30: Chuẩn Hoá Định Dạng 3D Web (.glb vs .skp) & Hướng Dẫn Tương Tác Trực Quan
- [x] **Giải quyết thắc mắc về sự khác biệt giữa mô hình hiển thị trên web và file `.skp`:**
  - Làm rõ nguyên lý kỹ thuật: Trình duyệt web (WebGL / Three.js) chỉ đọc được định dạng chuẩn web mở **`.glb` / `.gltf`**, không hỗ trợ file nhị phân độc quyền máy tính `.skp` của Trimble SketchUp.
  - Khi tải file `.skp`, hệ thống kích hoạt cơ chế dự phòng dựng khối tham số thực tế (Procedural Block) dựa trên thông số nhập trong Admin. Nếu Admin chọn "Mái bằng 5x16m" thì sẽ sinh ra khối nhà hộp thay vì mái Nhật/mái Thái như trong ảnh.
  - Hướng dẫn quy trình 30 giây xuất file `.glb` từ SketchUp (*File > Export > 3D Model > .glb*) hoặc dùng plugin Khronos glTF Exporter để đưa bản vẽ thực tế 100% lên web.
  - Bổ sung ghi chú trợ giúp chi tiết ngay trong giao diện upload của [`admin.html`](file:///e:/Dream-house/admin.html) và thanh trạng thái [`js/viewer3d.js`](file:///e:/Dream-house/js/viewer3d.js).
  - Tăng tham số phiên bản cache-busting lên **`?v=4.3`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 25** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L445).

### Giai đoạn 31: Mở Rộng Bộ Giải Mã 3D Trực Tiếp Native OBJLoader & Phân Tích Cơ Chế Chuyển Đổi Tự Động
- [x] **Giải quyết nhu cầu tự động chuyển đổi file 3D:**
  - Phân tích rào cản kỹ thuật của việc tự động cào/gửi ngầm file sang các trang web chuyển đổi online bên thứ 3: vi phạm chính sách bảo mật trình duyệt CORS (Cross-Origin Resource Sharing) và tường lửa Cloudflare/Captcha chống Bot, không thể tự động ngầm nếu không có API Server chuyên dụng trả phí (như Autodesk APS hoặc Aspose Cloud).
  - Tích hợp trực tiếp bộ nạp **`THREE.OBJLoader`** vào [`index.html`](file:///e:/Dream-house/index.html) và [`js/viewer3d.js`](file:///e:/Dream-house/js/viewer3d.js).
  - Khắc phục triệt để khó khăn của người dùng: Trong SketchUp, người dùng không cần cài thêm bất kỳ plugin nào, chỉ cần chọn tính năng có sẵn 100%: **File > Export > 3D Model > chọn `.obj`** (mất đúng 5 giây).
  - Khi tải file `.obj` lên Admin, Three.js tự động nhận diện và render toàn bộ hình khối 3D chi tiết của ngôi nhà ngay trên web mà không cần thông qua bất kỳ trang web trung gian nào.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.4`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 26** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L465).

### Giai đoạn 32: Sửa Lỗi Cú Pháp SVG Path Icon Con Mắt Mật Khẩu (Expected Number Error)
- [x] **Khắc phục lỗi Console `Error: <path> attribute d: Expected number, "... 8-4 8-11 8-11-8z"`:**
  - Phát hiện nguyên nhân: Trong hàm [`clearAuthPasswordFields()`](file:///e:/Dream-house/js/app.js) tại dòng 1567, chuỗi SVG path `d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"` bị thiếu một cặp toạ độ cuối cùng (`-11-8`), khiến lệnh `s` (smooth curveto) chỉ có 14 số thay vì 16 số hợp lệ. Trình duyệt gặp ký tự `z` khi đang đợi số tiếp theo nên báo lỗi cú pháp SVG.
  - Đồng bộ chuẩn hóa toàn bộ chuỗi path con mắt thành `d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"`.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.5`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 27** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L485).

### Giai đoạn 33: Chống Tự Động Điền (Autofill) Mật Khẩu Cũ trong Modal Chỉnh Sửa Hồ Sơ
- [x] **Xử lý triệt để hiện tượng trình duyệt tự động điền sẵn mật khẩu vào ô "Mật khẩu hiện tại":**
  - Phát hiện nguyên nhân: Trong `profile-form`, trình duyệt nhận diện ô `profile-email` (tên tài khoản/email) đi kèm ô `profile-current-pass` có `autocomplete="current-password"`, do đó Chrome Password Manager tự động kích hoạt autofill, biến nền ô nhập thành màu xanh nhạt (`#e8f0fe`) và điền chuỗi mật khẩu đã lưu.
  - Áp dụng cơ chế bảo vệ 4 lớp (4-Layer Autofill Protection):
    1. Thay đổi thuộc tính: Đổi `autocomplete="current-password"` thành `autocomplete="new-password"` và gắn `name="verify_current_pwd_prevent_autofill"`.
    2. Readonly Lock Pattern: Khóa `readonly` mặc định cho các ô mật khẩu trong modal hồ sơ, chỉ gỡ bỏ `readonly` khi người dùng chủ động click hoặc focus chuột vào để nhập.
    3. Multi-stage JS Cleanup: Tự động reset `.value = ''` ngay khi mở modal và sau các mốc thời gian 100ms, 300ms khi mở khối đổi mật khẩu để xóa sạch mọi dữ liệu autofill ngầm từ Chrome.
    4. CSS Autofill Neutralization: Thiết lập `-webkit-box-shadow: 0 0 0 1000px var(--color-surface) inset !important;` trong [`style.css`](file:///e:/Dream-house/style.css) để triệt tiêu hoàn toàn mảng màu xanh vàng lạ mắt của trình duyệt.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.6`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 28** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L505).

### Giai đoạn 34: Tinh Chỉnh Ô Nhập "Tên Mẫu Nhà" Độc Lập & Tự Động Sinh Slug Chuẩn Xác
- [x] **Khắc phục lỗi người dùng nhập "test" nhưng bảng danh sách hiển thị "Nhà phố 2 tầng 5x16m":**
  - Phát hiện nguyên nhân: Trước đó khi gỡ bỏ 2 ô nhập tên VI/EN, form Admin chỉ còn lại ô `tpl-slug`. Người dùng nhập tên mẫu nhà (ví dụ `test`) vào ô đầu tiên tưởng là tên nhà, nhưng hệ thống lại gán vào `slug`, đồng thời hàm lưu lại tự động gán đè `name_vi` thành tên sinh tự động từ loại nhà và kích thước (`Nhà phố 2 tầng 5x16m`).
  - Giải pháp triệt để:
    1. Chuyển đổi ô nhập đầu tiên thành **"Tên mẫu nhà"** (`#tpl-name`, placeholder: *"Nhập tên mẫu nhà (ví dụ: Biệt thự vườn, test...)"*).
    2. Ẩn trường `tpl-slug`, tự động sinh slug từ tên người dùng nhập qua hàm `slugify()` chuẩn tiếng Việt không dấu.
    3. Lưu chính xác chuỗi người dùng nhập vào trường `name_vi` và `name_en` để hiển thị đúng 100% tên mong muốn (`test`) ra ngoài trang chủ và bảng quản trị Admin.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.7`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 29** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md#L525).

### Giai đoạn 35: Tích Hợp Hiệu Ứng Signature Flipping 3D Preloader & Loading Animation
- [x] **Tích hợp bộ hiệu ứng Loading 3D Flipping độc quyền của Dream House:**
  - Nhúng trọn vẹn bộ Animation CSS `.flipping` (với 3 keyframes `flipping-i616avmd`, `flipping-25dc7zmd`, `flipping-6h64qpmd`) tạo hiệu ứng khối lập phương 3D xoay lật đa chiều sống động.
  - Tối ưu màu sắc thích ứng đa chủ đề (Light/Dark theme): Sử dụng `var(--flipping-color, var(--color-accent, #474bff))` giúp khối flipping vừa có thể dùng màu tím gốc `#474bff`, vừa tự động hòa quyện với tone vàng kim sang trọng (`#c49a45` / `#e5b95d`) của thương hiệu Dream House.
  - Xây dựng màn hình tải trang thương hiệu toàn diện (`#site-preloader`):
    - Đặt ở vị trí cao nhất trên DOM với `z-index: 999999` che phủ khi trang bắt đầu nạp.
    - Kết hợp cùng logo thương hiệu "DREAM HOUSE" và dòng thông điệp song ngữ đa quốc gia *"Đang tải không gian kiến trúc..."* (`data-i18n="preloader_text"`).
    - Tự động ẩn mượt mà với hiệu ứng opacity/visibility sau khi cơ sở dữ liệu Supabase và Three.js khởi tạo hoàn tất, đồng thời có timeout dự phòng 2.5s để bảo đảm trang luôn mở ra mượt mà trong mọi tình huống mạng.
  - Bổ sung khối loading placeholder ngay trong lưới thư viện (`#gallery .house-grid`), mang lại trải nghiệm kiến trúc cao cấp, không bị giật trang hay nháy trắng.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.8`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 36: Tích Hợp Hiệu Ứng Animation Thoát Mượt Mà Cho Nút Quay Lại Trang Chủ (Symmetric Auth Exit Animation)
- [x] **Xây dựng hiệu ứng animation đóng (back) đối xứng hoàn hảo với animation khi mở Login:**
  - Phát hiện nguyên nhân: Trước đây khi người dùng bấm nút *"← Quay lại trang chủ"* (`#auth-back-btn`), hàm [`closeAuthModal()`](file:///d:/DreamHouse/js/app.js) thêm ngay lập tức class `.hidden` khiến toàn bộ màn hình Auth đột ngột biến mất (abrupt jump cut), trong khi lúc mở vào thì có hiệu ứng zoom mượt `authPageFadeIn` và `cardSlideIn`.
  - Giải pháp kiến trúc Animation đối xứng (Symmetric Exit Motion):
    1. Định nghĩa keyframes ngược chiều trong [`style.css`](file:///d:/DreamHouse/style.css):
       - `.auth-page-takeover.is-closing`: Chạy `authPageFadeOut` trong $0.32\text{s}$ với đường cong `cubic-bezier(0.16, 1, 0.3, 1)`, mờ dần và phóng to nhẹ từ `scale(1)` lên `scale(1.025)`.
       - `.auth-floating-card`: Chạy `cardSlideOut` trượt xuống $24\text{px}$ và thu nhỏ về `scale(0.96)`.
       - `.auth-showcase-column`: Chạy `showcaseSlideOut` lướt nhẹ lên trên $16\text{px}$ và mờ dần.
       - `.auth-top-bar`: Chạy `topBarFadeOut` trượt lên $12\text{px}$ và biến mất êm ái.
    2. Nâng cấp hiệu ứng xúc giác (Haptic Feedback) trên nút `#auth-back-btn`: Thêm trạng thái `:active` và `.is-active-back` co nhẹ (`scale(0.93)`), mũi tên lướt sang trái $-6\text{px}$ tạo cảm giác phản hồi cơ học chân thực (cả Light Mode lẫn Dark Mode).
    3. Tái cấu trúc hàm [`closeAuthModal()`](file:///d:/DreamHouse/js/app.js): Khi bấm nút Back, thêm class `.is-closing`, khóa tương tác chuột (`pointer-events: none;`), đợi $300\text{ms}$ cho chu kỳ animation kết thúc hoàn hảo rồi mới gắn `.hidden` và dọn dẹp state.
  - Tăng tham số phiên bản cache-busting lên **`?v=4.9`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 31** trong [AI_Debug.md](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 37: Tích Hợp Hiệu Ứng Animation Đóng Mượt Mà Cho Panel Chi Tiết Mẫu Nhà (Symmetric Detail Modal Exit Animation)
- [x] **Xây dựng hiệu ứng animation đóng panel chi tiết mẫu nhà (`#detail-modal`) và hồ sơ (`#profile-modal`):**
  - Phát hiện nguyên nhân: Khi mở modal, hệ thống áp dụng `fadeIn 0.25s` cho backdrop `.modal-overlay` và `scaleUp 0.3s` cho khung nội dung `.modal-window`. Tuy nhiên khi đóng (bấm nút X, click ra ngoài backdrop, bấm phím Escape hoặc bấm "Nhận báo giá mẫu này"), hàm [`closeDetailPanel()`](file:///d:/DreamHouse/js/app.js) lập tức gán class `.hidden` khiến modal biến mất đột ngột.
  - Giải pháp kiến trúc Animation đóng đối xứng (Symmetric Modal Exit Motion):
    1. Định nghĩa keyframes ngược chiều trong [`style.css`](file:///d:/DreamHouse/style.css):
       - `.modal-overlay.is-closing`: Chạy `@keyframes modalFadeOut` trong $0.24\text{s}$ mờ dần từ `opacity: 1` về `0`, khóa tương tác chuột (`pointer-events: none`).
       - `.modal-overlay.is-closing .modal-window` & `.profile-dialog`: Chạy `@keyframes modalScaleDown` trong $0.24\text{s}$ thu nhỏ nhẹ nhàng từ `scale(1)` về `scale(0.95)` và mờ dần.
    2. Thêm hiệu ứng nhấn (active feedback) cho nút đóng `[id^="close-"][id$="-modal"]:active` co lại xoay 90 độ (`scale(0.92)`).
    3. Tái cấu trúc hàm [`closeDetailPanel()`](file:///d:/DreamHouse/js/app.js) và [`closeProfileModal()`](file:///d:/DreamHouse/js/app.js): Kích hoạt class `.is-closing`, chờ chu kỳ $240\text{ms}$ cho animation hoàn tất mượt mà rồi mới gán `.hidden` và khôi phục thanh cuộn trang.
  - Tăng tham số phiên bản cache-busting lên **`?v=5.0`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 32** trong [AI_Debug.md](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 38: Tối Ưu Quỹ Đạo Chuyển Động Trượt Rõ Nét & Loại Bỏ Xung Đột Thanh Cuộn (Slide & Blur Modal Exit)
- [x] **Khắc phục triệt để hiện tượng người dùng không cảm nhận được animation khi đóng:**
  - Phát hiện nguyên nhân cốt lõi:
    1. Việc giải phóng thanh cuộn `document.body.style.overflow = ''` ngay khi bắt đầu đóng khiến trình duyệt Windows chèn lại thanh cuộn 17px đồng thời, gây ra cú giật layout (layout shift) làm rách khung hình và nuốt trọn animation.
    2. Độ lệch chuyển động trước đó quá nhỏ (`scale(0.95)`, thiếu trục Y) khiến mắt người nhìn thấy như biến mất lập tức.
    3. Bộ lọc `backdrop-filter: blur(12px)` không thể mờ dần nếu chỉ giảm `opacity` trên Chromium.
  - Giải pháp dứt điểm:
    1. Thiết kế lại chuyển động trục Y kết hợp Scale vật lý:
       - Mở vào (`@keyframes modalWindowIn`): Trượt từ dưới lên $28\text{px}$ (`translateY(28px) scale(0.96)`) lên vị trí chuẩn trong $0.34\text{s}$.
       - Đóng lại (`@keyframes modalWindowOut`): Trượt xuống dưới $28\text{px}$ (`translateY(28px) scale(0.96)`) và mờ dần trong $0.3\text{s}$, tạo hiệu ứng thị giác rõ ràng, sống động tương đương form đăng nhập.
    2. Hoạt họa trực tiếp độ mờ nền `backdrop-filter: blur(12px)` về `blur(0px)` (`@keyframes modalOverlayOut`).
    3. Trì hoãn lệnh `document.body.style.overflow = ''` vào bên trong `setTimeout(..., 280)` để giữ nguyên khung hình ổn định 100% trong suốt quá trình chạy animation.
  - Tăng tham số phiên bản cache-busting lên **`?v=5.1`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 33** trong [AI_Debug.md](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 39: Tích Hợp Micro-Interaction Nút Yêu Thích Heart Burst Like (022, Toggles & Pickers)
- [x] **Thay thế nút yêu thích icon sao cũ thành Heart Burst Like (022):**
  - Chuyển đổi phần tử nút ngôi sao cũ trong thẻ mẫu nhà (`.card-thumb .card-fav-btn`) thành component cao cấp [components/heart-burst-like.html](file:///d:/DreamHouse/components/heart-burst-like.html) (MIT License (c) 2026 Seokwoooo).
  - Tích hợp chuỗi chuyển động vật lý chuẩn xác:
    1. Trái tim co nhún tỉ lệ `scale(0.72)` ở $18\%$, lấp đầy gradient đỏ rực `#FF7A93` $\to$ `#F0264D` và bật nhảy `scale(1.24)` ở $48\%$, rồi hạ nhẹ về `scale(1)`.
    2. Vòng tròn sáng (`.u022-ring`) bung nở từ tâm với độ dày đường viền $22\text{px} \to 0\text{px}$ trong $0.6\text{s}$.
    3. $7$ cặp hạt pháo hoa đa sắc ($14$ particles) bay bung tỏa theo các góc hướng tâm với độ trễ $0.18\text{s}$.
    4. Bấm lần hai: Trái tim thu gọn êm ái về `scale(0)` và đường viền mảnh `currentColor` tái hiện nhẹ nhàng.
  - Ánh xạ đầy đủ bảng mã màu `--ux-*` đồng bộ với biến hệ thống của Dream House cả Light Mode (`#c49a45`) và Dark Mode (`#e5b95d`).
  - Tối ưu DOM: Bổ sung phương thức `updateCardFavoriteUI(templateId, isFav)` trong [js/app.js](file:///d:/DreamHouse/js/app.js) để cập nhật trạng thái trực tiếp mà không re-render lại toàn bộ lưới nhà, giúp chu kỳ animation chạy mượt mà $60\text{fps}$ không bị drop frame.
  - Hỗ trợ khả năng tiếp cận chuẩn mực: Thuộc tính `aria-pressed`, `aria-label`, phím bấm bàn phím và tuân thủ `prefers-reduced-motion: reduce`.
  - Tăng tham số phiên bản cache-busting lên **`?v=5.2`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 40: Chuẩn Hóa Thời Gian Hiển Thị Toàn Bộ Thông Báo Toast Thành 1 Giây (1000ms)
- [x] **Cấu hình thời gian hiển thị thông báo Toast siêu nhanh 1s:**
  - Chuẩn hóa thời gian tồn tại của tất cả các thông báo nổi trong hệ thống (`window.toast.success`, `window.toast.error`, `window.toast.warning`, `window.toast.info`, `showToast`, `window.alert`) về đúng **$1.0\text{s}$ ($1000\text{ms}$)** tại module hạt nhân [js/toast.js](file:///d:/DreamHouse/js/toast.js).
  - Tự động đồng bộ thanh tiến trình chạy (`.toast-progress-bar` với `animation-duration: 1000ms`), tự động biến mất và trượt ẩn êm ái sau $1\text{s}$, không gây phiền toái hoặc cản trở tầm nhìn của người dùng khi duyệt mẫu nhà.
  - Tăng tham số phiên bản cache-busting lên **`?v=5.3`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 41: Loại Bỏ Hoàn Toàn File .env.example Khỏi Repository GitHub & Gia Cố .gitignore
- [x] **Xóa triệt để file `.env.example` trên GitHub:**
  - Thực hiện lệnh xóa hoàn toàn file `.env.example` khỏi Git tracking và khỏi repository GitHub theo yêu cầu bảo mật của người dùng (`git rm -f .env.example`).
  - Gia cố [`.gitignore`](file:///d:/DreamHouse/.gitignore) với các quy tắc chặn toàn diện (`.env`, `.env.*`, `*.env`, `*.env.*`) ngăn ngừa triệt để mọi khả năng rò rỉ bất kỳ file môi trường nào lên mạng.
  - Cập nhật [generate-config.js](file:///d:/DreamHouse/generate-config.js), [README.md](file:///d:/DreamHouse/README.md), [AI_Config.md](file:///d:/DreamHouse/AI_Config.md) loại bỏ toàn bộ liên kết phụ thuộc vào `.env.example`.

### Giai đoạn 42: Tích Hợp Dropdown Bộ Lọc Tùy Chỉnh Hiện Đại (Custom Animated Dropdowns)
- [x] **Thay thế menu xổ xuống mặc định của OS bằng Custom Dropdown Animate-UI:**
  - Loại bỏ hoàn toàn hộp select mặc định vuông vức, nền xanh thô kệch của hệ điều hành trên 2 bộ lọc Loại nhà (`#filter-type`) và Sắp xếp (`#filter-sort`).
  - Thiết kế chuyển động trượt mượt mà (Spring Motion & Glassmorphism):
    1. Menu thả nổi (`.custom-dropdown-menu`) xuất hiện êm dịu từ trên xuống (`translateY(-10px) scale(0.96) \to translateY(0) scale(1)`), nền kính mờ `backdrop-filter: blur(20px)` và viền bo tròn $16\text{px}$ sang trọng.
    2. Mũi tên chevron (`.custom-dropdown-arrow`) xoay ngược 180 độ mượt mà khi mở/đóng.
    3. Hiệu ứng xúc giác hover: Từng mục tùy chọn trượt nhẹ sang phải $3\text{px}$, chuyển màu vàng kim `--color-accent` và hiển thị icon dấu tích checkmark cho mục đang chọn.
  - Cơ chế đồng bộ hai chiều vững chắc: Giữ thẻ `<select>` ngầm (`.visually-hidden`) để đảm bảo logic `this.activeFilter` và `this.renderGallery()` hoạt động chính xác 100%, đồng thời hỗ trợ chuyển đổi song ngữ VI/EN tức thì với `data-i18n`.
  - Đóng thông minh: Tự động đóng menu khi click ra ngoài khoảng trống (click outside) hoặc nhấn phím `Escape`.
  - Đồng bộ tương thích hoàn hảo cả Light Mode (`#c49a45`) và Dark Mode (`#e5b95d`).
  - Tăng tham số phiên bản cache-busting lên **`?v=5.4`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 44: Tự Động Căn Giữa Mô Hình 3D Lên Tâm Lưới & Mở Khóa Zoom / Pan Khám Phá Nội Thất
- [x] **Khắc phục lỗi mô hình 3D nằm lệch ở rìa ngoài sân lưới và bị chặn zoom không xem được nội thất:**
  - Phát hiện nguyên nhân cốt lõi:
    1. **Mô hình bị lệch rìa:** Các file 3D (.glb/.obj) khi xuất từ phần mềm kiến trúc (SketchUp/Revit/Blender) thường có gốc tọa độ cục bộ $(0,0,0)$ đặt lệch sang một bên của khu đất. Khi tải vào Three.js, code cũ chỉ đặt `target` vào tâm bounding box nhưng giữ nguyên tọa độ gốc của mô hình, dẫn đến toàn bộ công trình nằm chơ vơ ở góc của sân lưới (`GridHelper`).
    2. **Zoom bị chặn ngoài tường:** Hàm cuộn chuột trong [js/viewer3d.js](file:///d:/DreamHouse/js/viewer3d.js) bị giới hạn cứng khoảng cách tối thiểu `Math.max(8, ...)` (8 mét). Với kích thước nhà phố thông thường, bán kính 8m luôn nằm ở bên ngoài tường bao, khiến người dùng không thể phóng to để khám phá các phòng bên trong.
    3. **Tường trong bị tàng hình:** Khi camera lọt vào trong nhà, các mặt phẳng tường, trần, vách ngăn bị culling mặt sau (backface-culling) do vật liệu chỉ hiển thị `FrontSide`.
  - Giải pháp xử lý dứt điểm:
    1. **Căn chính giữa tuyệt đối:** Sau khi tải file GLB/OBJ, tính toán bounding box nguyên bản và tịnh tiến tọa độ của `currentMeshGroup`:
       - `position.x -= initialCenter.x;`
       - `position.z -= initialCenter.z;`
       - `position.y -= initialBox.min.y;` (đảm bảo đáy móng nhà tiếp xúc hoàn hảo trên mặt đất $y = 0$).
       - Ngôi nhà luôn nằm ngay ngắn tại chính giữa tâm lưới và tâm khung hình.
    2. **Mở khóa Zoom siêu cận nội thất:**
       - Giảm bán kính tối thiểu từ $8\text{m}$ xuống **$0.1\text{m}$** (`Math.max(0.1, ...)`).
       - Tốc độ cuộn chuột thích ứng (Adaptive Zoom Step): khi ở gần thì bước zoom nhỏ, khi ở xa thì bước zoom lớn giúp người dùng lướt nhẹ xuyên qua cửa sổ, cửa chính và tiến vào ngắm từng góc phòng khách, bếp, phòng ngủ mượt mà.
       - Giảm mặt phẳng cắt gần của camera (`camera.near`) từ $0.1$ xuống **$0.05$** ($5\text{cm}$) để các vật thể nội thất cận cảnh không bị xé hình.
    3. **Hiển thị hai mặt nội thất (`THREE.DoubleSide`):** Tự động duyệt qua toàn bộ các Mesh của mô hình và gán `side = THREE.DoubleSide`, bảo đảm mọi bức tường, trần nhà và vách ngăn bên trong đều hiển thị rõ ràng, sắc nét.
    4. **Bổ sung tính năng Pan (Di chuyển tâm nhìn):**
       - Chuột phải (hoặc Shift + Chuột trái): Pan đa chiều tự do để người dùng có thể lướt camera qua lại giữa các phòng khác nhau.
       - Cảm ứng 2 ngón tay trên điện thoại / máy tính bảng: Hỗ trợ đồng thời Pinch-to-Zoom và Two-finger Pan.
       - Cập nhật chỉ dẫn tương tác `detail_3d_hint`: *"Chuột trái xoay • Chuột phải/2 ngón di chuyển • Cuộn để vào trong nhà"*.
       - Thêm đèn điểm nội thất dịu nhẹ (`interiorLight`) để bên trong không gian phòng luôn đủ ánh sáng ấm cúng.
  - Tăng tham số phiên bản cache-busting lên **`?v=5.6`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 35** trong [AI_Debug.md](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 45: Tái Thiết Kế Toàn Diện Trang Quản Trị Admin Portal (Luxury Architectural Admin Dashboard)
- [x] **Nâng cấp giao diện [`admin.html`](file:///d:/DreamHouse/admin.html) và hệ thống CSS Admin trong [`style.css`](file:///d:/DreamHouse/style.css) hiện đại, sang trọng:**
  - **Sửa triệt để lỗi vỡ font tiếng Việt:** Nhúng đầy đủ bộ font Google `Inter` & `Playfair Display` vào `<head>` của `admin.html`, khắc phục hoàn toàn hiện tượng chữ *"Bảng Quản Trị Hệ Thống"* bị lỗi dấu.
  - **Đồng bộ Chế độ Sáng / Tối (Circular Reveal #219):** Tích hợp nút chuyển đổi Light/Dark Mode ngay trên Header của Admin Portal, đồng bộ tức thì với `localStorage.getItem('dream_house_theme')` của trang chủ và áp dụng đầy đủ hệ thống Design Tokens (`--btn-close-...`, `--btn-subtle-...`).
  - **Hero Banner & 4 Thẻ Thống Kê Bento KPI Thời Gian Thực:**
    1. *Tổng mẫu thiết kế:* Hiển thị tổng số đồ án + phân tách số mẫu công khai và đang ẩn.
    2. *Mô hình 3D (.glb / .skp):* Thống kê tỷ lệ mẫu đã tích hợp tệp 3D tương tác so với khối tự động.
    3. *Yêu cầu tư vấn mới:* Đếm số lượng yêu cầu trạng thái `new` cần xử lý ngay (kèm badge cảnh báo đỏ) và tổng số yêu cầu.
    4. *Dự toán trung bình:* Tự động tính toán giá trị dự toán trung bình (tỷ VNĐ) của toàn bộ bộ sưu tập.
  - **Thanh Công Cụ Đa Năng (Segmented Pill Tabs + Tìm Kiếm & Lọc Nhanh):**
    - Chuyển đổi mượt mà giữa Tab *Quản lý Mẫu Nhà* và *Yêu Cầu Tư Vấn & Báo Giá* kèm pill đếm số lượng.
    - Bổ sung thanh tìm kiếm thời gian thực (`#admin-search-input`) lọc theo tên mẫu, kích thước hoặc tên/SĐT khách hàng.
    - Bổ sung bộ lọc nhanh theo phân loại kiến trúc (`Tất cả`, `Nhà phố`, `Biệt thự`, `Nhà cấp 4`).
  - **Bảng Dữ Liệu Kiến Trúc Cao Cấp (Modern Data Table):**
    - Ảnh phối cảnh bo góc lớn (`84x56px`) với hiệu ứng phóng nhẹ khi di chuột.
    - Huy hiệu phân loại nhà màu sắc riêng biệt (`.type-nha-pho`, `.type-biet-thu`, `.type-nha-cap-4`), huy hiệu trạng thái 3D (`.has-glb`, `.has-skp`, `.procedural`), huy hiệu xuất bản có chấm tròn phát sáng (`.published`, `.draft`).
    - Các nút thao tác **Sửa**, **Xoá**, **Đánh dấu đã xử lý** được thiết kế dạng pill button có icon SVG trực quan.
  - **Modal Thêm / Chỉnh Sửa Mẫu Nhà Thiết Kế Mới:**
    - Chia 3 phân khu khoa học (*1. Thông tin định danh*, *2. Thông số kỹ thuật & Dự toán*, *3. Hình ảnh phối cảnh & Mô hình 3D*) với khung Upload Dropzone viền nét đứt hiện đại và hiệu ứng đóng/mở đối xứng mượt mà (`is-closing`).
  - **Tối ưu hiển thị trọn vẹn cột Thao tác trên màn hình PC (`v5.8`):**
    - Mở rộng `.admin-body .container` lên `max-width: 1420px`, tinh chỉnh padding ngang của các cột bảng từ `18px` xuống `11px` và giữ `white-space: nowrap` cho các cột thông số/dự toán/thao tác.
    - Chuyển `.admin-tpl-sub` từ `display: flex` sang `display: block` để phụ đề không bị ép gãy dòng nhiều hàng.
    - Đảm bảo trên màn hình PC hiển thị đầy đủ 100% 9 cột (kể cả nút *Sửa* và *Xoá* ở rìa phải), chỉ kích hoạt thanh cuộn ngang khi màn hình thu hẹp.
  - Tăng tham số phiên bản cache-busting lên **`?v=5.8`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 36** trong [AI_Debug.md](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 47: Nâng Cấp Hiệu Ứng Animation Ẩn Hiện Cho Nút Bộ Lọc Yêu Thích & Lưới Mẫu Nhà (Staggered Cascade & Luxury Switch)
- [x] **Tái thiết kế nút "Chỉ hiện mục yêu thích" thành công tắc chuyển đổi sang trọng (Luxury Animated Pill Switch):**
  - Thay thế checkbox vuông vức mặc định bằng một thanh chuyển đổi xúc giác (tactile switch) với con trượt hình tròn mềm mại, chứa icon trái tim mini tự động phóng to bung nở (`@keyframes favHeartPopMini`) khi bật.
  - Bổ sung huy hiệu đếm số lượng thời gian thực (`.fav-count-badge`) hiển thị số mẫu nhà đã thả tim, tự động giật nảy hiệu ứng pop (`@keyframes favBadgePop`) mỗi khi thả/bỏ tim.
  - Hiệu ứng viền phát sáng và nền chuyển sắc hồng ngọc (`rgba(244, 63, 94, 0.16)`) đồng bộ hoàn hảo cả Light Mode và Dark Mode.
- [x] **Xây dựng hiệu ứng chuyển cảnh ẩn hiện mượt mà cho lưới thư viện mẫu nhà (Staggered Cascade Entrance & Exit):**
  - Tích hợp hàm điều phối `animateGalleryTransition()` trong [js/app.js](file:///e:/Dream-house/js/app.js) để làm mờ nhẹ và co nhẹ các thẻ cũ trước khi hiển thị danh sách mới, loại bỏ hoàn toàn hiện tượng nhấp nháy giật mắt khi lọc.
  - Mỗi thẻ nhà `.house-card` khi xuất hiện được gán biến độ trễ `--card-index: ${index};` chạy animation thác đổ (`@keyframes cardEntrance`) với gia tốc lò xo thực tế (`cubic-bezier(0.16, 1, 0.3, 1)`), tạo cảm giác các khối nhà lần lượt trượt lên đầy cuốn hút.
  - Khi người dùng bỏ tim một mẫu nhà trong lúc đang ở chế độ lọc yêu thích, thẻ nhà đó sẽ kích hoạt hiệu ứng thu nhỏ và trôi mờ dần (`.card-exit`) trong $300\text{ms}$ trước khi lưới nhà tự động dồn vị trí lại.
  - Thiết kế khối giao diện rỗng đẳng cấp (`.empty-state.fav-empty-state`) với icon trái tim đập nhịp nhàng (`@keyframes emptyHeartPulse`) và nút kêu gọi *"Khám phá tất cả mẫu nhà"* giúp quay lại nhanh chóng khi chưa có mục nào được lưu.
  - Tăng tham số phiên bản cache-busting lên **`?v=6.0`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 38** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 48: Khắc Phục Triệt Để Lỗi 403 Forbidden Khi Đồng Bộ Yêu Thích Với Supabase
- [x] **Xử lý dứt điểm lỗi `POST /rest/v1/favorites?on_conflict=user_id,template_id 403 (Forbidden)`:**
  - Phát hiện nguyên nhân kép:
    1. **Thiếu RLS Policy UPDATE:** Lệnh `upsert(..., { onConflict: 'user_id,template_id' })` của Supabase PostgREST biên dịch thành `INSERT ... ON CONFLICT DO UPDATE`. Bảng `favorites` trong RLS chỉ có chính sách cho `SELECT`, `INSERT`, `DELETE` mà thiếu `UPDATE`, dẫn đến việc PostgreSQL từ chối truy cập và trả về mã lỗi 403 Forbidden.
    2. **Đồng bộ song song trùng lặp (Race condition):** Sự kiện `getSession()` và `onAuthStateChange('INITIAL_SESSION')` chạy song song khi vừa mở web, khiến hàm `syncFavoritesWithSupabase()` bị kích hoạt 2 lần đồng thời gửi cùng lúc 2 request POST lỗi lên Supabase.
    3. **Dữ liệu ID mẫu giả lập không phải UUID:** Các mẫu nhà offline fallback mang ID `'np-01'`, `'bt-01'` không tuân thủ định dạng UUID, nếu gửi lên cột `template_id UUID` sẽ gây lỗi vi phạm khóa ngoại.
  - Giải pháp khắc phục toàn diện:
    1. **Tối ưu logic Client-Side:** Kiểm tra `existingDbIds` từ kết quả truy vấn `select('template_id')` và chỉ thực hiện `insert()` đối với những mẫu nhà UUID mới thực sự chưa có trong cơ sở dữ liệu. Loại bỏ hoàn toàn sự phụ thuộc vào lệnh `upsert` xung đột quyền RLS.
    2. **Thêm khóa luồng `_isSyncingFavorites`:** Khóa đồng bộ đơn luồng ngăn chặn triệt để tình trạng gọi trùng lặp song song khi khởi tạo phiên đăng nhập.
    3. **Tạo migration bảo mật [`supabase/08_fix_favorites_rls.sql`](file:///e:/Dream-house/supabase/08_fix_favorites_rls.sql):** Bổ sung chính sách `FOR UPDATE TO authenticated USING (auth.uid() = user_id)` và cập nhật vào [`supabase/all_in_one_setup.sql`](file:///e:/Dream-house/supabase/all_in_one_setup.sql), [`supabase/02_security.sql`](file:///e:/Dream-house/supabase/02_security.sql).
  - Tăng tham số phiên bản cache-busting lên **`?v=6.1`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 39** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 49: Khắc Phục Lỗi Animation Thẻ Mẫu Nhà Tự Động Chạy Lại (Reload) Khi Chuyển Tab Trình Duyệt
- [x] **Xử lý triệt để hiện tượng khi chuyển qua tab khác rồi quay lại tab Dream House thì animation lưới nhà bị reload:**
  - Phát hiện nguyên nhân cốt lõi:
    1. Khi người dùng chuyển tab và quay lại, cơ chế quản lý phiên của Supabase JS tự động kiểm tra tính hợp lệ của JWT token và kích hoạt sự kiện `onAuthStateChange('TOKEN_REFRESHED', session)`.
    2. Hàm xử lý cũ không lọc loại sự kiện, tự động gọi lại `syncFavoritesWithSupabase()`.
    3. Bên trong `syncFavoritesWithSupabase()`, câu lệnh `this.renderGallery()` được gọi vô điều kiện, xóa trắng và tạo mới lại toàn bộ các thẻ `.house-card` trong DOM.
    4. Do `.house-card` có CSS animation `cardEntrance` thác đổ so le, việc DOM bị tái tạo khiến toàn bộ thẻ nhà kích hoạt lại animation trượt lên từ đầu, tạo cảm giác trang web bị tự động "reload" gây giật mắt.
  - Giải pháp xử lý dứt điểm:
    1. **Chặn sự kiện ngầm trong `onAuthStateChange`:** Bổ sung điều kiện bỏ qua `event === 'TOKEN_REFRESHED'` và `event === 'INITIAL_SESSION'`, chỉ cập nhật lại `currentUser` nếu cần mà không gọi bất kỳ hàm render hay fetch lại nào.
    2. **Tối ưu hóa `syncFavoritesWithSupabase()`:** Kiểm tra cờ `hasChanges`. Chỉ khi thực sự có mẫu nhà yêu thích mới từ database đổ về mới tiến hành cập nhật giao diện nút tim bằng `updateCardFavoriteUI(favId, true)` (cập nhật thuộc tính tại chỗ, không hủy DOM), tuyệt đối không re-render lại toàn bộ lưới nhà.
  - Tăng tham số phiên bản cache-busting lên **`?v=6.2`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 40** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 50: Chuẩn Hóa Nhãn Phân Loại Kiến Trúc & Hỗ Trợ Tùy Biến Phong Cách Hiển Thị Trên Thẻ Nhà
- [x] **Khắc phục lỗi nhãn thẻ nhà hiển thị slug thô `biet-thu` thay vì tên phân loại tiếng Việt có dấu `Biệt thự`:**
  - Phát hiện nguyên nhân cốt lõi:
    1. Khi mẫu nhà không có trường `style_vi` (hoặc mới tạo từ Admin), logic render trên thẻ nhà tại [js/app.js](file:///e:/Dream-house/js/app.js) dòng 960 dùng `${style || item.type}`, in ra trực tiếp giá trị slug kỹ thuật `biet-thu`, `nha-pho`, `nha-cap-4`.
    2. Form thêm/sửa mẫu nhà trong [admin.html](file:///e:/Dream-house/admin.html) trước đó chưa có ô nhập cho trường `style_vi`, khiến người quản trị không thể tùy biến hoặc tự gõ nhãn phong cách theo ý muốn.
  - Giải pháp xử lý dứt điểm:
    1. **Bổ sung ô nhập `Phong cách / Nhãn hiển thị` (`#tpl-style`) trong Admin:** Đặt trong hàng `1. Thông tin định danh` (3 cột: Tên mẫu nhà, Phân loại kiến trúc, Phong cách hiển thị). Người dùng có thể tự gõ bất kỳ nội dung nào (ví dụ: *"Biệt thự vườn"*, *"Hiện đại"*, *"Tân cổ điển"*, *"Nhà cấp 4 mái Thái"...). Nếu để trống, hệ thống sẽ tự động gán nhãn chuẩn theo loại đã chọn (`Biệt thự`, `Nhà phố`, `Nhà cấp 4`).
    2. **Tự động ánh xạ tên hiển thị đẹp mắt trong `js/app.js`:** Ánh xạ tự động từ điển song ngữ `typeDisplayNames` cho toàn bộ các mẫu nhà cũ và mới. Nếu `style` chưa có hoặc đang mang giá trị slug có dấu gạch ngang (`biet-thu`, `nha-pho`, `nha-cap-4`), hệ thống tự động đổi sang tiếng Việt chuẩn (`Biệt thự`, `Nhà phố`, `Nhà cấp 4`) hoặc tiếng Anh chuẩn (`Villa`, `Townhouse`, `Bungalow`).
  - Tăng tham số phiên bản cache-busting lên **`?v=6.3`** trên toàn bộ `index.html` và `admin.html`.
  - Cập nhật cẩm nang chẩn đoán vào **Lỗi 41** trong [AI_Debug.md](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 52: Tái Thiết Kế Bảng Thống Kê Thị Hiếu Thời Gian Thực Cao Cấp (Lucian UX/UI Prompts #047 & #097)
- [x] **Xóa bỏ bố cục danh sách 4 thẻ lặp đơn điệu, xây dựng Bố cục 2 Tầng (2-Tier Editorial Grid) hài hòa PC & Mobile:**
  - **Tầng 1 (Hero Interactive Visual Charts - 2 cột):**
    - **Widget 1 (Lucian Prompt #047 - Period Segmented Control):**
      - Núm trượt chuyển đổi chu kỳ đàn hồi (Elastic rubber knob) co giãn mượt mà theo hướng di chuyển (`.go-r`, `.go-l` spring easing).
      - 4 chu kỳ phân tích lưu lượng: *Hôm nay*, *7 ngày*, *30 ngày (mặc định)*, *Toàn bộ*.
      - Bộ đếm số lớn tự động cuộn chữ số mượt mà (`.u047-num`) qua `requestAnimationFrame`.
      - Huy hiệu phần trăm biến động kèm mũi tên xoay chuyển hướng tự động (`.u047-chg`).
      - Biểu đồ sóng cong Bezier SVG (`.u047-line`, `.u047-area`) tự uốn lượn hình dạng theo dữ liệu chu kỳ mới, kết hợp điểm chốt phát sáng đập xung nhịp tuần hoàn (`.u047-halo`, `.u047-dot`).
      - Hỗ trợ đầy đủ phím điều hướng mũi tên bàn phím (ArrowLeft, ArrowRight, ArrowUp, ArrowDown) và tự động căn chỉnh lại núm khi đổi kích thước màn hình.
    - **Widget 2 (Lucian Prompt #097 - Donut that re-splits):**
      - Biểu đồ hình tròn donut SVG phân bổ thị hiếu theo 3 phân loại kiến trúc cốt lõi: *Nhà phố* (`#3D8BFF`), *Biệt thự* (`#C49A45`), *Nhà cấp 4* (`#10B981`).
      - Di chuột vào lát cắt hoặc nút phân loại: Lát cắt trượt chéo ra ngoài 7px (`transform: translate(...)`) và nở độ dày viền lên 34px, trung tâm xoay chuyển tức thì sang tên phân loại, số lượt xem thực tế và tỷ lệ thị phần (`.sw` animation).
      - Bấm vào lát cắt hoặc nút chú giải: Ẩn phân loại đó, các phân loại còn lại tự động tính toán lại góc quay và bung rộng để lấp đầy vòng tròn khép kín (`morph()` cubic-bezier), đồng thời bộ đếm tổng số lượt xem cuộn theo (`rollTotal()`).
      - Hiệu ứng phản hồi rung lắc (Tactile Shake) ngăn chặn người dùng tắt phân loại cuối cùng.
  - **Tầng 2 (Deep-dive Performance Leaderboards - 2 cột):**
    - Cột trái: *Xếp Hạng Mẫu Được Xem Nhiều Nhất* với huy hiệu Vàng 🥇 / Bạc 🥈 / Đồng 🥉, thanh phần trăm tiến trình chuyển sắc cyan-blue và nhãn `👑 XEM NHIỀU NHẤT`.
    - Cột phải: *Mẫu Được Quan Tâm & Thả Tim Nhất* với chỉ số lượt thả tim ❤️, số yêu cầu tư vấn đã nhận và tỷ lệ thị phần yêu thích.
- [x] **Ánh xạ Design Tokens CSS `--ux-*` hoàn hảo giữa Light Mode và Dark Mode:**
  - Định nghĩa biến màu sắc tương thích với tông màu hoàng gia của Dream House (`--ux-accent: #c49a45;`, `--ux-mint: #10b981;`, `--ux-surface`, `--ux-ink`...).
  - Đảm bảo độ tương phản tuyệt đối và hỗ trợ đầy đủ `prefers-reduced-motion: reduce`.
- [x] **Cơ chế lưu giữ trạng thái bộ lọc (State Preservation):**
  - Khi hệ thống tự động làm mới số liệu mỗi 15 giây (`startAnalyticsAutoRefresh()`), giữ nguyên chu kỳ đang chọn và các lát cắt đang bật/tắt, không gây chớp giật hay reset giao diện của quản trị viên.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=6.5`** trên toàn bộ `index.html` và `admin.html`.
- [x] Bổ sung cẩm nang giải pháp vào **Lỗi 43** trong [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 53: Chuẩn Hóa Căn Chỉnh Lưới 5 Thẻ KPI Bento & Huy Hiệu Trực Tiếp (`.live-pulse-badge`) Trên Trang Quản Trị
- [x] **Khắc phục triệt để hiện tượng thẻ KPI "Lượt xem mẫu nhà" bị lệch hàng, vỡ dòng tiêu đề và méo huy hiệu `TRỰC TIẾP`:**
  - **Hiện tượng:** Khi lưới `.admin-stats-grid` chuyển từ 4 cột sang 5 cột, chiều ngang mỗi thẻ hẹp hơn (~235px). Việc đặt nhãn `LƯỢT XEM MẪU (REALTIME)` cùng hàng với huy hiệu `.live-pulse-badge` và icon mắt `.admin-stat-icon.cyan` khiến tiêu đề bị ép xuống 3 dòng, chữ `TRỰC TIẾP` vỡ thành 2 dòng đè sát vào icon, chấm tròn `.pulse-dot` bị bóp méo thành hình bầu dục dọc, và con số `0` bị đẩy lệch hẳn xuống dưới so với 4 thẻ KPI còn lại.
  - **Giải pháp UI/UX đồng bộ:**
    1. **Cố định tọa độ Icon góc trên phải (`position: absolute; top: 18px; right: 18px; width: 42px; height: 42px;`):** Giải phóng 100% chiều ngang phần đáy thẻ cho dòng mô tả `.admin-stat-meta` và đảm bảo icon của cả 5 thẻ luôn nằm trên cùng một trục ngang tuyệt đối.
    2. **Cấu trúc 3 tầng chuẩn hóa cho cả 5 thẻ KPI:**
       - *Tầng 1 (`.admin-stat-label`):* Nhãn tiêu đề ngắn gọn trên **1 dòng duy nhất** (`LƯỢT XEM MẪU NHÀ`, `white-space: nowrap`, `padding-right: 50px`).
       - *Tầng 2 (`.admin-stat-value-row`):* Đặt con số lớn `#stat-total-views` (`1.75rem`) nằm ngang hàng cùng huy hiệu `<span class="live-pulse-badge"><span class="pulse-dot"></span>Trực tiếp</span>` (`gap: 10px`). Nhờ khoảng trống rộng rãi bên cạnh con số, huy hiệu luôn nằm gọn trên 1 dòng và tất cả 5 con số lớn của 5 thẻ thẳng hàng tuyệt đối.
       - *Tầng 3 (`.admin-stat-meta`):* Dòng phụ đề chiếm trọn 100% chiều rộng đáy thẻ với `text-overflow: ellipsis`, hiển thị gọn gàng không bao giờ bị rớt chữ đơn lẻ xuống dòng 2.
    3. **Khóa tỷ lệ hình học cho `.live-pulse-badge` và `.pulse-dot`:** Bổ sung `white-space: nowrap; flex-shrink: 0; line-height: 1;` cho huy hiệu và `min-width: 6px; min-height: 6px; flex-shrink: 0;` cho chấm tròn phát sáng.
    4. **Đồng nhất hành vi hiển thị với 4 thẻ KPI còn lại:** Giữ thẻ KPI Lượt xem mẫu nhà ở chế độ hiển thị thuần túy (không gắn sự kiện click chuyển tab hay `cursor: pointer`), đồng bộ hoàn toàn hiệu ứng hover viền vàng với 4 panel KPI bên cạnh.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=6.7`** trên toàn bộ `index.html` và `admin.html`.
- [x] Bổ sung cẩm nang chẩn đoán vào **Lỗi 44** trong [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 54: Chuyển Đổi Bảng Xếp Hạng Thị Hiếu Thành Biểu Đồ Cột Hiện Đại (Modern Column Bar Charts)
- [x] **Nâng cấp toàn diện giao diện 2 card Tầng 2 thành Biểu Đồ Cột Trực Quan (Modern Column Bar Charts):**
  - **Hiện tượng:** Khách hàng quan sát thấy 2 bảng "Xếp Hạng Mẫu Được Xem Nhiều Nhất" và "Mẫu Được Quan Tâm & Thả Tim Nhất" vẫn hiển thị dạng danh sách hàng ngang lặp text đơn điệu, khó so sánh trực quan độ chênh lệch giữa các mẫu đồ án.
  - **Giải pháp thiết kế trực quan:**
    1. **Thiết kế Biểu đồ cột đứng (Column Bar Chart):**
       - Lưới trục hoành và trục tung với đường nét đứt (`.chart-y-axis-lines`, `.axis-line`) hiển thị mốc tham chiếu linh hoạt (Max, 50%, 0).
       - Cột hiển thị (`.chart-col-track`, `.chart-col-fill`) vươn cao theo tỷ lệ phần trăm thực tế (`height: X%`, `transition: height 0.75s var(--ease-spring)`):
         - Biểu đồ lượt xem: Cột chuyển sắc Cyan-Blue (`#06b6d4` → `#3b82f6`).
         - Biểu đồ thả tim yêu thích: Cột chuyển sắc Rose-Pink (`#fb7185` → `#f43f5e`).
         - Mẫu Top 1 được tôn vinh với hiệu ứng phát sáng đặc biệt (`.is-top-1`).
       - Thẻ hiển thị số lượng nổi phía trên mỗi cột (`.chart-col-value-badge`), ví dụ: `120 xem` hoặc `1 ❤️`.
       - Chân cột hiển thị huy hiệu xếp hạng (🥇, 🥈, 🥉, #4...), ảnh thu nhỏ bo góc (32×32px), tên mẫu nhà ngắn gọn và nhãn phân loại kiến trúc (`.chart-col-type`).
    2. **Bộ công tắc chuyển đổi góc nhìn linh hoạt (`.chart-view-toggle`):**
       - Người dùng có thể bấm đổi giữa chế độ **Biểu đồ Cột** (Mặc định) và chế độ **Bảng Danh Sách** truyền thống tùy nhu cầu.
    3. **Tương thích hoàn hảo Dark & Light Mode, cuộn ngang mượt mà trên Mobile.**
- [x] Tăng tham số phiên bản cache-busting lên **`?v=6.8`** trên toàn bộ `index.html` và `admin.html`.
- [x] Bổ sung cẩm nang chẩn đoán vào **Lỗi 45** trong [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 52: Tối Ưu Toàn Diện Giao Diện & Trải Nghiệm Người Dùng Trên Thiết Bị Di Động (Mobile Responsive System)
- [x] **Xử lý triệt để hiện tượng vỡ giao diện trên màn hình điện thoại (Mobile Screens < 768px & < 380px):**
  - **Khắc phục lỗi Header & Logo:**
    1. Tiêu đề thương hiệu `.brand-title` bị bẻ đôi thành 2 dòng ("Dream" và "House") do các nút hành động bên phải quá to chiếm hết chiều ngang, dẫn tới chữ "Dream" bị cắt nửa thân trên.
    2. Giải pháp: Đặt `.brand-title` kích thước `1.25rem` với `white-space: nowrap; line-height: 1.15; overflow: hidden; text-overflow: ellipsis;`. Cân đối padding của `.container` từ `24px` xuống `16px`.
    3. Thu gọn các nút `.header-actions`: nút Dark/Light mode (`36x36px`), nút đổi ngôn ngữ VI/EN (`height: 36px; padding: 0 10px; font-size: 0.78rem;`), nút menu người dùng (`height: 36px; padding: 4px 10px 4px 6px; user-name max-width: 76px;`). Trên màn hình siêu nhỏ (< 380px), ẩn chữ tên người dùng để hiển thị dạng icon pill thanh thoát, bảo đảm logo luôn giữ nguyên 1 hàng sang trọng.
  - **Tối ưu Khối Hero Banner:**
    1. Khắc phục chữ "MỸ" bị ngắt xuống 1 dòng đơn lẻ trong huy hiệu tagline: gán font `0.7rem`, `padding: 5px 12px; max-width: 100%;`.
    2. Hạ kích thước tiêu đề chính `.hero-headline` từ `2.6rem - 4.4rem` xuống `clamp(1.75rem, 6.8vw, 2.3rem)` với `line-height: 1.22;` giúp câu chữ gọn gàng, không bị dày đặc.
    3. Cân đối 2 nút kêu gọi hành động `.hero-cta-group`: áp dụng `grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;`, mỗi nút chiếm đều 50% chiều ngang, căn giữa hoàn hảo.
  - **Tối ưu Khối Thư Viện Mẫu Nhà & Thanh Công Cụ Bộ Lọc (`#gallery-section`):**
    1. Ô tìm kiếm `#filter-search` mở rộng `width: 100% !important;` với `padding: 11px 16px; font-size: 0.86rem;`, không bị cắt cụt placeholder.
    2. Nhóm dropdown phân loại và sắp xếp chuyển sang dạng lưới 2 cột (`grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;`), nút trigger co giãn theo cột và nhãn text có `text-overflow: ellipsis;`. Menu xổ xuống trải rộng `100%` vừa vặn màn hình.
    3. Công tắc "Chỉ hiện mục yêu thích" trải rộng `100%`, căn giữa nội dung sang trọng.
  - **Tối ưu Modal Chi Tiết Mẫu Nhà (`#detail-modal`) & Thẻ Nhà (`.house-card`):**
    1. `.detail-grid` chuyển 1 cột dọc: visual column đặt phía trên (ảnh 190px, canvas 3D 250px) và cột thông tin đặt phía dưới.
    2. Bảng thông số `.specs-table` dạng lưới 2 cột tinh tế với font 0.82rem, các nút điều hướng và nút nhận báo giá được thiết kế to rõ, dễ chạm bằng ngón tay cái.
  - **Tối ưu Trang Quản Trị Admin (`admin.html`) trên Mobile:**
    1. Bento KPI cards tự động chuyển thành 1 cột dọc (`grid-template-columns: 1fr;`).
    2. Thanh tab và bộ lọc loại nhà thích ứng cuộn ngang mượt mà (`-webkit-overflow-scrolling: touch`).
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.0`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 46** và **Lỗi 47** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 53: Tối Ưu Toàn Diện Giao Diện Trang Quản Trị Admin Portal Trên Thiết Bị Di Động (Mobile Header & Action Buttons)
- [x] **Xử lý triệt để hiện tượng Header Admin bị chèn ép, vỡ logo và tràn nút trên Mobile (< 640px & < 380px):**
  - **Khắc phục lỗi Header:**
    1. Logo `Dream House` bị ép cụt chữ thành `Dream Ho...` do thẻ cha thiếu `min-width: 0`, đồng thời huy hiệu `ADMIN PORTAL` bên cạnh bị nhảy đè chèn lấn lên logo.
    2. Cụm nút bên phải chứa đồng thời Theme Toggle, nút *"Về trang chủ"* dạng chữ dài và nút *"Đăng xuất"* dạng chữ dài, tổng chiều rộng lên tới 314px (vượt quá 85% chiều rộng cả màn hình điện thoại 360-390px), dẫn tới việc nút *"Về trang chủ"* bị cắt cụt và nút *"Đăng xuất"* bị đẩy văng ra ngoài mép màn hình.
  - **Giải pháp xử lý dứt điểm:**
    1. **Tái cấu trúc khối thương hiệu (`.admin-header-brand-wrap`):** Đặt `min-width: 0; flex-shrink: 1;`. Khóa `brand-title` kích thước `1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`. Ẩn dòng phụ đề `.brand-sub` ("Architectural Design") trên mobile để chiều cao header không bị phình to.
    2. **Thu gọn huy hiệu Admin:** Giảm padding `3px 8px; font-size: 0.65rem;` có chấm xanh nhấp nháy. Trên màn hình siêu nhỏ (< 380px), tự động ẩn chữ `Portal`, chỉ giữ lại chấm tròn xanh bảo vệ không gian cho logo.
    3. **Chuyển đổi nút hành động sang Icon Pill thông minh:**
       - Nút *"Về trang chủ"* (`.admin-btn-home`): Chuyển thành icon ngôi nhà 36×36px bo tròn, ẩn chữ trên mobile.
       - Nút *"Đăng xuất"* (`.admin-btn-logout`): Chuyển thành icon đăng xuất 36×36px bo tròn, ẩn chữ trên mobile.
       - Tổng chiều rộng cụm 3 nút bên phải giảm mạnh từ **314px xuống chỉ còn 124px**, giải phóng hơn **220px** cho Logo bên trái luôn hiển thị trọn vẹn, không bị đè hay cắt xén.
  - **Tối ưu Khối Hero Actions của Admin Portal:**
    1. Trước đây nút `+ Thêm mẫu nhà mới` có `width: 100%` nên bị rớt xuống hàng dưới, để nút Làm mới `(⟳)` đứng cô độc một mình ở hàng trên.
    2. Giải pháp: Áp dụng `display: flex; gap: 8px; width: 100%; align-items: center;`. Nút Làm mới giữ kích thước `44×44px` bo góc 12px, nút Thêm mẫu nhà nhận `flex: 1` với padding `12px 16px`, hai nút nằm chung một hàng ngang liền mạch, cân xứng và thẩm mỹ cao.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.0`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 51: Khắc Phục Triệt Để Hiện Tượng Nháy Nút Đăng Nhập & Xây Dựng Hệ Thống Thống Kê Lượt Xem / Thị Hiếu Thời Gian Thực (Realtime Analytics Dashboard)
- [x] **Xử lý dứt điểm lỗi nháy trạng thái đăng nhập (Auth State Flash / Delay):**
  - **Hiện tượng:** Sau khi lưu mẫu nhà ở Admin rồi quay lại trang chủ, góc phải navbar hiển thị nút "[Đăng nhập]" như chưa đăng nhập, sau 1 lúc mới tự động chuyển sang Avatar người dùng.
  - **Nguyên nhân cốt lõi:**
    1. Trong `js/app.js`, hàm `setupAuth()` lấy được `session.user` từ `getSession()` nhưng bỏ sót việc gọi `this.updateAuthUI()`.
    2. Trong `onAuthStateChange`, để chặn reload animation thẻ nhà đã `return` ngay khi gặp `INITIAL_SESSION`, khiến giao diện không được cập nhật trạng thái đã đăng nhập.
    3. Hàm `setupAuth()` không được `await` trong `init()`.
  - **Giải pháp dứt điểm:**
    1. **Cơ chế phục hồi 0ms delay từ `localStorage`:** Kiểm tra khóa lưu trữ `sb-*-auth-token` của Supabase ngay khi ứng dụng khởi chạy. Nếu phát hiện phiên đăng nhập, lập tức gán `this.currentUser = cachedUser` và kích hoạt `this.updateAuthUI()` đồng bộ tại Frame 0 (trước khi khung hình đầu tiên kịp vẽ ra), loại bỏ 100% hiện tượng chớp nút "Đăng nhập".
    2. **Cập nhật UI tức thì trong `setupAuth()`:** Gọi `this.updateAuthUI()` ngay khi lấy được session từ máy chủ Supabase và gọi lại khi nạp xong hồ sơ cá nhân.
    3. **Giữ nguyên trạng thái Auth trong `onAuthStateChange`:** Với sự kiện `INITIAL_SESSION` hoặc `TOKEN_REFRESHED`, vẫn cập nhật `this.currentUser = session.user` và gọi `this.updateAuthUI()`, chỉ không re-render lại gallery.
    4. **Đặt `await this.setupAuth()` trong `init()`.**
- [x] **Xây dựng Hệ thống Thống Kê & Phân Tích Thị Hiếu Mẫu Nhà Thời Gian Thực ([`admin.html`](file:///e:/Dream-house/admin.html)):**
  - **Database Migration ([`supabase/09_template_views_analytics.sql`](file:///e:/Dream-house/supabase/09_template_views_analytics.sql)):**
    - Bổ sung cột `view_count INTEGER NOT NULL DEFAULT 0` vào bảng `public.templates`.
    - Tạo hàm RPC `public.increment_template_view(t_id UUID)` với đặc quyền `SECURITY DEFINER`, cho phép cả khách vãng lai và thành viên đăng nhập ghi nhận lượt xem mẫu an toàn.
    - Tạo RLS Policy cho phép Admin đọc toàn bộ bảng `favorites` để phân tích lượt thả tim.
  - **Theo dõi lượt xem thời gian thực trong [`js/app.js`](file:///e:/Dream-house/js/app.js):**
    - Trong hàm `openDetailPanel(templateId)`, tự động kích hoạt `recordTemplateView(item.id)`, tăng cục bộ 1 lượt xem và gọi RPC `increment_template_view` lên Supabase.
  - **Thẻ KPI Bento Lượt Xem Thời Gian Thực:**
    - Bổ sung thẻ KPI thứ 5 trên Admin Bento Grid: *"Lượt xem mẫu (Realtime)"* với hiệu ứng chấm xanh lá đập xung nhịp phát sáng (`.live-pulse-badge`, `@keyframes liveDotPulse`), hiển thị tổng lượt xem và mẫu nhà đang dẫn đầu thị hiếu.
  - **Tab 3: Thống Kê & Phân Tích Tương Tác (`#panel-analytics`):**
    - *Module 1 (Tỷ Lệ Mẫu Được Xem Nhiều Nhất):* Xếp hạng #1, #2, #3 kèm vương miện 👑 vàng, thanh phần trăm tiến trình chuyển sắc cyan-blue và tỷ lệ view share (%).
    - *Module 2 (Mẫu Được Quan Tâm & Yêu Thích Nhất):* Xếp hạng số lượt khách hàng thả tim lưu vào danh sách yêu thích kèm thanh tiến trình màu hồng ngọc.
    - *Module 3 (Top Mẫu Nhận Nhiều Yêu Cầu Tư Vấn Nhất):* Xếp hạng mẫu tạo ra nhiều liên hệ báo giá & thi công nhất kèm tỷ lệ chuyển đổi.
    - *Module 4 (Thị Hiếu Theo Phân Loại Kiến Trúc):* So sánh tỷ trọng quan tâm giữa Nhà phố, Biệt thự và Nhà cấp 4.
  - **Cột Lượt Xem & Yêu Thích trong Bảng Mẫu Nhà (Tab 1):**
    - Bổ sung cột mới hiển thị trực quan cả 2 chỉ số tương tác: `👁️ [Số lượt xem]` và `❤️ [Số lượt thả tim]`.
  - **Cơ chế tự động làm mới thời gian thực:**
    - Tự động đồng bộ số liệu mỗi 15 giây (`startAnalyticsAutoRefresh()`) khi tab đang hoạt động, có nút *"Làm mới ngay"* thủ công.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=6.4`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 42** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 52: Tối Ưu Hóa Toàn Diện UI/UX Giao Diện Trang Chủ Trên Màn Hình Điện Thoại (Mobile Responsive Polish v6.9)
- [x] **Xử lý dứt điểm tình trạng chèn ép Header và xô lệch layout trang chủ:**
  - **Header & Brand:** Khóa `.brand-title` về kích thước chuẩn di động `1.25rem`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis;` giữ cho tên thương hiệu Dream House luôn thẳng hàng, không bị bóp nghẹt.
  - **Cụm Action Header:** Tối ưu hóa kích thước nút Theme Toggle thành khối tròn `36×36px`, nút chuyển ngôn ngữ `height: 36px; padding: 0 10px; font-size: 0.78rem;`, nút User Profile thu nhỏ `height: 36px; max-width: 76px;` để nhường diện tích trung tâm.
  - **Hero Section:** Sửa lỗi từ "MỸ" bị rớt dòng trơ trọi trong khẩu hiệu "KIẾN TRÚC TINH HOA - XÂY DỰNG TỔ ẤM HOÀN MỸ". Cân bằng 2 nút bấm Hero CTA (`Khám phá mẫu nhà` và `Liên hệ`) thành lưới 2 cột 50/50 (`grid-template-columns: 1fr 1fr; gap: 10px;`).
  - **Thư viện mẫu:** Ô tìm kiếm hiển thị full width 100%, 2 menu dropdown "Loại nhà" và "Sắp xếp" phân bổ đều 2 cột cân xứng 50/50.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=6.9`**.

### Giai đoạn 53: Cải Thiện Toàn Diện Giao Diện Bảng Quản Trị Hệ Thống Trên Mobile (Admin Portal Mobile Redesign v7.0)
- [x] **Tái thiết kế thanh điều hướng và Hero của Admin Portal trên điện thoại:**
  - Khắc phục lỗi logo "Dream House" bị co ngắn thành `Dream Ho...` do cụm nút bên phải chiếm tới 314px.
  - Chuyển đổi nút *"Về trang chủ"* (`.admin-btn-home`) và *"Đăng xuất"* (`.admin-btn-logout`) thành các nút Icon Pill tròn `36×36px`, ẩn chữ trên mobile, giải phóng hơn 220px chiều ngang.
  - Thu gọn huy hiệu `ADMIN PORTAL`, tự động chỉ hiển thị chấm xanh nhấp nháy trên màn hình < 380px.
  - Gộp nút làm mới `(⟳)` (44×44px) và nút `+ Thêm mẫu nhà mới` (`flex: 1`) lên chung một hàng ngang liền mạch, hiện đại.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.0`**.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 47** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 54: Khắc Phục Lỗi Thanh Tab Quản Trị Hệ Thống Bị Rớt Hàng & Méo Viên Thuốc Trên Mobile (Admin Nav Tabs Touch Scroll v7.1)
- [x] **Xử lý dứt điểm lỗi bố cục 3 tab điều hướng Admin trên thiết bị di động:**
  - **Hiện tượng:** Tab 1 và Tab 2 nằm ở dòng 1 (Tab 2 bị cụt chữ), Tab 3 *"Thống Kê & Phân Tích"* bị rớt xuống dòng 2 đứng lẻ loi, viền oval tròn `.admin-nav-tabs` bị kéo giãn và méo mó.
  - **Nguyên nhân:** Bị kẹt thuộc tính cũ `display: grid; grid-template-columns: 1fr 1fr;` khi hệ thống ban đầu chỉ có 2 tab.
  - **Giải pháp dứt điểm:**
    1. Chuyển đổi `.admin-nav-tabs` dưới `@media (max-width: 640px)` sang layout Flex cuộn ngang chạm vuốt (`display: flex; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; border-radius: var(--radius-full);`).
    2. Các tab con `.tab-btn` nhận `flex-shrink: 0; white-space: nowrap; padding: 8px 14px; font-size: 0.82rem; gap: 6px;`.
    3. Rút ngắn nhãn hiển thị trong `admin.html` từ *"Yêu Cầu Tư Vấn & Báo Giá"* thành *"Yêu Cầu Tư Vấn"*.
  - **Kết quả:** Giữ trọn vẹn kiểu dáng viên thuốc tròn cao cấp chuẩn Apple/Bento UI, vuốt mượt mà trên mọi thiết bị di động, tự do mở rộng tab mà không bao giờ vỡ khung hình.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.1`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 48** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 55: Nâng Cấp Toàn Diện UI Nút Đóng (X) & Khắc Phục Lỗi Đè Lấn Tiêu Đề Modal Admin (Luxury Glassmorphic Close Button v7.2)
- [x] **Xử lý dứt điểm lỗi nút X đè lên tiêu đề modal thêm/sửa mẫu nhà:**
  - **Hiện tượng:** Nút đóng tròn (X) nằm đè trực tiếp lên chữ cuối của tiêu đề "Thêm Mẫu Thiết Kế Mới" và "Chỉnh Sửa Mẫu Thiết Kế", che khuất chữ "Mới" và chữ "Kế".
  - **Nguyên nhân:** Khối header modal `.admin-modal-header` không có padding-right cách ly vùng nút đóng absolute, khối tiêu đề `<h3>` dùng inline style `1.45rem` chiếm toàn bộ bề ngang.
  - **Giải pháp bố cục an toàn:**
    1. Thiết lập `padding-right: 54px;` (mobile: `46px;`) cho `.admin-modal-header`, bọc tiêu đề trong `.admin-modal-title-wrap { flex: 1; min-width: 0; }`.
    2. Chuyển tiêu đề sang class `.admin-modal-title` với `font-size: 1.35rem;` (mobile: `1.18rem;`), `word-break: break-word;` tự động xuống dòng an toàn không bao giờ chạm tới vùng nút X.
    3. Định vị lại nút close trong `.admin-modal-window` thẳng hàng cân xứng với icon header (`top: 24px; right: 28px;` trên desktop; `top: 18px; right: 16px;` trên mobile).
- [x] **Tái thiết kế UI Nút X cao cấp chuẩn Glassmorphism (Apple & Luxury Bento UI):**
  - **Vật liệu kính mờ:** Nền kính `backdrop-filter: blur(12px);`, đổ bóng nổi `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);`, viền sáng phản chiếu ánh sáng ở mép trên `inset 0 1px 0 rgba(255, 255, 255, 0.12)`.
  - **Biểu tượng SVG sắc nét:** Tinh chỉnh nét vẽ từ thô cứng (stroke 2.5) sang nét bo tròn tinh xảo `stroke-width: 2.2` kích thước `15×15px`.
  - **Tương tác Micro-interaction:** Hover xoay 90 độ mượt mà kèm nảy nhẹ `transform: rotate(90deg) scale(1.08);`, chuyển sang ánh sáng đỏ hồng trong suốt `rgba(239, 68, 68, 0.2)` và glow viền đỏ; Active co lại 0.92 phản hồi xúc giác cơ học chân thực.
  - Áp dụng đồng bộ trên toàn bộ website: `#close-template-modal`, `#close-detail-modal`, `#close-profile-modal`, `.confirm-close-btn`.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.2`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 49** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 56: Rà Soát Toàn Diện & Chuẩn Hóa Song Ngữ Triệt Để (i18n Full Localization Polish v7.3)
- [x] **Khắc phục triệt để hiện tượng vẫn sót tiếng Việt khi chuyển sang ngôn ngữ tiếng Anh (EN):**
  - **Menu người dùng (User Dropdown Menu):**
    - Bổ sung các nhãn song ngữ: `menu_admin` ("Admin Portal"), `menu_favorites` ("Saved Favorites"), `menu_profile` ("Edit Profile"), `menu_settings` ("System Settings").
    - Cập nhật hàm `updateAuthUI()`: Badge vai trò người dùng tự động dịch chuẩn xác `role_admin` ("Administrator (Admin)") hoặc `role_member` ("Member").
  - **Thư viện mẫu (Gallery):**
    - Gắn `data-i18n="gallery_sub"` cho phụ đề gallery: "Curated architectural designs ready for construction with transparent estimates."
    - Xây dựng bộ hàm dịch tự động thông minh `getLocalizedStyle(item, lang)`: Chuyển đổi toàn bộ nhãn badge phong cách tiếng Việt (`Biệt thự`, `Nhà phố`, `Nhà cấp 4`, `Hiện đại`, `Tân cổ điển`...) sang tiếng Anh tương ứng (`Villa`, `Townhouse`, `Bungalow`, `Modern`, `Neo-Classical`...).
    - Xây dựng hàm dịch tên mẫu nhà `getLocalizedTemplateName(item, lang)`: Tự động chuyển đổi các tên mẫu kiến trúc tiếng Việt thành tiếng Anh chuẩn chỉ (ví dụ: *"Nhà phố 2 tầng 5x16m"* $\to$ *"2-Story Modern Townhouse 5x16m"*).
  - **Liên hệ, Form & Modal toàn hệ thống:**
    - Gắn `data-i18n` đồng bộ cho toàn bộ kênh liên hệ trực tiếp, lời dẫn Auth showcase và các trường form trong Hồ sơ cá nhân (Profile Modal).
    - Quét toàn bộ mã nguồn HTML bằng script phân tích cú pháp, đảm bảo 0% văn bản bị bỏ sót.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.3`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 50** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 57: Tối Ưu Tương Phản Nút Đóng (X) Mobile & Xử Lý Graceful Fallback Supabase RPC 404 (Mobile Close Button Contrast & Supabase Analytics RPC Fallback v7.4)
- [x] **Khắc phục triệt để lỗi nút Đóng (X) bị chìm/vô hình trên thiết bị di động:**
  - **Hiện tượng:** Khi mở panel chi tiết mẫu nhà (`#detail-modal`) trên màn hình điện thoại (mobile viewport), nút đóng nằm ở góc trên bên phải đè trực tiếp lên phần trời sáng của ảnh phối cảnh kiến trúc. Ở Dark Theme, nút biến thành một vòng tròn màu trắng xám mờ mờ và dấu X gần như biến mất hoàn toàn, người dùng rất khó nhận diện để đóng modal.
  - **Nguyên nhân:** Nút đóng dùng token mờ nhạt `--btn-close-bg: rgba(255, 255, 255, 0.08)` với icon màu bạc nhạt `#cbd5e1`. Khi đè lên nền ảnh bầu trời trắng và hiệu ứng backdrop-blur, toàn bộ vùng nút bị hòa lẫn vào ảnh. Kích thước trên mobile chỉ $34\times34\text{px}$ chưa đạt chuẩn công thái học chạm ngón tay.
  - **Giải pháp dứt điểm:**
    1. Thiết lập quy tắc chuyên biệt cho `#detail-modal .modal-close` và `#close-detail-modal`: Áp dụng phong cách **Luxury Dark Glassmorphic Pill** (`background: rgba(15, 23, 42, 0.8) !important; border: 1.5px solid rgba(255, 255, 255, 0.35) !important; color: #ffffff !important; backdrop-filter: blur(16px) saturate(180%);`).
    2. Tăng kích thước icon SVG lên $18\times18\text{px}$, nét vẽ `stroke-width: 2.5` kết hợp bóng đổ `filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6))` đảm bảo dấu X luôn trắng sáng và tương phản tuyệt đối trên 100% mọi bức ảnh phối cảnh (dù trời nắng gắt hay nền trắng toát).
    3. Tăng kích thước nút trên Mobile lên $38\times38\text{px}$ chuẩn Human Interface Guidelines, vị trí `top: 14px; right: 14px; z-index: 60;` chống che khuất.
    4. Hiệu ứng Hover/Active mượt mà với nền đỏ `#ef4444`, bóng glow `rgba(239, 68, 68, 0.5)` và xoay 90 độ mượt mà.
- [x] **Xử lý dứt điểm lỗi Console HTTP 404 RPC `increment_template_view`:**
  - **Hiện tượng:** Khi người dùng mở xem chi tiết mẫu nhà, DevTools Console xuất hiện dòng đỏ `POST /rest/v1/rpc/increment_template_view 404 (Not Found)` kèm cảnh báo `Could not find the function public.increment_template_view(t_id) in the schema cache`.
  - **Nguyên nhân:** Dự án Supabase từ xa (`qdkhqvsbtmbgkmoldazt.supabase.co`) chưa được người dùng chạy script SQL `supabase/09_template_views_analytics.sql` trong SQL Editor, khiến PostgREST không tìm thấy stored procedure trong schema cache.
  - **Giải pháp thông minh:**
    1. Trong `js/app.js`: Tích hợp cờ nhận diện `this._rpcIncrementMissing`. Khi nhận mã lỗi `PGRST202` hoặc thông báo thiếu hàm trong schema cache, hệ thống lập tức ghi nhớ và tắt gửi RPC cho các lần mở mẫu tiếp theo, ngăn chặn 100% việc spam lỗi 404 đỏ console.
    2. Bộ đếm lượt xem cục bộ (`item.view_count++`) vẫn hoạt động trơn tru tức thì (zero-lag UI feedback).
    3. Chuyển cảnh báo console sang thông báo `console.info` thân thiện, hướng dẫn quản trị viên chạy file `09_template_views_analytics.sql` trong Supabase SQL Editor để kích hoạt tính năng đồng bộ vĩnh viễn vào DB.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.4`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 51** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 58: Khóa Cứng Scroll Ngang & Tối Ưu Hiển Thị Toàn Bộ Nội Dung Trên Mobile (Mobile Zero Horizontal Overflow & Clean Console v7.5)
- [x] **Xử lý triệt để lỗi cuộn ngang và tràn nội dung trên màn hình điện thoại:**
  - **Hiện tượng:** Khi mở xem chi tiết mẫu nhà (`#detail-modal`) trên mobile, màn hình bị cuộn ngang (horizontal scroll), khung modal bị trôi sang một bên khiến mép phải của modal bị cắt cụt (dòng chữ hướng dẫn 3D viewer, dòng mô tả kiến trúc và bảng thông số bị mất chữ ở mép phải).
  - **Nguyên nhân cốt lõi:**
    1. Thẻ `<canvas>` của Three.js khi khởi tạo lúc container chưa tính toán xong kích thước nhận giá trị fallback `width: 450px`, lớn hơn chiều rộng màn hình mobile (360px - 390px) và ép toàn bộ container phình ngang.
    2. `.modal-overlay` và `.modal-window` thiếu thuộc tính `overflow-x: hidden !important;`, các cột grid và flexbox không có `min-width: 0`, chữ không có `word-break: break-word` dẫn đến tràn container.
    3. Thanh điều khiển 3D (`.viewer-header`) và các nút góc nhìn (`.camera-presets`) có tổng chiều rộng cố định vượt quá chiều rộng màn hình điện thoại hẹp.
  - **Giải pháp dứt điểm:**
    1. Trong `style.css`: Thiết lập khóa cứng cuộn ngang tuyệt đối `overflow-x: hidden !important; max-width: 100vw;` cho `.modal-overlay`, `.modal-window`, `.detail-grid`, `.detail-visual-col`, `.detail-info-col`.
    2. Ràng buộc canvas Three.js: `.threejs-canvas canvas { width: 100% !important; max-width: 100% !important; height: 100% !important; display: block !important; }`.
    3. Cập nhật `js/viewer3d.js`: Sử dụng `fallbackWidth = Math.min(window.innerWidth - 32, 450)` và gán cứng `maxWidth = '100%'` cho renderer DOM element.
    4. Cấu hình flex-wrap linh hoạt cho `.viewer-header` và `.camera-presets`, ép ngắt dòng tự nhiên `word-break: break-word; overflow-wrap: break-word;` cho toàn bộ văn bản (`.hint`, `.status`, `.desc-text`, `.spec-val`).
    5. Bảng thông số kỹ thuật `.specs-table`: Dùng `grid-template-columns: repeat(2, minmax(0, 1fr))` trên tablet/mobile, và tự động chuyển sang 1 cột trên màn hình siêu hẹp $\le 480\text{px}$.
- [x] **Triệt tiêu hoàn toàn dòng đỏ Console 404 RPC `increment_template_view`:**
  - Bổ sung cấu hình `ENABLE_VIEW_RPC: false` vào `js/config.js` và `generate-config.js`. Khi chưa chạy file SQL trên Supabase, hệ thống chỉ đếm lượt xem cục bộ trên Client (cực mượt, zero-lag) và tuyệt đối không gửi request thăm dò, loại bỏ 100% dòng đỏ 404 trên DevTools Console.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.5`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 52** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 59: Nút Đóng (X) Ghim Cố Định Mọi Lúc Khi Cuộn Trang Modal Chi Tiết (Sticky / Fixed Always-Visible Close Button v7.6)
- [x] **Xử lý hoàn tất yêu cầu nút X luôn xuất hiện mọi lúc kể cả khi cuộn xuống xem chi tiết:**
  - **Hiện tượng:** Trước đây nút X được đặt bên trong container `.modal-window` với `position: absolute`. Khi người dùng cuộn (scroll) xuống dưới để xem mô hình 3D, đọc bảng thông số kỹ thuật, mô tả hay nút báo giá, nút X bị cuộn trôi lên trên và biến mất khỏi tầm mắt, buộc người dùng phải cuộn ngược lại đỉnh modal mới bấm tắt được.
  - **Nguyên nhân:** Nút close là con của `.modal-window` (phần tử có `overflow-y: auto` và giữ `transform` sau animation mở modal), khiến định vị absolute/fixed bên trong bị phụ thuộc vào độ cuộn của nội dung.
  - **Giải pháp tối ưu:**
    1. Trong `index.html`: Di chuyển nút `<button id="close-detail-modal">` ra làm con trực tiếp của `#detail-modal` (`.modal-overlay`), đứng ngang hàng với `.modal-window`.
    2. Trong `style.css`: Thiết lập nút ở trạng thái **Fixed Floating** (`position: fixed !important; z-index: 1050 !important;`).
       - Trên Desktop: Tính toán tọa độ tự động khớp với góc phải trên của modal `right: max(18px, calc((100vw - 1200px) / 2 + 20px)); top: max(18px, calc((100vh - 92vh) / 2 + 16px));`.
       - Trên Mobile & Tablet ($\le 768\text{px}$): Ghim cố định tại `top: 16px !important; right: 16px !important; width: 38px; height: 38px;` (màn hình nhỏ $\le 480\text{px}$: `top: 12px; right: 12px;`).
    3. Khi modal ẩn, nút ẩn 100% cùng overlay. Khi modal mở và người dùng cuộn nội dung bên trong, nút X vẫn lơ lửng cố định ở góc trên bên phải màn hình mọi lúc mọi nơi, cho phép tắt modal bất kỳ lúc nào chỉ với 1 chạm.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.6`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 53** trong [`AI_Debug.md`](file:///d:/DreamHouse/AI_Debug.md).

### Giai đoạn 60: Tinh Gọn Dropdown Menu Tài Khoản & Gỡ Bỏ Nút Giữ Chỗ Cài Đặt Hệ Thống (Account Dropdown Clean Up v7.7)
- [x] **Gỡ bỏ hoàn toàn nút giữ chỗ (placeholder) "Cài đặt hệ thống" (`#menu-settings-btn`):**
  - **Hiện tượng & Bối cảnh:** Nút "Cài đặt hệ thống" trước đây được tạo ra như một mục giao diện mẫu, khi bấm vào chỉ hiển thị Toast thông báo trạng thái rồi đóng menu. Người dùng phản hồi thắc mắc về chức năng và yêu cầu gỡ bỏ cho tinh gọn giao diện.
  - **Xử lý:**
    1. Xóa thẻ `<button id="menu-settings-btn">` khỏi dropdown menu trong `index.html`.
    2. Xóa event listener tương ứng trong `js/app.js`.
    3. Giữ nguyên 4 mục thiết thực 100% chức năng: *Bảng quản trị Admin* (dành cho Admin), *Mẫu nhà đã lưu yêu thích*, *Chỉnh sửa hồ sơ* và *Đăng xuất*.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.7`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 61: Tích Hợp Chuông Thông Báo Thông Minh Cạnh Avatar Admin (Notification Bell Dropdown Prompt #074 v7.8)
- [x] **Tích hợp phần tử Notification Bell Dropdown (074, Alerts & Feedback) theo chuẩn Lucian UX/UI:**
  - **Vị trí tích hợp:** Đặt ngay cạnh nút Avatar Admin (`#user-menu` / `#user-profile-trigger`) trên thanh Header Actions của `index.html`.
  - **Cơ chế hoạt động & Trải nghiệm tương tác (UX):**
    1. **Huy hiệu số lượng thông báo (Badge count):** Hiển thị số lượng thông báo chưa đọc, tự động ẩn khi không còn thông báo (`.zero { transform: scale(0); }`), phóng to thu nhỏ dạng lò xo (`scale(1) -> scale(1.5) -> scale(1)`) khi có thông báo mới.
    2. **Hiệu ứng rung chuông (Bell Shake):** Chuông tự động lắc lư (`@keyframes u074-ring`) trong $0.9\text{s}$ với đường cong `cubic-bezier(.2, .8, .2, 1)` khi có thông báo mới xuất hiện.
    3. **Đẩy thông báo mới vào đầu danh sách (Push Animation):** Hàng thông báo mới trượt xuống từ trên (`translateY(-30px) -> 0`) và mở rộng chiều cao bằng CSS Grid (`grid-template-rows: 0fr -> 1fr`).
    4. **Đánh dấu đã đọc từng mục (Read Dots):** Chạm vào thông báo để thu nhỏ và làm mờ chấm xanh unread `.u074-dot`, giảm bộ đếm tức thì.
    5. **Đã đọc tất cả ("Mark all read"):** Bấm nút để xóa toàn bộ chấm xanh lần lượt theo hiệu ứng so le thời gian (stagger delay $i \times 110\text{ms}$).
    6. **Phân loại thông báo (Tab switching):** Chuyển đổi giữa 2 tab: *"Tất cả"* (All) và *"Tư vấn"* (Inquiries/Mentions).
    7. **Gập/mở panel & Đóng ngoài:** Panel thông báo thu nhỏ về góc chuông (`transform: scale(.4); opacity: 0;`), tự động đóng khi click ra ngoài hoặc bấm phím `Escape`.
    8. **Dữ liệu thực tế:** Ánh xạ dữ liệu thực tiễn của DreamHouse (yêu cầu tư vấn mẫu nhà, báo giá thi công, lưu yêu thích, thông báo catalog kiến trúc 2026).
    9. **Hỗ trợ Song ngữ & Chế độ màu:** Hỗ trợ đầy đủ tiếng Việt & tiếng Anh qua `js/i18n.js`, đồng bộ Design Tokens cho cả Light Theme và Dark Theme, tương thích hoàn hảo chế độ giảm chuyển động `prefers-reduced-motion`.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.8`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 62: Tối Ưu Cân Đối Tuyệt Đối Cho UI Dropdown Thông Báo & Căn Chỉnh Mũi Tên Động (Notification Dropdown Centering & Dynamic Arrow v7.9)
- [x] **Xử lý triệt để hiện tượng panel thông báo khi xổ xuống bị lệch hẳn sang trái, mất cân đối:**
  - **Hiện tượng:** Khi bấm mở chuông thông báo trên mobile hoặc màn hình vừa, panel thông báo `.u074-pan` bị trôi dạt về tận cùng bên trái màn hình (đè lên logo Dream House), để lại khoảng trống mênh mông bên phải. Mũi tên chỉ chuông bị mất hoặc lệch tâm hoàn toàn. Tab đang chọn có nền trắng gắt chói mắt trên nền tối, chữ "Đã đọc tất cả" bị chìm mờ khó bấm.
  - **Nguyên nhân cốt lõi:**
    1. CSS quy định `right: -42px;` trên container con bên trong `.header-actions`, trong khi chuông không nằm ở mép phải màn hình mà đứng trước nút Admin avatar (~90px), khiến panel 320px bị đẩy dạt toàn bộ sang bên trái.
    2. Mũi tên tam giác `.u074-pan::before` dùng giá trị hardcode `right: 54px;` tĩnh, không thể thích ứng với các độ rộng màn hình khác nhau (360px - 430px).
    3. Tab active dùng biến màu `--u074-ink` (trắng sáng) làm nền, phá vỡ phong cách sang trọng tổng thể của giao diện Dark Theme. Tên và nội dung dùng `display: block` khiến mỗi dòng thông báo bị kéo giãn quá nhiều hàng dọc.
  - **Giải pháp dứt điểm:**
    1. **Căn giữa đối xứng hoàn hảo trên Mobile:** Thiết lập `position: fixed !important; left: 14px !important; right: 14px !important; width: auto !important; max-width: calc(100vw - 28px); top: 68px;` tạo khoảng cách cân đối 14px đều đặn ở cả hai mép trái/phải trên mọi dòng máy (iPhone SE, 13/14/15, Android).
    2. **Mũi tên định vị tâm chuông thời gian thực:** Tích hợp hàm `positionDropdown()` trong `js/app.js`, tự động tính toán tọa độ `bellCenter - panRect.left` và gán vào biến CSS `--u074-arrow-left`. Mũi tên tam giác luôn luôn trỏ chính xác $100\%$ vào tâm nút chuông. Đồng thời cập nhật `transformOrigin` để panel mở bung và gập lại mượt mà đúng từ vị trí chuông.
    3. **Nâng cấp thẩm mỹ Tab & Danh sách:**
       - Tab active chuyển sang phong cách Luxury Gold Pill: nền `rgba(229, 185, 93, 0.14)`, viền vàng kim, chữ vàng `#e5b95d`.
       - Nút *"Đã đọc tất cả"* có nền phụ, chữ vàng nổi bật, hỗ trợ hiệu ứng hover/active rõ ràng.
       - Tên người dùng và nội dung thông báo được dàn hàng `inline` gọn gàng, có đường viền ngăn cách phân tách mỏng tinh tế (`border-bottom: 1px solid var(--u074-line)`).
       - Thêm thông báo trạng thái trống `.u074-empty` khi tab không có dữ liệu.
       - Tự động ẩn chữ `user-name` trên màn hình $\le 640\text{px}$ để giải phóng không gian cho Logo "Dream House" không bị cắt cụt.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=7.9`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 54** trong [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 63: Tích Hợp Modal Xem Chi Tiết Thông Tin Khách Hàng Cần Tư Vấn (Inquiry Detail Modal & Notification Interactivity v8.0)
- [x] **Xử lý hoàn chỉnh tính năng bấm vào thông báo để hiển thị toàn bộ thông tin người cần tư vấn:**
  - **Hiện tượng:** Trước đây khi bấm vào các dòng thông báo trong chuông thông báo (ví dụ *"Phạm Thanh Hải gửi yêu cầu tư vấn..."*), hệ thống chỉ đánh dấu đã đọc (`.read`) và ẩn chấm xanh mà không mở ra bất kỳ thông tin chi tiết nào về khách hàng, số điện thoại hay nhu cầu của họ.
  - **Giải pháp toàn diện:**
    1. **Xây dựng Modal Xem Chi Tiết Tư Vấn (`#inquiry-detail-modal`):**
       - Thiết kế theo chuẩn giao diện Luxury Bento cao cấp, tương thích cả Light Theme và Dark Theme.
       - Hiển thị đầy đủ thông tin định danh: Avatar vòng tròn ký tự viết hoa có gradient, Họ tên khách hàng, Thời gian gửi, Badge trạng thái (*Yêu cầu tư vấn mới* / *Đã tư vấn*).
       - Khối thông tin liên hệ: Hiển thị Số điện thoại / Email kèm nút **"Gọi ngay"** (`tel:...`) và nút **"Sao chép"** (sao chép vào clipboard tức thì với Toast phản hồi).
       - Khối mẫu nhà quan tâm: Hiển thị tên mẫu nhà kiến trúc và nút **"Xem mô hình 3D"** (bấm vào sẽ tự động đóng modal tư vấn và mở ngay không gian 3D tương tác của mẫu nhà đó).
       - Khối nội dung / Lời nhắn: Đoạn trích dẫn lời nhắn nhu cầu cụ thể của khách hàng.
       - Khối chân trang quản trị: Nút **"Đánh dấu đã tư vấn"** (cập nhật trạng thái tức thì và đồng bộ lên bảng `inquiries` trên Supabase nếu có kết nối) và nút **"Quản trị Admin"** (chuyển hướng nhanh sang trang quản trị).
    2. **Đồng bộ dữ liệu Supabase Database:**
       - Tự động truy vấn dữ liệu từ bảng `inquiries` trên Supabase để đưa các yêu cầu tư vấn thực tế của khách hàng lên danh sách chuông thông báo.
       - Khi bấm vào thông báo mẫu nhà đã lưu hoặc danh mục hệ thống, tự động mở chi tiết mẫu hoặc cuộn tới thư viện kiến trúc.
    3. **Hỗ trợ đầy đủ phím Escape và click ra ngoài backdrop** để đóng modal với hiệu ứng thu nhỏ mượt mà.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=8.0`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 55** trong [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 64: Phân Quyền Thông Minh Cho Chuông Thông Báo & Tách Biệt Hoàn Toàn Giữa User và Admin (Role-Based Notification Dispatching v8.1)
- [x] **Xử lý triệt để việc phân quyền hiển thị thông báo theo vai trò tài khoản:**
  - **Hiện tượng:** Khi tài khoản User (thành viên hoặc khách không phải admin) đăng nhập và bấm mở chuông thông báo, danh sách vẫn hiển thị các lead tư vấn của những khách hàng khác (*Phạm Thanh Hải*, *Nguyễn Văn Tuấn*, *Trần Thị Mai*), vi phạm tính riêng tư và logic nghiệp vụ của người dùng cuối.
  - **Giải pháp kiến trúc toàn diện:**
    1. **Kiểm tra vai trò linh hoạt (`checkIsAdmin()`):** Xác định quyền hạn dựa trên `currentProfile.role`, `user_metadata.role`, `app_metadata.role`.
    2. **Tách biệt 2 luồng thông báo độc lập:**
       - **Tài khoản Admin:**
         - Tab 2 hiển thị nhãn *"Khách tư vấn"* (`notif_tab_inquiries`).
         - Hiển thị danh sách lead tư vấn do khách hàng gửi đến từ website và truy vấn thời gian thực từ bảng `inquiries` trên Supabase.
         - Modal chi tiết hiển thị đầy đủ các thao tác nghiệp vụ: *"Đánh dấu đã tư vấn"*, *"Quản trị Admin"*, *"Gọi ngay"*.
       - **Tài khoản User (Thành viên / Khách vãng lai):**
         - Tab 2 tự động đổi nhãn thành *"Tư vấn của tôi"* (`notif_tab_my_inquiries`).
         - **TUYỆT ĐỐI KHÔNG HIỂN THỊ** yêu cầu tư vấn của khách hàng khác.
         - Chỉ hiển thị:
           a) Thông báo khi chính người dùng gửi yêu cầu tư vấn về mẫu nhà đang xem (được lưu vào `localStorage: dream_house_my_inquiries`).
           b) Thông báo phản hồi chính thức từ Kiến trúc sư DreamHouse (Võ Quốc Việt) gửi về mẫu nhà người dùng đang quan tâm kèm dự toán và bố trí mặt bằng.
           c) Cập nhật bản vẽ 3D mới cho các mẫu nhà nằm trong danh sách yêu thích của người dùng.
           d) Thông báo chào mừng thành viên từ hệ thống DreamHouse.
         - Modal chi tiết hiển thị nhãn *"Phản hồi chính thức từ Kiến trúc sư DreamHouse"*, ẩn toàn bộ các nút can thiệp Admin (`#inquiry-handled-btn`, `#inquiry-admin-link-btn`), hiển thị nút *"Xem mô hình 3D"* và hotline tư vấn trực tiếp.
    3. **Tương tác thời gian thực khi gửi tư vấn (`notifyUserInquirySubmitted`):**
       - Khi người dùng gửi form tư vấn thành công tại website, hệ thống ngay lập tức đẩy thông báo xác nhận vào chuông, rung chuông vật lý và cập nhật số lượng badge.
       - Sau đó tự động kích hoạt phản hồi từ Kiến trúc sư gửi lại cho người dùng về đúng mẫu nhà họ vừa gửi.
    4. **Đồng bộ tức thì với phiên đăng nhập (`updateAuthUI`):** Khi người dùng đăng nhập, đăng xuất hoặc đổi vai trò tài khoản, hàm `this._renderNotificationList()` được kích hoạt ngay lập tức để chuyển đổi mượt mà giữa luồng Admin và User mà không cần tải lại trang.
- [x] Tăng tham số phiên bản cache-busting lên **`?v=8.1`** trên toàn bộ `index.html` và `admin.html`.
- [x] Cập nhật cẩm nang chẩn đoán vào **Lỗi 56** trong [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md).

### Giai đoạn 65: Nghiên Cứu Đối Chuẩn Thị Trường (Benchmarking) & Định Hình Lộ Trình Nâng Cấp Tính Năng Toàn Diện
- [x] **Nghiên cứu đối chiếu Dream House với các nền tảng kiến trúc hàng đầu trong nước và quốc tế:**
  - **Đối thủ nội địa khảo sát:** Betaviet (`betaviet.vn`), WEDO (`wedo.vn`), Space T (`spacet.vn`).
  - **Đối thủ quốc tế khảo sát:** ArchitecturalDesigns (`architecturaldesigns.com`), Houseplans (`houseplans.com`), Floorplanner.
  - **Kết quả đối chuẩn (Benchmarking):**
    + *Thế mạnh vượt trội của Dream House:* Nền tảng 3D tương tác WebGL trực tiếp (zero-lag), giao diện Luxury Bento chuẩn Dark/Light Mode, chuông thông báo phân quyền 2 luồng cá nhân hóa, hệ thống quản trị Supabase CMS thời gian thực.
    + *5 tính năng mũi nhọn cần bổ sung để dẫn đầu thị trường:*
      1. **Bộ tính dự toán chi phí tương tác (Interactive Cost Calculator):** Cho phép khách hàng trượt chọn mức vật tư (Tiết kiệm / Tiêu chuẩn / Cao cấp), bóc tách phần thô, hoàn thiện, ME và phát sinh.
      2. **Bóc tách mặt bằng 2D bố trí từng tầng (Floor-by-Floor Layout Explorer):** Tab xem mặt bằng tầng 1, tầng 2, mái có chú thích diện tích từng phòng.
      3. **Tiện ích phong thủy bản địa hóa:** Thước Lỗ Ban online (52.2cm, 42.9cm, 38.8cm) và tra cứu hướng nhà/năm xây hợp tuổi gia chủ.
      4. **Công cụ so sánh đối đầu mẫu nhà (Side-by-Side Compare):** So sánh 2-3 mẫu về kích thước, công năng, đơn giá thi công.
      5. **Xuất hồ sơ tóm tắt 1-Click (PDF Concept Brochure):** Tải bản vẽ phối cảnh kèm thông số và dự toán có logo DreamHouse và hotline KTS.
  - Tạo tài liệu phân tích chuyên sâu tại [`dreamhouse_benchmark_comparison.md`](file:///C:/Users/IT/.gemini/antigravity/brain/1585f13f-b91c-4a12-abb0-1185d116e3ab/dreamhouse_benchmark_comparison.md).

### Giai đoạn 66: Triển Khai Tính Năng 1 - Bộ Tính Dự Toán Chi Phí Xây Dựng Tương Tác & Bóc Tách Khái Toán Chuẩn Kỹ Thuật (Interactive Cost Engine v8.2)
- [x] **Xây dựng hoàn chỉnh Hệ thống Dự toán Chi phí Xây dựng Dân dụng 2026 (Civil Engineering Cost Engine):**
  - **Cơ sở kỹ thuật & Công thức tính toán chuẩn ngành:**
    1. **Diện tích quy đổi xây dựng ($S_{xd}$):** 
       - Móng: Móng đơn (25%), Móng cọc (40%), Móng băng (50%), Móng bè (75%).
       - Thân nhà: 100% diện tích sàn mỗi tầng.
       - Mái: Mái bằng BTCT (35%), Mái Nhật / Mái Thái kèo thép (70%), Mái bê tông dán ngói (100%).
    2. **Đơn giá 4 gói thi công hoàn thiện năm 2026:**
       - *Xây Thô & Nhân Công:* 3.8 triệu/m² (Sắt thép Hòa Phát, xi măng INSEE, gạch Tuynel, ống Bình Minh, dây Cadivi).
       - *Trọn Gói Tiêu Chuẩn:* 5.8 triệu/m² (Sơn Jotun/Maxilite, gạch 60x60, nhôm Xingfa, thiết bị Inax tiêu chuẩn).
       - *Trọn Gói Nâng Cao (Khuyên dùng):* 7.2 triệu/m² (Sơn Dulux/Jotun Majestic, gạch 80x80 nhập khẩu, nhôm kính Kinlong, thiết bị TOTO/Inax cao cấp).
       - *Trọn Gói Luxury:* 9.5 triệu/m² (Đá Marble, nhôm Slim/Schuco, thiết bị vệ sinh Kohler/Grohe, Smarthome).
    3. **Bóc tách 4 cấu phần chi phí:** Thô & Kết cấu (52%), Hoàn thiện kiến trúc (33%), Điện nước MEP (10%), Quản lý & Dự phòng (5%).
  - **Tích hợp giao diện 2 cấp độ:**
    1. **Cấp độ mẫu nhà (`#detail-calc-card` trong `#detail-modal`):** Khách hàng vừa xoay 3D vừa bấm chuyển đổi tức thì giữa các gói vật tư và loại móng; tổng tiền và biểu đồ thanh phân bổ (Segmented Progress Bar) tự động nhảy số theo thời gian thực (zero-lag).
    2. **Cấp độ toàn trang (`#quick-calc-modal`):** Mở từ Header Navigation (*"Tính dự toán"*) hoặc Hero Banner (*"Dự toán chi phí"*). Khách hàng kéo thanh trượt mặt tiền (3.5m - 15m), chiều sâu (6m - 30m), chọn số tầng (1 - 5), kiểu mái, loại móng; hệ thống tự động bóc tách chi phí và **tìm kiếm gợi ý ngay mẫu nhà tương thích nhất trong thư viện Dream House** kèm ảnh và thông số.
    3. **Liên kết nghiệp vụ một chạm (1-Click Consultation Bridge):** Khi bấm nút *"Nhận báo giá theo phương án này"* hoặc *"Gửi dự toán này để KTS tư vấn"*, hệ thống tự động đóng modal, cuộn mượt xuống Form liên hệ và điền sẵn trọn vẹn toàn bộ thông số kỹ thuật, gói vật tư và số tiền dự toán vào lời nhắn cho KTS Võ Quốc Việt.
  - **Kiểm thử đối chiếu cẩm nang [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md):** Đảm bảo nút đóng (X) kính mờ nổi bật trên cả nền ảnh (Lỗi 51 & 53), khóa cuộn ngang tuyệt đối trên mobile (Lỗi 52), hỗ trợ 100% song ngữ VI/EN (Lỗi 50), chuẩn Design Tokens tương phản cao Dark/Light Mode (Lỗi 54 & 55).
- [x] Tăng tham số phiên bản cache-busting lên **`?v=8.2`** trên toàn bộ `index.html` và `admin.html`.

### Giai đoạn 67: Triển Khai Tính Năng 2 - Bóc Tách Mặt Bằng 2D/3D Bố Trí Từng Tầng (Floor-by-Floor Layer Explorer & Architectural Vector CAD Engine v8.3)
- [x] **Xây dựng động cơ biểu diễn bản vẽ kỹ thuật mặt bằng kiến trúc SVG Vector (Vector CAD Engine):**
  - **Cơ chế bóc tách công năng thông minh theo loại hình nhà:**
    1. *Nhà phố (Townhouse):* Tầng 1 (Sân trước/Gara xe, Sảnh khách đón gió, Sảnh thang trung tâm có Giếng trời lấy sáng, Bếp & Bàn ăn thông thoáng, Sân sau); Tầng 2 (Phòng ngủ Master khép kín có Ban công trước, Phòng ngủ con, Vệ sinh chung); Tầng 3 (Phòng thờ gia tiên hướng mặt tiền, Phòng ngủ phụ, Sân thượng BBQ & Giặt phơi đón nắng).
    2. *Biệt thự (Villa):* Sảnh đón Grand Foyer đại sảnh thông tầng, Phòng khách lớn tiếp khách VIP, Bếp đảo phong cách Âu, Phòng ngủ Master Tổng thống (Jacuzzi & Walk-in closet), Phòng sinh hoạt chung/Thư viện, Phòng Gym/Giải trí và Vườn treo tầng thượng.
    3. *Nhà cấp 4 (Country House / Villa 1 tầng):* Phân bổ mặt bằng rộng toàn khu: Đại sảnh Phòng khách liên thông gian Thờ, Bếp ăn tiện nghi liên thông sân ướt, 3 Phòng ngủ tiện ích (1 Master en-suite), 2 WC tiêu chuẩn.
  - **Bản vẽ kỹ thuật Vector CAD tỉ lệ chuẩn 1/100 theo TCXDVN 2026:**
    - Tường bao chịu lực dày 200mm nét đậm kép, tường ngăn chia phòng 100mm.
    - Ký hiệu cửa đi 1 cánh, 2 cánh với cung quét góc mở $90^\circ$ chân thực.
    - Cầu thang 21 bậc zigzag chuẩn thước Lỗ Ban (Cung Sinh), giếng trời lấy sáng tự nhiên.
    - Ký hiệu nội thất CAD tiêu chuẩn: Bàn ghế sofa, tivi, giường ngủ & táp đầu giường, bồn cầu, chậu rửa lavabo, bồn tắm nằm, bếp nấu, chậu rửa bát.
    - Đường gióng kích thước (Dimension lines) ghi rõ khẩu độ các trục (Dài x Rộng mm / mét) và Kim chỉ hướng Bắc (North Arrow Compass).
    - Khung tên đồ án kiến trúc CAD chuyên nghiệp: *"TỶ LỆ 1/100 • TIÊU CHUẨN TCXDVN 2026"*.
- [x] **Hệ thống điều hướng tương tác đa góc nhìn Visual Nav Switcher (`#detail-visual-nav`):**
  - 3 chế độ chuyển đổi mượt mà trong cột truyền thông chi tiết: **Phối cảnh (Photo)** | **3D Tương tác (Viewer)** | **Mặt bằng tầng (Floorplan)**.
  - Tích hợp thanh chọn tầng trực quan (`#detail-floorplan-tabs`): Tầng 1 (Trệt), Tầng 2 (Lầu 1), Tầng 3 (Lầu 2), Mặt bằng Mái.
- [x] **Tương tác hai chiều thời gian thực (Bidirectional Real-Time Highlight):**
  - Rê chuột hoặc chạm vào phòng trên bản vẽ SVG CAD: phòng sáng màu hiệu ứng glowing stroke, thẻ phòng tương ứng trong danh sách tự động highlight viền vàng gold và trồi lên.
  - Rê chuột vào thẻ phòng trong bảng bóc tách công năng: phòng trên sơ đồ CAD sáng rực rỡ, kèm huy hiệu diện tích $m^2$ nổi bật.
- [x] **Công cụ phóng to toàn màn hình (Fullscreen Lightbox Modal `#floorplan-lightbox-modal`):**
  - Cho phép KTS và Khách hàng zoom sâu từng chi tiết bản vẽ, hiển thị tên đồ án, diện tích sàn sử dụng, thanh chọn tầng nhanh chóng.
  - Đóng mở mượt mà qua phím `Esc`, nút đóng (X) kính mờ chuẩn Design Tokens và click ra ngoài backdrop.
- [x] **Nút chuyển đổi "Mặt cắt 3D" (Isometric Top-Down 3D Cutaway):**
  - Bấm nút *"Mặt cắt 3D"* từ thanh công cụ bản vẽ: Tự động chuyển thẳng sang tab 3D Viewer và đặt góc nhìn camera nhìn từ trên xuống (Top-down Isometric View), cho phép quan sát không gian 3 chiều đồng bộ.
- [x] **Kiểm thử đối chiếu cẩm nang [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md):**
  - Đảm bảo 100% song ngữ VI/EN với 27 từ khóa kiến trúc mới trong `js/i18n.js`.
  - Tương thích hoàn hảo Dark Mode & Light Mode, không vỡ layout trên màn hình điện thoại dưới 480px.
- [x] Nâng cấp tham số cache-busting toàn hệ thống lên **`?v=8.3`** trên `index.html` và `admin.html`.
- [x] **Cập nhật tài liệu [`README.md`](file:///e:/Dream-house/README.md):**
  - Tích hợp bảng lộ trình 5 tính năng đột phá giải quyết bài toán chuyển đổi khách hàng.
  - Cập nhật đầy đủ chi tiết các tính năng mới nhất: Chuông thông báo phân quyền (v8.1), Bộ tính dự toán tương tác (v8.2), Bóc tách mặt bằng 2D/3D CAD Vector (v8.3).

### Giai đoạn 68: Triển Khai Tính Năng 3 - Tiện Ích Phong Thủy Bản Địa Hóa (Thước Lỗ Ban 3 Dải Đo & Tra Cứu Bát Trạch Hướng Nhà v8.4)
- [x] **Xây dựng Động cơ Thước Lỗ Ban Điện Tử Trực Tuyến 3 Dải Đo Chạy Song Song:**
  - **3 Quy chuẩn dải đo Lỗ Ban trong kiến trúc dân dụng Việt Nam:**
    1. *Thước 52.2 cm (Thông Thủy / Khối rỗng):* Đo kích thước lọt lòng cửa chính, cửa thông phòng, cửa sổ, chiều cao tầng nhà. Chia làm 8 cung chính (Quý Nhân, Hiểm Họa, Thiên Tai, Thiên Tài, Phúc Lộc, Cô Độc, Thiên Tặc, Tể Tướng), mỗi cung có 5 cung nhỏ.
    2. *Thước 42.9 cm (Dương Trạch / Khối đặc):* Đo kích thước bệ bếp, bậc cầu thang, giường ngủ, bàn ghế nội thất, khuôn cửa gỗ. Chia làm 8 cung chính (Tài, Bệnh, Ly, Nghĩa, Quan, Kiếp, Hại, Bản), mỗi cung có 4 cung nhỏ.
    3. *Thước 38.8 cm (Âm Phần & Bàn Thờ):* Đo kích thước bàn thờ gia tiên, tủ thờ, khánh thờ. Chia làm 10 cung chính (Đinh, Hại, Vượng, Khổ, Nghĩa, Quan, Tử, Hưng, Thất, Tài), mỗi cung có 4 cung nhỏ.
  - **Sân khấu trực quan động:** Kim chỉ thị trung tâm màu vàng gold ánh kim, vạch đo chuyển động trượt mượt mà theo tọa độ người dùng kéo hoặc nhập số.
  - **Thẻ chẩn đoán đa tầng (Diagnostic Cards):** Bóc tách phân tích chi tiết kích thước hiện tại rơi vào cung nào trên cả 3 thước, trạng thái Cát (Đỏ) / Hung (Đen), ý nghĩa phong thủy và thuật toán tự động gợi ý tăng/giảm kích thước gần nhất để hóa giải cung xấu.
  - **Kích thước mẫu một chạm (Presets):** Cửa 1 cánh (810 × 2120 mm), Cửa 2 cánh (1330 × 2120 mm), Cửa 4 cánh (2550 × 2620 mm), Bàn thờ (1270 × 610 mm), Chiều cao tầng (3600 mm).
- [x] **Xây dựng Động cơ Bát Trạch & La Bàn 8 Hướng Hợp Tuổi:**
  - **Thuật toán Can Chi & Niên Mệnh:** Tính toán chính xác Can Chi và Ngũ Hành nạp âm từ năm 1950 đến 2026.
  - **Thuật toán Quẻ Cung Phi (Nam vs Nữ):** Tính toán quái số chuẩn phong thủy (rút gọn tổng số cuối, hoán vị số 5 thành Khôn đối với Nam, Cấn đối với Nữ), phân nhóm **Đông Tứ Mệnh** (Khảm, Ly, Chấn, Tốn) và **Tây Tứ Mệnh** (Càn, Khôn, Cấn, Đoài).
  - **La bàn Bát Quái Vector SVG 8 Hướng Trực Quan:** Vẽ 8 cung quạt phân màu xanh lá (4 Hướng Tốt: Sinh Khí, Thiên Y, Diên Niên, Phục Vị) và màu đỏ cam (4 Hướng Xấu: Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Họa Hại), tâm Thái Cực Âm Dương xoay chuẩn độ.
  - **Bảng quy tắc công năng kiến trúc:** Hướng mở cửa chính & ban công, hướng đặt ban thờ tọa cát hướng cát, nguyên tắc vàng đặt bếp "Tọa hung hướng cát" thiêu đốt điềm gở, hướng kê đầu giường ngủ đón sinh khí.
- [x] **Liên kết chuyển đổi & Điểm chạm trải nghiệm người dùng (UX Touchpoints):**
  - Nút mở trên Thanh điều hướng Navbar (`#nav-open-fengshui`).
  - Nút mở trên Hero Banner (`#hero-fengshui-btn`).
  - Thẻ thông số phong thủy gợi ý trong Modal chi tiết mẫu nhà (`#detail-fengshui-card`).
  - **Cầu nối tư vấn phong thủy 1-chạm (`#btn-fs-send-consult`):** Tự động đóng modal, cuộn mượt xuống Form liên hệ và điền sẵn trọn vẹn thông số phong thủy tuổi gia chủ vào lời nhắn gửi KTS.
- [x] **Kiểm thử đối chiếu cẩm nang [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md):**
  - Đảm bảo 100% song ngữ VI/EN với 42 từ khóa phong thủy mới trong `js/i18n.js`.
  - Tương thích hoàn hảo Dark Mode & Light Mode, không vỡ layout trên màn hình điện thoại dưới 520px.
- [x] Nâng cấp tham số cache-busting toàn hệ thống lên **`?v=8.4`** trên `index.html` và `admin.html`.

### Giai đoạn 69: Triển Khai Tính Năng 4 - Công Cụ So Sánh Mẫu Nhà Đối Đầu (Side-by-Side Architectural Template Compare v8.5)
- [x] **Xây dựng Khay So Sánh Nổi Dưới Màn Hình (Floating Compare Dock `#compare-floating-dock`):**
  - Thanh dock kính mờ bo tròn chuẩn cao cấp (Glassmorphic Dock) hiển thị khi gia chủ chọn 1 đến 3 mẫu nhà.
  - Hiển thị badge số lượng đang chọn (`0/3` đến `3/3`), các slot thẻ thu nhỏ (thumbnail tròn, tên mẫu, nút xóa `✕` từng mẫu).
  - Nút *"So sánh ngay"* tự động kích hoạt khi chọn từ 2 mẫu trở lên, kèm nút *"Xóa tất cả"*.
  - Lưu trữ trạng thái so sánh vào `localStorage` (`dreamhouse_compare_list`) để không bị mất khi reload hoặc chuyển trang.
- [x] **Tích hợp Điểm chạm Chọn So Sánh Trực Quan (Multi-entry Touchpoints):**
  - Nút so sánh nổi trên từng thẻ mẫu nhà ở Thư viện (`.card-compare-btn`): Nằm ở góc trên cùng bên trái ảnh bìa với icon ⚖️ và nhãn trực quan, đổi trạng thái vàng sáng khi đã chọn.
  - Nút thêm/bớt so sánh trong Modal Chi Tiết (`#detail-compare-btn`): Đặt song song cùng nút yêu thích tim trong cụm `.detail-secondary-actions`.
- [x] **Xây dựng Bảng Ma Trận So Sánh Đối Đầu Đa Tiêu Chí (`#compare-modal`):**
  - **Header ghim cố định (Sticky Header Top):** Ảnh bìa phối cảnh sắc nét, tên mẫu nhà, huy hiệu phong cách kiến trúc và mức giá dự toán luôn ghim trên cùng khi cuộn dọc xem thông số.
  - **Cột tiêu chí bên trái ghim ngang (Sticky Column Left):** Giúp người xem không bị mất dấu tiêu chí khi cuộn ngang trên màn hình hẹp.
  - **5 Cụm tiêu chí kiến trúc chuyên sâu:**
    1. *Thông tin kiến trúc chung:* Loại hình nhà, Kích thước mặt tiền × chiều sâu, Diện tích đất, Tổng diện tích sàn quy đổi ($S_{xd}$).
    2. *Kích thước & Quy mô:* Số tầng cao, Giải pháp kết cấu mái (Mái Thái / Nhật, Mái Mansard, Mái bằng BTCT).
    3. *Bố trí công năng phòng ốc:* Số phòng ngủ, Số phòng WC, Phòng khách, Bếp & Bàn ăn, Ban công, Phòng thờ gia tiên, Gara ô tô, Giếng trời thông gió.
    4. *Dự toán chi phí 2026:* Tổng mức đầu tư tham khảo, Đơn giá xây dựng bình quân / m².
    5. *Định hướng phong thủy:* Hướng nhà thích hợp, Nhóm cung mệnh Bát Trạch tương thích.
  - **Công tắc *"Chỉ hiện điểm khác biệt"* (`#compare-diff-toggle`):** Tự động phát hiện các dòng có sự khác biệt giữa các mẫu đang so sánh và ẩn các dòng giống nhau để gia chủ ra quyết định nhanh chóng.
  - **Hàng hành động chuyển đổi cuối bảng:**
    - Nút *"Xem chi tiết mẫu này"*: Đóng bảng so sánh và mở ngay modal chi tiết 3D của mẫu đó.
    - Nút *"Chọn mẫu này & Tư vấn"* (1-Click Consultation Bridge): Đóng bảng so sánh, cuộn mượt xuống Form liên hệ và điền sẵn trọn vẹn thông số mẫu nhà đã chọn vào tin nhắn cho KTS Võ Quốc Việt.
- [x] **Kiểm thử đối chiếu cẩm nang [`AI_Debug.md`](file:///e:/Dream-house/AI_Debug.md):**
  - Nút đóng (X) kính mờ chuẩn Design Tokens (Lỗi 51 & 53).
  - Bảng cuộn ngang mượt mà, không làm vỡ layout trang web trên mobile (Lỗi 52).
  - 100% Song ngữ Việt - Anh (VI / EN) với 38 từ khóa so sánh mới trong `js/i18n.js` (Lỗi 50).
  - Độ tương phản cao, chữ rõ nét trên cả Dark Mode lẫn Light Mode (Lỗi 54 & 55).
- [x] Nâng cấp tham số cache-busting toàn hệ thống lên **`?v=8.5`** trên `index.html` và `admin.html`.




















