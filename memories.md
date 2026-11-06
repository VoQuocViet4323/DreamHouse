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













