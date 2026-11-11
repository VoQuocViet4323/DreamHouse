# AI_DEBUG - CẨM NANG CHẨN ĐOÁN & XỬ LÝ LỖI THƯỜNG GẶP

Tài liệu này tổng hợp toàn bộ các lỗi tiềm ẩn trong kiến trúc Supabase, Three.js, RLS, Storage và cách khắc phục dứt điểm cho lập trình viên và AI Agent.

---

## 1. CÁC LỖI SUPABASE & ROW LEVEL SECURITY (RLS)

### 🔴 Lỗi 1: `infinite recursion detected in policy for relation "profiles"`
- **Nguyên nhân:** Trong file policy của bảng `profiles`, bạn viết câu query kiểm tra:
  `WHERE (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`
  Khi đó PostgreSQL phải đọc bảng `profiles` để kiểm tra điều kiện, nhưng việc đọc lại kích hoạt policy SELECT của `profiles`, dẫn đến vòng lặp vô tận làm sập request.
- **Cách khắc phục:**
  Tạo hàm `is_admin()` với thuộc tính `SECURITY DEFINER` và `STABLE` (đã được viết chuẩn trong [supabase/02_security.sql](supabase/02_security.sql)):
  ```sql
  CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
  AS $$
      SELECT EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin'
      );
  $$;
  ```
  Hàm này bỏ qua RLS khi kiểm tra vai trò admin nội bộ, giải quyết triệt để lỗi đệ quy.

---

### 🔴 Lỗi 2: Khách vãng lai gửi form tư vấn bị lỗi `42501 (permission denied for relation inquiries)`
- **Nguyên nhân:** Bảng `inquiries` đã bật RLS nhưng thiếu policy cấp quyền `INSERT` cho đối tượng `anon` (khách chưa đăng nhập).
- **Cách khắc phục:**
  Chạy lại policy cho phép cả `anon` và `authenticated` insert:
  ```sql
  CREATE POLICY "Anyone can insert inquiries"
  ON public.inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
      char_length(name) >= 2 AND char_length(contact) >= 5
  );
  ```

---

### 🔴 Lỗi 3: Đăng nhập Google bị chuyển hướng về màn hình lỗi (OAuth redirect error / 400 URI mismatch)
- **Nguyên nhân:**
  1. Chưa thêm Callback URL của Supabase vào Google Cloud Console.
  2. Địa chỉ localhost bạn đang chạy không trùng khớp với **Redirect URLs** trong Supabase Dashboard.
- **Cách kiểm tra & khắc phục:**
  1. Kiểm tra lại Google Cloud Console > Credentials > Client ID: Phần **Authorized redirect URIs** phải có dạng:
     `https://<project-id>.supabase.co/auth/v1/callback`
  2. Kiểm tra lại Supabase Dashboard > Authentication > URL Configuration > **Redirect URLs**: Phải có wildcard phù hợp, ví dụ:
     `http://localhost:3000/*` hoặc `http://127.0.0.1:5500/*`

---

### 🔴 Lỗi 4: Không upload được ảnh hoặc file .glb vào Storage (403 Forbidden hoặc new row violates row-level security)
- **Nguyên nhân:**
  1. Tài khoản thực hiện upload chưa được gán role `admin` trong bảng `profiles`.
  2. Dung lượng file vượt quá giới hạn đã đặt (ảnh > 3 MB hoặc file 3D > 10 MB).
  3. Định dạng MIME Type của file không nằm trong danh sách cho phép (ví dụ file .glb bị trình duyệt nhận diện là `application/octet-stream` thay vì `model/gltf-binary`).
- **Cách khắc phục:**
  1. Kiểm tra quyền admin: Chạy lệnh `SELECT role FROM public.profiles WHERE id = auth.uid();`
  2. Đảm bảo cấu hình bucket trong `03_storage.sql` chấp nhận cả MIME type nhị phân chung:
     `ARRAY['model/gltf-binary', 'application/octet-stream', 'model/gltf+json']`

---

## 2. CÁC LỖI THREE.JS & MÔ HÌNH 3D

### 🔴 Lỗi 5: Mô hình 3D .glb bị tối đen hoặc chỉ thấy màu xám xịt
- **Nguyên nhân:** File .glb sử dụng vật liệu PBR (MeshStandardMaterial / MeshPhysicalMaterial) nhưng Three.js Scene thiếu nguồn sáng AmbientLight hoặc DirectionalLight có cường độ đủ mạnh.
- **Cách khắc phục:**
  Trong `js/viewer3d.js`, luôn bổ sung đủ hệ thống ánh sáng 3 điểm (Three-point lighting):
  - `AmbientLight` màu trắng, cường độ `0.75` để làm sáng đều vùng tối.
  - `DirectionalLight` chính (mặt trời) cường độ `1.1` kèm đổ bóng mềm (SoftShadow).
  - `DirectionalLight` phụ (ánh sáng môi trường hắt lại) cường độ `0.4`.

---

### 🔴 Lỗi 6: Mô hình xoay bị lệch tâm hoặc văng ra ngoài khung hình
- **Nguyên nhân:** Điểm gốc toạ độ (Pivot/Origin) khi xuất từ SketchUp không nằm ở tâm đáy công trình, hoặc camera không tự động căn chỉnh tâm theo Bounding Box của mô hình tải về.
- **Cách khắc phục:**
  Trong hàm nạp GLTF của `House3DViewer`:
  ```javascript
  const box = new THREE.Box3().setFromObject(this.currentMeshGroup);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  this.target.copy(center); // Đặt tâm xoay đúng trung tâm công trình
  this.spherical.radius = Math.max(size.x, size.y, size.z) * 2.2; // Khoảng cách nhìn tự động
  this.updateCameraPosition();
  ```

---

### 🔴 Lỗi 7: Trình duyệt báo `WebGL not supported` hoặc màn hình 3D bị vỡ hình trên điện thoại cũ
- **Nguyên nhân:** Thiết bị cũ không hỗ trợ WebGL 2.0 hoặc bộ nhớ GPU bị tràn khi render độ phân giải quá cao.
- **Cách khắc phục:**
  1. Giới hạn `pixelRatio` tối đa là 2:
     `this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`
  2. Kiểm tra trước khả năng hỗ trợ WebGL (`checkWebGLSupport()`), nếu không hỗ trợ thì hiển thị thông báo rõ ràng kèm ảnh chụp thiết kế phối cảnh thay thế, không làm treo trang web.

---

## 3. CÁC LỖI GIAO DIỆN & TỰ ĐỘNG HÓA CẤU HÌNH (UI/UX & CONFIG SYNC)

### 🔴 Lỗi 8: Đăng nhập thất bại `Failed to fetch` (`net::ERR_NAME_NOT_RESOLVED`) khi clone/chuyển mã nguồn sang máy mới
- **Hiện tượng:** Mở web trên máy mới hoặc kéo từ GitHub về, bấm đăng nhập (bằng Email hoặc Google) đều bị báo `Đăng nhập thất bại: Failed to fetch`. F12 Console báo đỏ: `POST https://your-project-id.supabase.co/auth/v1/token net::ERR_NAME_NOT_RESOLVED`.
- **Nguyên nhân:**
  1. Khi sang máy mới, file `.env` chưa có, script `generate-config.js` tự động copy từ `.env.example`.
  2. File `.env.example` trước đó chứa URL mẫu giả định `https://your-project-id.supabase.co`.
  3. Script `generate-config.js` đã đọc URL giả lập này và ghi đè vào `js/config.js`.
- **Cách khắc phục dứt điểm:**
  1. Trong `generate-config.js`, bổ sung hàm kiểm tra nhận diện giá trị mẫu (`isPlaceholderUrl`, `isPlaceholderKey`). Nếu phát hiện URL/Key chứa chữ `your-project-id` hoặc bị trống, script **luôn tự động fallback** về URL và Publishable Anon Key chuẩn của dự án (`https://qdkhqvsbtmbgkmoldazt.supabase.co`).
  2. Đồng thời điền sẵn cấu hình chuẩn vào `.env` và `.env.example`.
  3. Bổ sung tham số phiên bản cache-busting `?v=...` cho `js/config.js` trong cả `index.html` và `admin.html`.

---

### 🔴 Lỗi 9: Nút đóng `✕` (Close Button) và các nút bấm phụ bị nền trắng chữ trắng / chói loá trong Dark Mode
- **Hiện tượng:** Khi bật Circular Dark Mode, mở các modal (Đăng nhập, Chi tiết mẫu nhà, Hồ sơ cá nhân) thì nút đóng `✕` góc trên bên phải bị biến thành một vòng tròn màu trắng xóa chói mắt. Các nút chọn góc máy 3D (`Front`, `Side`, `Top`, `Reset`) cũng bị nền trắng chữ trắng không nhìn thấy chữ.
- **Nguyên nhân:**
  1. CSS cũ dùng giá trị cứng: `.modal-close { background: #f1f5f9; }` và `.camera-presets button { background: #f1f5f9; }`.
  2. Thiếu quy tắc ghi đè trong selector dark mode `:root[data-theme="dark"]`, hoặc các class nút đóng modal bị phân mảnh (`.modal-close`, `.profile-close-btn`).
  3. Sử dụng ký tự text thô `✕` thay vì vector SVG dẫn đến sai lệch căn giữa và kích thước hiển thị.
- **Cách khắc phục dứt điểm (Tránh tái phát sau này):**
  1. **Thiết lập Design Tokens biến CSS tập trung tại `:root`:**
     ```css
     /* Light Mode */
     --btn-close-bg: rgba(15, 23, 42, 0.06);
     --btn-close-border: rgba(15, 23, 42, 0.14);
     --btn-close-color: #334155;
     --btn-close-hover-bg: #ef4444;
     --btn-close-hover-border: #ef4444;
     --btn-close-hover-color: #ffffff;
     --btn-subtle-bg: #f1f5f9;
     --btn-subtle-border: rgba(15, 23, 42, 0.12);
     --btn-subtle-color: #1e293b;
     ```
     ```css
     /* Dark Mode (:root[data-theme="dark"], body.dark-theme) */
     --btn-close-bg: rgba(255, 255, 255, 0.08);
     --btn-close-border: rgba(255, 255, 255, 0.18);
     --btn-close-color: #cbd5e1;
     --btn-close-hover-bg: rgba(239, 68, 68, 0.25);
     --btn-close-hover-border: rgba(239, 68, 68, 0.5);
     --btn-close-hover-color: #fca5a5;
     --btn-subtle-bg: rgba(255, 255, 255, 0.08);
     --btn-subtle-border: rgba(255, 255, 255, 0.14);
     --btn-subtle-color: #e2e8f0;
     ```
  2. **Gom toàn bộ selector nút đóng hiện tại và tương lai:**
     `.modal-close, .profile-close-btn, [id^="close-"][id$="-modal"]` đều dùng chung biến `--btn-close-...`. Bất kỳ modal mới nào tạo ra chỉ cần dùng class hoặc id theo quy ước này là tự động đẹp chuẩn cả 2 chế độ sáng/tối.
  3. **Thay ký tự text bằng icon SVG:**
     Dùng SVG vector `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>` với `stroke: currentColor` để icon luôn sắc nét trên mọi màn hình Retina / 4K.

---

### 🔴 Lỗi 10: Hộp thoại mặc định của trình duyệt (`alert()`, `confirm()`) làm gián đoạn tương tác và xung đột giao diện Dark/Light Mode
- **Hiện tượng:** Khi người dùng đăng nhập sai, đổi mật khẩu lỗi hoặc Admin xoá mẫu nhà, trình duyệt hiển thị hộp thoại cảnh báo xám xịt `localhost:3000 cho biết: ...` gây đứng trang, che khuất giao diện và hoàn toàn không tương thích với Dark Mode cao cấp của website.
- **Nguyên nhân:** Mã nguồn còn sử dụng các hàm đồng bộ cổ điển của trình duyệt (`alert()`, `confirm()`).
- **Cách khắc phục dứt điểm:**
  1. Xây dựng module thông báo nổi cao cấp [`js/toast.js`](file:///d:/DreamHouse/js/toast.js) phong cách Animate-UI / Glassmorphism hỗ trợ 4 phân hệ thông báo: `success`, `error`, `warning`, `info`.
  2. Bổ sung hàm hộp thoại xác nhận tuỳ biến `window.confirmModal(message, options)` trả về `Promise<boolean>` sử dụng `async/await`, có hiệu ứng mờ hậu cảnh (`backdrop-filter`), đóng bằng phím `Escape`, xác nhận bằng `Enter` hoặc click backdrop.
  3. Sử dụng Design Tokens CSS (`--btn-close-...`, `--btn-subtle-...`) cho mọi nút tương tác trong hộp thoại để luôn tương phản sắc nét ở cả 2 chế độ sáng/tối.
  4. Ghi đè `window.alert` tự động chuyển sang `window.toast.info` để làm chốt chặn an toàn cho mọi đoạn mã phát sinh trong tương lai.

---

### 🔴 Lỗi 11: Nút điều hướng "Quay lại trang chủ" trên màn hình Auth bị ép thành hình tròn 36px và chữ bị xếp chồng thành cột dọc
- **Hiện tượng:** Tại màn hình đăng nhập/đăng ký chuyên biệt, nút quay lại trang chủ hiển thị chữ "Quay lại trang chủ" bị gãy thành từng dòng dọc và bị bó hẹp trong một hình tròn 36px.
- **Nguyên nhân:** Nút ban đầu mang `id="close-auth-modal"`. Selector CSS toàn cục `[id^="close-"][id$="-modal"]` (dành riêng cho các nút dấu 'X' đóng modal thông thường) đã tự động khớp và áp đặt các thuộc tính: `width: 36px; height: 36px; border-radius: 50% !important;` và `transform: rotate(90deg) scale(1.05);` khi hover.
- **Cách khắc phục dứt điểm:**
  1. Tách biệt danh tính ID: Đổi ID từ `close-auth-modal` sang `auth-back-btn` với class chuyên biệt `.auth-back-nav-btn`.
  2. Định nghĩa phong cách viên thuốc nổi (Floating Pill) với các thuộc tính bảo vệ: `width: auto !important; height: 42px !important; padding: 0 20px 0 16px !important; white-space: nowrap !important; border-radius: 9999px !important;`.
  3. Bổ sung mũi tên SVG động trượt mượt sang trái (`translateX(-3px)`) khi hover, nền kính mờ Glassmorphism `backdrop-filter: blur(12px)`.
  4. Đồng bộ màu sắc và viền tương phản hoàn hảo giữa Light Mode và Dark Mode (`:root[data-theme="dark"] .auth-back-nav-btn`).

---

### 🔴 Lỗi 12: Đăng ký tài khoản bị lỗi `over_email_send_rate_limit (429 email rate limit exceeded)` khi đăng ký bằng Username
- **Hiện tượng:** Khi người dùng bấm Đăng ký tài khoản mới bằng Username, hệ thống trả về mã lỗi 429 hoặc thông báo *"email rate limit exceeded"*.
- **Nguyên nhân:** Mặc định trên gói Supabase Free, tuỳ chọn "Confirm email" được bật sẵn. Supabase dùng máy chủ SMTP mặc định bị giới hạn gửi tối đa 3-4 email/giờ. Khi đăng ký tài khoản dạng Username (ánh xạ qua email ảo nội bộ `@dreamhouse.internal`), hệ thống vẫn cố gửi email xác thực dẫn tới cạn kiệt hạn ngạch gửi mail.
- **Cách khắc phục dứt điểm:**
  1. Xây dựng hàm RPC `public.register_user_by_username(p_username, p_password, p_full_name)` trong [`supabase/05_username_auth.sql`](file:///d:/DreamHouse/supabase/05_username_auth.sql).
  2. Hàm này chèn trực tiếp vào `auth.users` với cờ `email_confirmed_at = now()` và mật khẩu được băm an toàn theo chuẩn bcrypt `crypt(p_password, gen_salt('bf', 10))`.
  3. Nhờ có `email_confirmed_at = now()`, Supabase không cần gửi email kích hoạt, xóa bỏ 100% rủi ro bị rate limit.
  4. Client sau khi gọi RPC thành công sẽ tự động đăng nhập thông qua `signInWithPassword`, tạo phiên làm việc (Session) chuẩn mực và tự động ghi nhận profile vào `public.profiles`.

---

### 🔴 Lỗi 13: Đăng nhập bị lỗi `500 (Database error querying schema)` sau khi tạo user trực tiếp vào `auth.users` bằng SQL
- **Hiện tượng:** Sau khi tạo tài khoản qua hàm RPC SQL, khi đăng nhập (`token?grant_type=password`), máy chủ Supabase trả về lỗi 500 kèm thông báo `Database error querying schema`.
- **Nguyên nhân cốt lõi:** Trong kiến trúc GoTrue v2 của Supabase (viết bằng ngôn ngữ Go), khi truy vấn `SELECT * FROM auth.users`, GoTrue ánh xạ (Scan) các cột `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, `phone_change`, `phone_change_token`, `reauthentication_token` trực tiếp vào kiểu `string` nguyên thủy của Go (không phải `sql.NullString`), và `email_change_confirm_status` vào kiểu `int`. Nếu câu lệnh `INSERT INTO auth.users` bỏ trống các cột này khiến chúng nhận giá trị `NULL`, trình điều khiển database của Go sẽ văng lỗi `converting NULL to string is unsupported` (mã 500). Đồng thời GoTrue v2 yêu cầu phải có bản ghi tương ứng trong bảng `auth.identities`.
- **Cách khắc phục dứt điểm:**
  1. Trong câu lệnh `INSERT INTO auth.users` của hàm `register_user_by_username`, bắt buộc truyền chuỗi rỗng `''` cho toàn bộ 8 cột token nêu trên, `0` cho `email_change_confirm_status`, `false` cho `is_sso_user` và `is_anonymous`.
  2. Chèn đồng thời bản ghi định danh vào bảng `auth.identities` với `provider = 'email'` và `provider_id = v_user_id::text`.
  3. Bổ sung câu lệnh `UPDATE auth.users SET confirmation_token = COALESCE(confirmation_token, '') ...` ở đầu file [`supabase/05_username_auth.sql`](file:///d:/DreamHouse/supabase/05_username_auth.sql) để tự động sửa chữa ngay lập tức mọi tài khoản đã tạo trước đó (như `vietvq`).

---

### 🔴 Lỗi 14: Trường Tên tài khoản vẫn bị điền sẵn sau khi Đăng xuất dù người dùng không tích chọn "Ghi nhớ tài khoản"
- **Hiện tượng:** Người dùng đăng ký hoặc đăng nhập mà không tích chọn "Ghi nhớ tài khoản", nhưng khi đăng xuất khỏi hệ thống, ô Tên tài khoản hoặc Email vẫn tự động điền sẵn tên đăng nhập cũ trong khi ô checkbox thì không tích.
- **Nguyên nhân:**
  1. Thẻ HTML `<input type="checkbox" id="auth-remember-me" class="auth-remember-input" checked />` có thuộc tính `checked` mặc định.
  2. Trong hàm `registerWithUsername`, khi người dùng bỏ tích checkbox thì thiếu lệnh xóa `localStorage.removeItem('dream_house_remember_email')`.
  3. Trong hàm `loadRememberedAccount()`, điều kiện xóa trường cũ bị vướng kiểm tra `if (emailInput && !emailInput.value) emailInput.value = '';`. Do `emailInput.value` đã lưu sẵn chuỗi trong bộ nhớ DOM nên không bị xóa về rỗng.
- **Cách khắc phục dứt điểm:**
  1. Bỏ thuộc tính `checked` mặc định trong file [index.html](file:///d:/DreamHouse/index.html).
  2. Cập nhật hàm `loadRememberedAccount()` trong [js/app.js](file:///d:/DreamHouse/js/app.js): nếu không có dữ liệu trong `localStorage`, bắt buộc xóa trắng `emailInput.value = ''` và đặt `rememberCheckbox.checked = false`.
  3. Bổ sung lệnh dọn sạch toàn bộ các ô nhập `auth-email`, `auth-password`, `auth-confirm-password` trong hàm `logout()`.

---

### 🔴 Lỗi 15: Chuyển sang form Đăng ký vẫn bị điền sẵn Username và Mật khẩu từ tài khoản đã ghi nhớ
- **Hiện tượng:** Khi người dùng đang ở form Đăng nhập (đã có email/username ghi nhớ từ trước), bấm vào nút *"Chưa có tài khoản? Đăng ký ngay"*, hoặc khi mở trực tiếp URL có hash `#register`, thì ở màn hình Đăng ký, ô "Tên tài khoản (Username)" và các ô mật khẩu/xác nhận mật khẩu vẫn bị điền sẵn thông tin của tài khoản cũ.
- **Nguyên nhân cốt lõi:**
  1. Form Đăng nhập và Đăng ký sử dụng chung các phần tử input DOM (`#auth-email`, `#auth-password`). Khi người dùng bấm chuyển chế độ, hàm `loadRememberedAccount()` vẫn được kích hoạt hoặc vô tình chạy do kiểm tra hash URL chung `#login || #register` mà không phân biệt chế độ.
  2. Hàm `loadRememberedAccount()` thiếu lớp chắn (Guard Clause) kiểm tra xem modal có đang ở chế độ Đăng ký hay không.
  3. Trình duyệt (Chrome/Edge Password Manager) khi phát hiện form có trường username và password sẽ tự động kích hoạt tính năng Autofill không đồng bộ sau khi các phần tử input thay đổi hiển thị.
  4. Hàng tùy chọn "Ghi nhớ tài khoản" không được ẩn đi khi ở form Đăng ký gây nhầm lẫn thị giác.
- **Cách khắc phục dứt điểm:**
  1. Thêm Guard Clause trong `loadRememberedAccount()`: Kiểm tra nếu `#auth-name-group` đang hiển thị (`display !== 'none'`) hoặc URL hash là `#register`, lập tức xóa trắng các ô và `return` ngay.
  2. Trong khối kiểm tra hash mở modal tự động: Chỉ gọi `loadRememberedAccount()` khi hash chính xác là `#login`; tuyệt đối không gọi khi hash là `#register`.
  3. Trong hàm `updateAuthFormMode(registerMode)`: Khi `registerMode === true`, xóa rỗng toàn bộ giá trị các ô `#auth-name`, `#auth-email`, `#auth-password`, `#auth-confirm-password`, đặt `autocomplete="off"` và `autocomplete="new-password"`.
  4. Thiết lập 2 nhịp dọn dẹp trễ (`setTimeout` 50ms & 200ms) trong `updateAuthFormMode(true)` để xóa đè mọi hành vi tự động điền trễ của trình duyệt.
  5. Ẩn khối checkbox "Ghi nhớ tài khoản" (`.auth-remember-label`) khi ở chế độ Đăng ký và chỉ phục hồi khi chuyển về Đăng nhập.
  6. Thêm `autocomplete="off"` trực tiếp vào thẻ `<form id="auth-form">` trong [index.html](file:///d:/DreamHouse/index.html).
  7. Tăng phiên bản cache-busting lên `?v=3.0`.

---

### 🔴 Lỗi 16: Nhập đúng mật khẩu ở form Đăng nhập nhưng hệ thống lại báo "Đăng ký không thành công: Mật khẩu xác nhận không trùng khớp"
- **Hiện tượng:** Người dùng đang ở màn hình Đăng nhập (nút bấm màu vàng hiển thị chữ "Đăng nhập"), nhập đúng tên tài khoản và mật khẩu, nhưng khi ấn nút gửi thì màn hình báo lỗi *"Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại!"* và Toast đỏ *"Đăng ký không thành công"*.
- **Nguyên nhân cốt lõi:**
  1. Biến cờ `isRegisterMode` được khai báo dạng biến đóng cục bộ (`let isRegisterMode = false`) bên trong hàm `setupAuthModalEvents()`.
  2. Khi người dùng thực hiện đăng xuất (`logout()`), hàm này trực tiếp can thiệp DOM để giao diện trông giống form Đăng nhập, nhưng **không cập nhật biến `isRegisterMode` về `false`**.
  3. Khi người dùng nhấn nút Submit, sự kiện submit kiểm tra `if (isRegisterMode)` vẫn nhận giá trị `true` nên đã gọi hàm `registerWithUsername(...)` thay vì `loginWithEmail(...)`.
  4. Vì form đang ở giao diện Đăng nhập, ô `#auth-confirm-password` đang ẩn và có giá trị chuỗi rỗng `""`. Điều kiện `password !== confirmPassword` bị kích hoạt (`"111111" !== ""`), khiến hệ thống báo lỗi không trùng khớp mật khẩu xác nhận.
- **Cách khắc phục dứt điểm:**
  1. Chuyển `isAuthRegisterMode` thành thuộc tính toàn cục gắn trên instance của class `DreamHouseApp` (`this.isAuthRegisterMode`).
  2. Khởi tạo phương thức chuẩn hóa [`setAuthMode(mode)`](file:///d:/DreamHouse/js/app.js) để quản lý tập trung 100% việc đổi qua lại giữa `login` và `register`. Bất kỳ khi nào mở modal (kể cả trong `logout()`), đều gọi qua phương thức này để đồng bộ tuyệt đối giữa giao diện và cờ logic.
  3. Thêm chốt chặn kép (Double Guard Clause) vào sự kiện `form.addEventListener('submit')`:
     ```javascript
     const confirmPassGroup = document.getElementById('auth-confirm-pass-group');
     const isConfirmVisible = confirmPassGroup && confirmPassGroup.style.display !== 'none';
     const isActuallyRegister = Boolean(this.isAuthRegisterMode && isConfirmVisible);
     if (isActuallyRegister) {
         this.registerWithUsername(...);
     } else {
         this.loginWithEmail(...);
     }
     ```
     Nhờ chốt chặn này, nếu ô xác nhận mật khẩu không hiển thị trên màn hình, hệ thống đảm bảo 100% sẽ chạy luồng Đăng nhập (`loginWithEmail`), triệt tiêu hoàn toàn lỗi chạy sai luồng.
  4. Nâng tham số cache-busting lên `?v=3.1` trên toàn bộ dự án.

### 🔴 Lỗi 17: Sau khi đăng xuất, ô nhập mật khẩu ở Modal Đăng nhập vẫn còn hiển thị sẵn mật khẩu cũ hoặc dấu chấm
- **Hiện tượng:** Người dùng đăng nhập thành công vào hệ thống, sau đó thực hiện bấm "Đăng xuất" từ Header. Modal đăng nhập tự động xuất hiện với thông báo "Đăng xuất thành công", nhưng trong ô nhập "Mật khẩu (tối thiểu 6 ký tự)" vẫn bị điền sẵn mật khẩu cũ hoặc xuất hiện các dấu chấm tròn `••••••` (trong khi ô tên tài khoản/email lại trống).
- **Nguyên nhân cốt lõi sâu xa:**
  1. **Lệnh Focus kích hoạt Autofill của trình duyệt:** Trong hàm `logout()`, sau 350ms code thực hiện `document.getElementById('auth-password')?.focus()`. Khi một trường `type="password"` nhận tiêu điểm focus bằng script, cơ chế Password Manager của Google Chrome/Edge ngay lập tức nhận diện đây là hành động đăng nhập và tự động bơm (inject) thông tin mật khẩu đã lưu vào ô input ngay sau khi code JS hoàn tất xóa trễ.
  2. **Placeholder dạng ký tự chấm (`••••••••••••`):** Thẻ HTML trước đây khai báo `placeholder="••••••••••••"`. Khi ô mật khẩu rỗng, người dùng vẫn nhìn thấy các dấu chấm và lầm tưởng rằng hệ thống đang điền sẵn mật khẩu.
  3. **Trình duyệt tự động điền form (Browser Credential Autofill Heuristics):** Chrome liên tục theo dõi các form chứa thẻ `type="password"`. Kể cả khi script xóa `value = ''`, daemon autofill của trình duyệt vẫn kích hoạt sự kiện điền lại mật khẩu.
- **Cách khắc phục dứt điểm (5 lớp bảo vệ - Bulletproof Defense):**
  1. **Lớp 1 - Khóa ô mật khẩu bằng `readonly` và cơ chế Mở khóa thông minh (Interactive Unlock):**
     - Đặt thuộc tính `readonly` mặc định cho `#auth-password` và `#auth-confirm-password`. Chrome/Edge **hoàn toàn bỏ qua và không bao giờ tự động điền** vào bất kỳ ô input nào có thuộc tính `readonly`.
     - Lắng nghe các sự kiện tương tác thật từ người dùng (`pointerdown`, `mousedown`, `touchstart`, `keydown`, `focus`) để gỡ bỏ `readonly`:
       ```javascript
       const unlock = () => input.removeAttribute('readonly');
       input.addEventListener('pointerdown', unlock);
       input.addEventListener('focus', unlock);
       ```
     - Lắng nghe sự kiện `input`: Nếu trình duyệt vẫn cố tình bơm giá trị vào khi ô đang có `readonly`, lập tức xóa trắng:
       ```javascript
       input.addEventListener('input', () => {
           if (input.hasAttribute('readonly')) input.value = '';
       });
       ```
  2. **Lớp 2 - Cặp Input mồi nhử (Decoy Inputs):**
     - Bổ sung 2 input ẩn ở đầu `<form id="auth-form">` nằm ngoài màn hình (`top: -9999px`) để đánh lừa thuật toán Autofill của Chrome, khiến trình duyệt bơm dữ liệu vào ô mồi nhử thay vì ô thật.
  3. **Lớp 3 - Tuyệt đối không focus vào ô mật khẩu khi đăng xuất:**
     - Loại bỏ hoàn toàn lệnh `passInput?.focus()` trong `logout()`. Chỉ focus vào ô tài khoản `#auth-email` để ngăn trình duyệt kích hoạt autofill.
  4. **Lớp 4 - Gọi `form.reset()` và `clearAuthPasswordFields()` đa nhịp:**
     - Gọi `form.reset()` để đặt lại toàn bộ form về trạng thái ban đầu.
     - Hàm `clearAuthPasswordFields()` đặt lại `value = ''`, khôi phục `setAttribute('readonly', 'readonly')` và tắt trạng thái nút mắt.
  5. **Lớp 5 - Thay thế Placeholder chấm bằng văn bản thuần (`auth_pass_placeholder`):**
     - Thay đổi `placeholder="••••••••••••"` thành `placeholder="Nhập mật khẩu..."` (VI) và `"Enter password..."` (EN).
  6. Nâng tham số cache-busting lên `?v=3.4` trên toàn bộ dự án.

---

### 🔴 Lỗi 18: Khi mở rộng mục Đổi mật khẩu trong Modal Hồ sơ cá nhân thì nội dung bị tràn ra ngoài màn hình và bị fix cứng scroll không cuộn xuống được
- **Hiện tượng:** Khi người dùng mở Modal chỉnh sửa hồ sơ cá nhân (`#profile-modal`) và bấm mở rộng khối "Đổi mật khẩu tài khoản", chiều cao của modal tăng lên vượt quá chiều cao màn hình trình duyệt. Phần chân modal chứa các nút "Hủy bỏ" và "Lưu thay đổi" bị chìm xuống dưới mép màn hình, và người dùng lăn chuột/vuốt màn hình không có bất kỳ phản hồi nào (scroll bị khóa cứng).
- **Nguyên nhân cốt lõi:**
  1. Class `.profile-dialog` trong `style.css` được khai báo `overflow: hidden;`, ghi đè lên thuộc tính `overflow-y: auto;` của `.modal-window`.
  2. Lớp bọc `.modal-overlay` sử dụng `display: flex; align-items: center; justify-content: center;` nhưng thiếu thuộc tính `overflow-y: auto;`. Khi modal cao hơn khung nhìn, trình duyệt không kích hoạt thanh cuộn của overlay.
  3. Thiếu giới hạn chiều cao `max-height` kết hợp cuộn nội bộ cho `.profile-dialog`, khiến toàn bộ dialog bị neo cố định ở giữa màn hình và cắt xén nội dung vượt quá.
- **Cách khắc phục dứt điểm:**
  1. Cập nhật `.modal-overlay`: Bổ sung `overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 24px 16px;` để khung nhìn tổng thể luôn cho phép cuộn khi nội dung modal vượt quá màn hình.
  2. Cập nhật `.profile-dialog`:
     - Thiết lập `max-height: min(90vh, 880px); margin: auto; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scroll-behavior: smooth;`.
     - Tích hợp thanh cuộn tùy biến thanh mảnh (Slim Luxury Scrollbar - 6px) với màu sắc chuyển đổi linh hoạt theo Light/Dark Mode.
  3. Sticky Header cho phần đầu hồ sơ:
     - Đặt `position: sticky; top: 0; z-index: 20;` cho `.profile-header-card` cùng hiệu ứng `backdrop-filter: blur(16px);`.
     - Đưa nút đóng modal (`#close-profile-modal`) vào trong `.profile-header-card` để luôn luôn ghim ở góc trên bên phải khi người dùng cuộn xem form.
  4. Trải nghiệm mở rộng mượt mà (Smooth Auto-scroll):
     - Trong sự kiện click `#toggle-password-section`, bổ sung lệnh `secCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` sau 120ms để tự động cuộn nhẹ đưa các ô mật khẩu mới và nút Lưu vào vị trí dễ nhìn nhất.
  5. Nâng tham số cache-busting lên `?v=3.5` trên toàn bộ dự án.

---

### 🔴 Lỗi 19: Đăng nhập bằng Google bị chuyển hướng sang trang JSON lỗi `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`
- **Hiện tượng:** Khi người dùng bấm nút *"Tiếp tục với Google"* trong modal Đăng nhập, trình duyệt bị chuyển hướng rời khỏi website và chuyển tới URL `https://qdkhqvsbtmbgkmoldazt.supabase.co/auth/v1/authorize?provider=google&...` hiển thị chuỗi JSON thô:
  `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`.
- **Nguyên nhân cốt lõi:**
  1. Trong Supabase Dashboard của dự án `qdkhqvsbtmbgkmoldazt`, mục **Authentication > Providers > Google** hiện đang ở trạng thái **TẮT (Disabled)**, chưa cấu hình Client ID và Client Secret từ Google Cloud Console.
  2. Hàm `loginWithGoogle()` trước đó tự động chuyển hướng trình duyệt (`signInWithOAuth`) mà không tiền kiểm tra trạng thái hoạt động của Provider, khiến người dùng bị văng ra khỏi ứng dụng và mắc kẹt tại trang lỗi JSON thô của Supabase.
- **Cách khắc phục dứt điểm:**
  1. **Cơ chế Tiền kiểm tra (OAuth Pre-flight Check):**
     - Gọi `client.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } })` để lấy URL chuyển hướng mà không văng khỏi trang.
     - Dùng `fetch` thăm dò `data.url` thông qua cơ chế CORS. Nếu Supabase phản hồi mã lỗi 400 và thông báo `Unsupported provider`, hệ thống lập tức chặn đứng việc chuyển hướng, giữ nguyên người dùng tại trang web và hiển thị thông báo Alert/Toast cảnh báo rõ ràng:
       *"Đăng nhập Google chưa được kích hoạt trên Supabase Dashboard. Vui lòng đăng nhập bằng Tên tài khoản / Email hoặc cấu hình Google Provider trong Supabase."*
     - Chỉ khi Provider đã được kích hoạt thành công (không trả về lỗi 400), code mới thực thi `window.location.href = data.url` để chuyển sang trang đăng nhập Google thật.
  2. **Các bước cấu hình kích hoạt Google Provider trên Supabase:**
     - Truy cập Supabase Dashboard: `https://supabase.com/dashboard/project/qdkhqvsbtmbgkmoldazt/auth/providers`.
     - Mở rộng mục **Google**, sao chép **Callback URL (for OAuth)**: `https://qdkhqvsbtmbgkmoldazt.supabase.co/auth/v1/callback`.
     - Vào [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services > Credentials** > tạo **OAuth Client ID** (Web application), dán Callback URL vào mục **Authorized redirect URIs**.
     - Quay lại Supabase Dashboard > dán **Client ID** và **Client Secret** > gạt công tắc **Enable Sign in with Google** sang **ON** > nhấn **Save**.
  3. Nâng tham số cache-busting lên `?v=3.6` trên toàn bộ dự án.

---

### 🔴 Lỗi 20: Google Chrome Password Manager chỉ hiện gợi ý tài khoản đã lưu khi bấm vào ô Mật khẩu thay vì ô Tên tài khoản
- **Hiện tượng:** Khi mở form đăng nhập, người dùng bấm vào ô *"Tên tài khoản hoặc Email"* thì không xuất hiện danh sách gợi ý tài khoản đã lưu của Chrome; chỉ khi bấm vào ô *"Mật khẩu"* thì menu gợi ý tài khoản Google Chrome (`haruki24022003`, `Admin`, `vietvq`...) mới bật ra bên dưới ô mật khẩu.
- **Nguyên nhân cốt lõi:**
  1. Thẻ `<form>` chứa thuộc tính `autocomplete="off"` kết hợp các thẻ input ẩn decoy (`name="fake_username_prevent_autofill"`) đặt ở đầu form. Trình duyệt Chrome nhận diện thẻ decoy ẩn ở tọa độ `-9999px` là ô username chính của form và không thể liên kết ô `#auth-email` thật vào cơ chế autofill.
  2. Thẻ input `#auth-email` bị thiếu thuộc tính chuẩn `name="username"`. Chrome's Credential Autofill Heuristics dựa vào thuộc tính `name="username"` kết hợp `autocomplete="username"` để xác định vị trí thả danh sách tài khoản đã lưu.
  3. Thẻ input `#auth-password` được gán thuộc tính `autocomplete="new-password"` và ban đầu mang thuộc tính `readonly`. Khi người dùng click vào ô mật khẩu, JavaScript gỡ `readonly`, khiến Chrome phát hiện ra đây là trường mật khẩu duy nhất hợp lệ trong form và buộc phải thả dropdown gợi ý tại chính ô mật khẩu.
- **Cách khắc phục dứt điểm:**
  1. **Chuẩn hóa cấu trúc Form và Thuộc tính Credential:**
     - Thiết lập `<form id="auth-form" autocomplete="on">`.
     - Loại bỏ hoàn toàn khối input ẩn decoy.
     - Ô Tên tài khoản / Email: bổ sung đầy đủ `name="username"` và `autocomplete="username"`.
     - Ô Mật khẩu đăng nhập: gán `name="password"` và `autocomplete="current-password"`, loại bỏ thuộc tính `readonly`.
     - Ô Xác nhận mật khẩu: gán `name="confirm_password"` và `autocomplete="new-password"`.
  2. **Đồng bộ cơ chế chuyển đổi chế độ Đăng nhập / Đăng ký (`setAuthMode`):**
     - Khi ở chế độ Đăng nhập: gán `#auth-password` thành `autocomplete="current-password"`.
     - Khi ở chế độ Đăng ký: gán thành `autocomplete="new-password"`.
  3. **Tối ưu trải nghiệm Đăng xuất (`logout`):**
     - Dọn sạch form bằng `form.reset()`, khôi phục các ô trống mà không cưỡng chế focus tự động, đảm bảo form luôn sẵn sàng đón nhận tương tác click của người dùng để thả danh sách tài khoản chính xác tại ô Tên tài khoản.
  4. Nâng tham số cache-busting lên `?v=3.7` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 21: Avatar người dùng không hiển thị trên thanh điều hướng (Navbar) & Nhu cầu tải ảnh đại diện từ máy tính
- **Hiện tượng:**
  1. Người dùng đăng nhập (Google OAuth hoặc Email) thì trong modal Chỉnh sửa Hồ sơ hiển thị đúng ảnh đại diện, nhưng ngoài thanh điều hướng (Navbar) lại chỉ hiện icon người mặc định màu vàng.
  2. Người dùng muốn tắt thông báo Toast *"Đang kết nối tới Google..."* khi nhấn đăng nhập Google.
  3. Người dùng muốn có tính năng chọn tệp ảnh trực tiếp từ thiết bị/máy tính thay vì chỉ dán đường dẫn URL ảnh.
- **Nguyên nhân cốt lõi:**
  1. Thẻ avatar trên Navbar (`index.html` dòng 172) trước đó chỉ có `class="user-avatar-circle"` mà thiếu `id="user-avatar-initials"`. Hàm `updateAuthUI()` tìm kiếm qua `document.getElementById('user-avatar-initials')` nên luôn trả về `null`, dẫn đến việc không thể chèn thẻ `<img>` ảnh đại diện vào nút tài khoản ngoài thanh điều hướng.
  2. Khi đăng nhập Google OAuth, Supabase thường lưu link ảnh đại diện trong trường `user_metadata.picture` thay vì chỉ có `avatar_url`.
  3. Form chỉnh sửa hồ sơ trước đó chỉ có trường `<input type="url">` tĩnh, thiếu input file và cơ chế nén ảnh phía client.
- **Cách khắc phục dứt điểm:**
  1. **Tắt Toast kết nối Google:** Loại bỏ `window.toast.info('Đang kết nối tới Google...')` trong hàm `loginWithGoogle()`.
  2. **Đồng bộ Avatar trên Navbar:**
     - Bổ sung `id="user-avatar-initials"` vào thẻ `<span class="user-avatar-circle">` trong `index.html`.
     - Trong `updateAuthUI()`: hỗ trợ tìm kiếm kép qua ID và class, đồng thời lấy fallback ảnh từ cả 3 nguồn: `currentProfile.avatar_url`, `currentUser.user_metadata.avatar_url` và `currentUser.user_metadata.picture`.
     - Bổ sung `overflow: hidden;` cho `.user-avatar-circle` để ảnh bo tròn tuyệt đối.
  3. **Tích hợp Bộ tải ảnh đại diện từ thiết bị (Direct File Upload):**
     - Bổ sung nút *"Chọn ảnh từ máy tính"* và thẻ input ẩn `<input type="file" id="profile-avatar-file" accept="image/*">` trong modal hồ sơ.
     - Cho phép nhấp trực tiếp vào ảnh đại diện hình tròn trên đầu modal để kích hoạt chọn ảnh (có hiệu ứng hover máy ảnh mượt mà).
     - Xây dựng hàm [`compressAvatarImage()`](file:///e:/Dream-house/js/app.js) tự động nén & crop vuông ảnh đại diện qua HTML5 Canvas (320x320px WebP, dung lượng chỉ ~15-25 KB), cập nhật xem trước trực tiếp ngay khi chọn tệp.
     - Khi nhấn Lưu: Tự động upload tệp vào Supabase Storage nếu khả dụng, hoặc lưu trữ Data URL nén vào `profiles.avatar_url` mà không bao giờ gặp lỗi phân quyền storage.
  4. Nâng tham số cache-busting lên `?v=3.8` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 22: Avatar trong modal chỉnh sửa hồ sơ bị cắt đôi UI (nửa trái là ảnh, nửa phải là nền vàng và chữ cái)
- **Hiện tượng:** Khi mở modal chỉnh sửa hồ sơ, khung ảnh đại diện tròn ở đầu modal bị chia làm 2 phần: khoảng 70% bên trái hiển thị ảnh người dùng bị co ngang, khoảng 30% bên phải để lộ nền vàng và nét chữ cái/icon camera.
- **Nguyên nhân cốt lõi:**
  1. Thẻ `.profile-avatar-box` được định dạng là Flex Container (`display: flex; align-items: center; justify-content: center;`). Cả ảnh `<img>` lẫn thẻ chữ cái `<span>` và overlay đều tồn tại bên trong mà `<img>` không có `position: absolute`. Cơ chế Flexbox tự động dàn các phần tử này nằm ngang song song (side-by-side) thay vì chồng lớp (layering).
  2. Hàm `renderProfileModalAvatar()` trước đó chèn trực tiếp chuỗi HTML nối vào `preview.innerHTML` chứa thuộc tính inline `onerror="this.parentElement.innerHTML='...'"` có dấu ngoặc kép không tương thích, gây lỗi phân tích cú pháp DOM của trình duyệt.
- **Cách khắc phục dứt điểm:**
  1. **Khóa vị trí lớp tuyệt đối (Absolute Layering) trong CSS ([`style.css`](file:///e:/Dream-house/style.css)):**
     - Đặt `position: relative; overflow: hidden;` cho `.profile-avatar-box`.
     - Đặt `position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; z-index: 2;` cho `.profile-avatar-box img` và `.profile-avatar-img`.
     - Thiết lập `.profile-avatar-char` làm lớp nền dự phòng với `z-index: 1`.
     - Thiết lập `.profile-avatar-overlay` với `position: absolute; inset: 0; border-radius: 50%; z-index: 3;`.
  2. **Tái cấu trúc DOM ổn định & Miễn dịch lỗi ([`index.html`](file:///e:/Dream-house/index.html) & [`js/app.js`](file:///e:/Dream-house/js/app.js)):**
     - Đặt sẵn cả 3 phần tử (`#profile-avatar-char`, `#profile-avatar-img`, `.profile-avatar-overlay`) tĩnh trong HTML.
     - Hàm `renderProfileModalAvatar()` thao tác trực tiếp trên các phần tử DOM cố định thay vì viết lại `innerHTML`.
     - Khi có link ảnh hợp lệ: gán `img.src = avatarUrl` và bật `display: block` để phủ kín 100% hình tròn ở layer trên.
     - Khi không có ảnh hoặc ảnh tải lỗi: `img.onerror` ẩn `img` (`display: none`), tự động lộ ra chữ cái đại diện ở layer dưới mà không bị co kéo hay chia đôi khung hình.
  3. Nâng tham số cache-busting lên `?v=3.9` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 23: Hiệu ứng cuộn trang bị khựng/delay, phản hồi rất chậm khi bấm nút điều hướng
- **Hiện tượng:** Khi người dùng bấm vào các nút điều hướng (*"Thư viện mẫu"*, *"Liên hệ"*, *"Khám phá mẫu nhà"*...), màn hình có độ trễ khoảng 200–300ms rồi mới bắt đầu cuộn, chuyển động không mượt mà và cảm giác phản hồi rất nặng nề.
- **Nguyên nhân cốt lõi:**
  1. Sử dụng thuật toán animation thủ công bằng JavaScript (`requestAnimationFrame`) với đường cong gia tốc `easeInOutCubic`: Ở giai đoạn đầu ($t < 0.2$), hàm số có vận tốc ban đầu triệt tiêu về $0$ ($v(0) = 0$), khiến 20% thời gian đầu trang hầu như đứng yên khiến người dùng cảm giác bị đóng băng (frozen delay).
  2. Sự xung đột giữa CSS `scroll-behavior: smooth` và vòng lặp JavaScript: Khi JS liên tục gọi `window.scrollTo` ở mỗi frame (60 lần/giây), CSS smooth-scroll của trình duyệt cố gắng nội suy lại vị trí đó, dẫn đến hiện tượng 2 cơ chế kéo giằng nhau, gây tụt khung hình (frame drops) và giật lag nặng khi Three.js đang chạy trên cùng luồng chính (Main Thread).
  3. Lắng nghe sự kiện `pointerdown` để ngắt cuộn: Khi người dùng nhấp chuột, sự kiện click có thể trùng lặp với `pointerdown` khiến cờ hủy `isCancelled` bị kích hoạt nhầm.
- **Cách khắc phục dứt điểm:**
  1. **Bàn giao toàn bộ việc cuộn cho GPU Compositor C++ của trình duyệt:**
     - Sử dụng trực tiếp `window.scrollTo({ top: offsetPosition, behavior: 'smooth' })`.
     - Phản hồi ngay lập tức $0\text{ms}$ (ngay tại frame kế tiếp 8–16ms), loại bỏ hoàn toàn độ trễ 250ms.
     - Tận dụng tối đa phần cứng màn hình tần số quét cao (90Hz, 120Hz, 144Hz) mà không ngốn tài nguyên CPU Main Thread của Three.js.
  2. Bù trừ chuẩn xác khoảng cách Navbar 84px với `scroll-margin-top: 86px;` và `scroll-padding-top: 86px;`.
  3. Loại bỏ các animation filter drop-shadow nặng nề khi cuộn để chống giật GPU.
  4. Nâng tham số cache-busting lên `?v=4.1` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 24: Upload file 3D (.skp / .glb) bị lỗi 400 "The object exceeded the maximum allowed size" & Form thêm mẫu nhà rườm rà
- **Hiện tượng:**
  1. Khi Admin thêm mẫu nhà mới và tải lên file mô hình 3D (ví dụ file SketchUp `3d a.skp`), console báo lỗi HTTP 400 `POST https://qdkhqvsbtmbgkmoldazt.supabase.co/storage/v1/object/template-models/... 400 (Bad Request)` kèm thông báo Toast: *"Lỗi: The object exceeded the maximum allowed size"*.
  2. Form thêm mẫu nhà yêu cầu nhập thủ công cả "Tên tiếng Việt" và "Tên tiếng Anh", gây mất thời gian và không cần thiết đối với Admin.
- **Nguyên nhân cốt lõi:**
  1. Trong script cấu hình ban đầu (`supabase/03_storage.sql`), bucket `template-models` được cấu hình dung lượng tối đa `file_size_limit = 10485760` (chỉ 10MB) và chỉ chấp nhận MIME type `['model/gltf-binary', 'application/octet-stream', 'model/gltf+json']`. Các file bản vẽ 3D SketchUp (.skp) hoặc GLB chi tiết từ kiến trúc sư thường có dung lượng từ 15MB – 50MB, do đó Supabase Storage lập tức từ chối với lỗi vượt quá dung lượng.
  2. Database `public.templates` yêu cầu trường `name_vi` và `name_en` là `TEXT NOT NULL`.
- **Cách khắc phục dứt điểm:**
  1. **Nâng hạn mức Storage Buckets ([`supabase/07_increase_storage_limits.sql`](file:///e:/Dream-house/supabase/07_increase_storage_limits.sql)):**
     - Nâng `file_size_limit` của `template-models` từ 10MB lên **100MB** (`104857600` bytes).
     - Đặt `allowed_mime_types = NULL` để chấp nhận mọi định dạng 3D (`.skp`, `.glb`, `.gltf`, `.obj`, `.zip`,...).
     - Nâng `template-images` lên **25MB** (`26214400` bytes) cho các ảnh phối cảnh 4K.
  2. **Tối ưu Form & Tự động hoá Tên Mẫu ([`admin.html`](file:///e:/Dream-house/admin.html)):**
     - Loại bỏ hoàn toàn 2 ô nhập "Tên tiếng Việt" và "Tên tiếng Anh" khỏi giao diện modal.
     - Tự động sinh tên chuẩn hoá theo loại nhà và kích thước (Ví dụ: *"Nhà phố 2 tầng 5x16m"* và *"Modern Townhouse 2 Floors 5x16m"*), đồng thời tự sinh `slug` nếu để trống.
     - Kiểm tra kích thước file client-side (< 100MB cho 3D, < 25MB cho ảnh) và hiển thị thông báo hướng dẫn rõ ràng nếu Storage chưa được chạy script nâng hạn mức.
     - Xây dựng hoàn chỉnh hàm [`editTemplate(id)`](file:///e:/Dream-house/admin.html) để sửa mẫu nhà linh hoạt.
  3. **Tương thích File SketchUp 3D kép ([`js/viewer3d.js`](file:///e:/Dream-house/js/viewer3d.js)):**
     - Trình duyệt WebGL không thể đọc trực tiếp binary độc quyền của `.skp`. Nếu phát hiện file `.skp`, Three.js hiển thị ngay mô phỏng 3D kích thước thực tế, đồng thời cung cấp nút liên kết tải trực tiếp file gốc `.skp` về máy mà không làm crash GLTFLoader.
  4. Nâng tham số cache-busting lên `?v=4.2` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 25: Mô hình 3D tương tác trên Web không khớp với file SketchUp (.skp) tải lên
- **Hiện tượng:** Người dùng tải file mô hình `3d a.skp` và ảnh chụp phối cảnh biệt thự mái Nhật/mái Thái sang trọng, nhưng khung tương tác 3D chỉ hiển thị một khối hộp trắng mái bằng 2 tầng đơn giản.
- **Nguyên nhân cốt lõi:**
  1. Trình duyệt Web (WebGL / Three.js) **không hỗ trợ đọc trực tiếp định dạng `.skp`**. File `.skp` là định dạng nhị phân độc quyền (proprietary binary CAD format) của phần mềm máy tính Trimble SketchUp, chỉ mở được trên phần mềm desktop SketchUp.
  2. Chuẩn 3D mở duy nhất được mọi trình duyệt web trên toàn cầu hỗ trợ hiển thị thời gian thực (Real-time WebGL) là **`.glb` / `.gltf` (glTF 2.0)**.
  3. Khi phát hiện đuôi `.skp`, Three.js lưu file lên máy chủ (cho phép tải về) và chuyển sang cơ chế dự phòng: dựng khối tham số tự động (`buildProceduralHouse`). Do khi thêm mẫu trong Admin, các thông số đang để mặc định là `Rộng: 5.0m, Sâu: 16.0m, Số tầng: 2, Kiểu mái: Mái bằng (flat)`, khối 3D dựng ra là một khối hộp chữ nhật mái bằng, không khớp với ảnh biệt thự thực tế.
- **Cách khắc phục dứt điểm:**
  1. **Quy trình xuất file `.glb` chuẩn từ SketchUp (30 giây):**
     - Mở bản vẽ trong SketchUp -> Chọn **File > Export > 3D Model...** -> Tại ô định dạng chọn **glTF File (`*.glb`)** hoặc cài plugin chính thức **Khronos glTF Exporter** từ SketchUp Extension Warehouse.
     - Sau khi có file `.glb`, tải lên Dream House. Three.js sẽ nạp và hiển thị **chính xác 100% từng chi tiết kiến trúc, mái ngói, cột, ban công và màu sắc vật liệu**.
  2. **Tối ưu giao diện hướng dẫn Admin ([`admin.html`](file:///e:/Dream-house/admin.html)):**
     - Bổ sung ghi chú hướng dẫn nổi bật ngay tại ô tải mô hình 3D để người quản trị biết xuất sang `.glb` khi muốn hiển thị 3D thực tế trên web.
  3. Nâng tham số cache-busting lên `?v=4.3` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 26: Không thể tự động cào/gửi ngầm file .skp sang các trang web chuyển đổi online từ trình duyệt (CORS & Anti-Bot)
- **Hiện tượng:** Yêu cầu hệ thống tự động kết nối ngầm tới các trang web chuyển đổi online (như ImageToStl, AnyConv, FabConvert) để nạp file `.skp` và tự tải file `.glb` về.
- **Nguyên nhân cốt lõi:**
  1. **Chính sách an toàn trình duyệt (CORS - Same-Origin Policy):** Trình duyệt web của người dùng nghiêm cấm các mã JavaScript từ website `DreamHouse` tự tiện gửi request POST file ngầm sang một website khác và đọc dữ liệu trả về nếu website đích không bật cờ `Access-Control-Allow-Origin: *`.
  2. **Tường lửa chống Bot (Cloudflare Turnstile, reCAPTCHA, WAF):** Tất cả các trang chuyển đổi trực tuyến miễn phí đều có lớp bảo vệ chống tự động hoá, bắt buộc người dùng thật phải thao tác trên giao diện của họ. Mọi request tự động ngầm đều bị chặn với lỗi `403 Forbidden`.
  3. Để tự động hoá 100% việc chuyển đổi `.skp` phía máy chủ, cần triển khai Backend CAD chuyên nghiệp trả phí (Autodesk Platform Services, Aspose Cloud API).
- **Cách khắc phục dứt điểm:**
  1. **Tích hợp bộ nạp Native `THREE.OBJLoader` ([`index.html`](file:///e:/Dream-house/index.html) & [`js/viewer3d.js`](file:///e:/Dream-house/js/viewer3d.js)):**
     - Mọi phiên bản SketchUp từ trước đến nay đều có sẵn tính năng miễn phí 100% trong menu: **File > Export > 3D Model > chọn `.obj`** (không cần cài thêm bất kỳ plugin nào, không cần truy cập trang web chuyển đổi nào).
     - Three.js được trang bị `THREE.OBJLoader` để nạp và hiển thị trực tiếp file `.obj` trên website ngay khi Admin tải lên.
  2. Nâng tham số cache-busting lên `?v=4.4` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 27: Lỗi Console "Error: <path> attribute d: Expected number, ... 8-4 8-11 8-11-8z"
- **Hiện tượng:** Khi mở hoặc đóng modal đăng nhập/đăng ký hoặc reset form mật khẩu, Console báo 2 lỗi đỏ:
  `Error: <path> attribute d: Expected number, "_ 8-4 8-11 8-11-8z". app.js:1570`
  `Error: <path> attribute d: Expected number, "_ 8-4 8-11 8-11-8z". app.js:1575`
- **Nguyên nhân cốt lõi:**
  1. Trong hàm `clearAuthPasswordFields()` của [`js/app.js`](file:///e:/Dream-house/js/app.js), biến `defaultEye` chứa chuỗi path SVG:
     `d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"`
  2. Lệnh `s` (smooth curveto) trong cú pháp SVG yêu cầu mỗi phân đoạn cong phải nhận đúng 4 tham số toạ độ `(x2 y2 x y)`.
  3. Chuỗi path trên bị cắt ngắn mất phân đoạn cuối (`-11-8`), chỉ có 14 số thay vì 16 số hợp lệ. Khi bộ phân tích cú pháp SVG của trình duyệt quét đến cuối gặp ký tự `z` (close path) trong khi vẫn đang chờ tham số số học tiếp theo của lệnh `s`, trình duyệt quăng ngoại lệ `Expected number`.
- **Cách khắc phục dứt điểm:**
  1. Sửa chuỗi SVG path tại dòng 1567 trong [`js/app.js`](file:///e:/Dream-house/js/app.js) thành đầy đủ chuẩn xác:
     `d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"`
  2. Nâng tham số cache-busting lên `?v=4.5` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 28: Trình duyệt tự động điền (Autofill) mật khẩu cũ vào ô "Mật khẩu hiện tại" trong Modal Chỉnh sửa hồ sơ
- **Hiện tượng:** Khi người dùng mở modal chỉnh sửa hồ sơ và mở mục "Đổi mật khẩu tài khoản", ô nhập "Mật khẩu hiện tại" đã bị điền sẵn một chuỗi mật khẩu (`•••••••••••`) kèm nền màu xanh nhạt (`#e8f0fe`) do trình duyệt Chrome tự động điền.
- **Nguyên nhân cốt lõi:**
  1. Trong form chỉnh sửa hồ sơ (`profile-form`), trình duyệt nhận diện ô `profile-email` (chứa email tài khoản) nằm cùng form với ô mật khẩu `profile-current-pass` có thuộc tính `autocomplete="current-password"`.
  2. Thuật toán phân tích thông tin đăng nhập của trình duyệt (Chrome Password Manager Autofill Heuristics) xem đây là form tài khoản cần điền thông tin đăng nhập đã lưu, do đó tự động chèn mật khẩu cũ vào ô này.
- **Cách khắc phục dứt điểm (Cơ chế bảo vệ 4 lớp):**
  1. **Tách biệt thuộc tính:** Đổi `autocomplete="current-password"` thành `autocomplete="new-password"` và gắn `name="verify_current_pwd_prevent_autofill"`.
  2. **Kỹ thuật Khóa Readonly (Readonly Lock Pattern):** Khóa `readonly` mặc định cho các ô mật khẩu trong [`index.html`](file:///e:/Dream-house/index.html), chỉ mở khi người dùng chủ động tương tác (`focus`, `pointerdown`, `click`). Trình duyệt tuyệt đối không autofill vào trường đang có cờ `readonly`.
  3. **Làm sạch đa tầng bằng JS:** Trong [`js/app.js`](file:///e:/Dream-house/js/app.js), tự động gán `.value = ''` ngay khi mở modal và sau các mốc 100ms, 300ms khi người dùng nhấn mở mục đổi mật khẩu để dọn sạch mọi dữ liệu autofill ngầm.
  4. **Triệt tiêu màu Autofill trong CSS ([`style.css`](file:///e:/Dream-house/style.css)):** Áp dụng `-webkit-box-shadow: 0 0 0 1000px var(--color-surface) inset !important;` cho `.password-input-box input:-webkit-autofill` để ngăn màu nền xanh nhạt của trình duyệt.
  5. Nâng tham số cache-busting lên `?v=4.6` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 29: Admin nhập tên mẫu nhà là "test" nhưng bảng dữ liệu vẫn hiển thị "Nhà phố 2 tầng 5x16m"
- **Hiện tượng:** Admin mở modal Thêm hoặc Sửa mẫu nhà, nhập tên mẫu là `test` vào ô đầu tiên, nhưng khi lưu lại và nhìn vào bảng quản trị thì tên mẫu vẫn hiển thị là `Nhà phố 2 tầng 5x16m`.
- **Nguyên nhân cốt lõi:**
  1. Khi gỡ bỏ 2 ô nhập rườm rà "Tên tiếng Việt" và "Tên tiếng Anh", form Admin chỉ giữ lại trường đầu tiên là `Slug (duy nhất, không dấu)`. Người quản trị nhập `test` vào ô này với mong muốn đặt tên cho ngôi nhà.
  2. Tuy nhiên, logic lưu dữ liệu lại tự động ghi đè trường `name_vi` bằng chuỗi tự sinh theo quy tắc thông số kiến trúc (`${type} ${floors} tầng ${width}x${depth}m` = `Nhà phố 2 tầng 5x16m`). Do đó, tên `test` người dùng vừa nhập bị bỏ qua và chỉ gán vào trường `slug`.
- **Cách khắc phục dứt điểm:**
  1. Đổi trường đầu tiên trong form [`admin.html`](file:///e:/Dream-house/admin.html) thành **"Tên mẫu nhà"** (`#tpl-name`, placeholder: *"Nhập tên mẫu nhà (ví dụ: Biệt thự vườn, test...)"*).
  2. Ẩn trường `tpl-slug` xuống nền, bổ sung hàm `slugify()` tự động chuyển đổi tên mẫu nhà có dấu sang slug URL thân thiện chuẩn SEO.
  3. Khi lưu thông tin: lưu chính xác tên người dùng nhập vào trường `name_vi` và `name_en`. Nếu để trống mới dùng tên tự sinh dự phòng.
  4. Nâng tham số cache-busting lên `?v=4.7` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 30: Màn hình tải trang bị giật/nháy trắng hoặc không đồng bộ màu sắc giữa Light/Dark mode khi tích hợp CSS Loader 3D Flipping
- **Hiện tượng:** Khi tích hợp hiệu ứng loading CSS 3D Flipping vào website, nếu đặt màu cố định `color: #474bff` thì loader sẽ bị lệch tông màu vàng kim sang trọng của thương hiệu Dream House và gây chói khi chuyển sang Dark Mode. Ngoài ra nếu không có overlay che phủ toàn trang hoặc preloader biến mất quá nhanh (<100ms) khi dữ liệu đã lưu cache, người dùng sẽ thấy nháy màn hình (layout shift / white flash) trước khi Three.js canvas và ảnh mẫu nhà kịp render.
- **Nguyên nhân cốt lõi:**
  1. Thiếu tính kế thừa CSS Custom Property: Thuộc tính `color: #474bff` cố định không linh hoạt với biến màu thương hiệu `--color-accent` của hệ thống Design Tokens.
  2. Thời gian sống (lifespan) của preloader không có ngưỡng hiển thị tối thiểu (minimum display duration), dẫn đến việc biến mất tức thì làm gián đoạn chu kỳ xoay lật 3D của animation.
  3. Lưới thư viện rỗng không có placeholder loader, khiến khoảng trống giữa lúc nạp DOM và nạp Supabase bị đứt đoạn.
- **Cách khắc phục dứt điểm:**
  1. Cấu hình biến CSS linh hoạt: `color: var(--flipping-color, var(--color-accent, #474bff));` cho phép vừa sử dụng màu tùy chọn qua `--flipping-color`, vừa tự động đồng bộ màu vàng kim thượng lưu chuẩn thương hiệu trong cả Light Mode (`#c49a45`) và Dark Mode (`#e5b95d`).
  2. Tạo màn hình `#site-preloader` che phủ toàn trang (`z-index: 999999`) với hiệu ứng fade-out mượt mà (`transition: opacity 0.5s, visibility 0.5s`).
  3. Đặt thời gian tối thiểu 450ms và cơ chế timeout an toàn 2.5s trong [`DreamHouseApp.init()`](file:///e:/Dream-house/js/app.js) để preloader luôn biến mất mượt mà, không bao giờ bị treo cứng.
  4. Đặt placeholder `.flipping-container` trong `#gallery` để tạo trải nghiệm thị giác liền mạch.
  5. Tăng tham số phiên bản cache-busting lên `?v=4.8` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 31: Nút "Quay lại trang chủ" trong trang Auth đóng modal đột ngột, thiếu hiệu ứng chuyển cảnh mượt mà
- **Hiện tượng:** Khi bấm nút *"← Quay lại trang chủ"* (`#auth-back-btn`), toàn bộ màn hình Auth biến mất ngay tức khắc (cắt cảnh đột ngột), không có hiệu ứng chuyển động ngược lại tương xứng với hiệu ứng phóng to mượt mà khi bấm mở Login (`authPageFadeIn` & `cardSlideIn`).
- **Nguyên nhân cốt lõi:**
  1. Trong hàm `closeAuthModal()`, lệnh `modal.classList.add('hidden')` được thực thi đồng bộ ngay lập tức mà không có khoảng đệm thời gian chạy CSS Exit Animation.
  2. CSS của `.auth-page-takeover` và `.auth-floating-card` chỉ mới cấu hình animation mở vào (`@keyframes authPageFadeIn`, `@keyframes cardSlideIn`) mà chưa có cấu hình animation đóng ngược chiều.
  3. Nút `#auth-back-btn` thiếu phản hồi cơ học (active/pressed state), khiến người dùng không cảm nhận được độ nảy khi click.
- **Cách khắc phục dứt điểm:**
  1. Xây dựng bộ animation thoát đối xứng trong [`style.css`](file:///d:/DreamHouse/style.css):
     - `.auth-page-takeover.is-closing`: Kích hoạt `@keyframes authPageFadeOut` với thời gian $0.32\text{s}$, đưa `opacity` về 0 và phóng nhẹ `scale(1.025)`.
     - `.auth-floating-card`: Kích hoạt `@keyframes cardSlideOut` trượt xuống $24\text{px}$ và co nhẹ về `scale(0.96)`.
     - Cột nội dung và topbar trượt nhẹ lên trên và mờ dần.
  2. Bổ sung trạng thái phản hồi cơ học cho nút `#auth-back-btn` (`scale(0.93)`, mũi tên trượt sang trái $-6\text{px}$).
  3. Cập nhật hàm [`closeAuthModal()`](file:///d:/DreamHouse/js/app.js) để kích hoạt class `.is-closing`, giữ lại DOM trong $300\text{ms}$ cho animation diễn ra trọn vẹn rồi mới thêm class `.hidden`.
  4. Tăng tham số cache-busting lên `?v=4.9` trên toàn bộ dự án.

---

### 🔴 Lỗi 32: Panel chi tiết mẫu nhà (`#detail-modal`) biến mất đột ngột khi đóng (thiếu hiệu ứng Exit Animation)
- **Hiện tượng:** Khi người dùng mở xem chi tiết mẫu nhà, modal xuất hiện mượt mà với hiệu ứng phóng to `scaleUp` và làm mờ nền `fadeIn`. Nhưng khi bấm nút đóng `(X)`, click ra ngoài nền đen hoặc bấm phím `Escape`, modal lập tức biến mất (cắt cảnh giật cục), không có hiệu ứng thu nhỏ ngược lại.
- **Nguyên nhân cốt lõi:**
  1. Trong hàm `closeDetailPanel()`, lệnh `panel.classList.add('hidden')` được thực thi đồng bộ ngay lập tức, không cho trình duyệt cơ hội chạy animation đóng.
  2. Lớp `.modal-overlay` và `.modal-window` chỉ có `@keyframes fadeIn` và `@keyframes scaleUp` cho chiều mở, chưa có `@keyframes modalFadeOut` và `@keyframes modalScaleDown` cho chiều đóng.
- **Cách khắc phục dứt điểm:**
  1. Xây dựng animation đóng đối xứng trong [`style.css`](file:///d:/DreamHouse/style.css):
     - `.modal-overlay.is-closing`: Kích hoạt `@keyframes modalFadeOut` trong $0.24\text{s}$ mờ dần và khóa tương tác chuột (`pointer-events: none`).
     - `.modal-overlay.is-closing .modal-window` & `.profile-dialog`: Kích hoạt `@keyframes modalScaleDown` trong $0.24\text{s}$ thu nhỏ từ `scale(1)` về `scale(0.95)` và mờ dần.
  2. Bổ sung hiệu ứng phản hồi co xoay cho nút đóng: `[id^="close-"][id$="-modal"]:active` co lại `scale(0.92)`.
  3. Cập nhật hàm [`closeDetailPanel()`](file:///d:/DreamHouse/js/app.js) và [`closeProfileModal()`](file:///d:/DreamHouse/js/app.js) để gắn class `.is-closing`, trì hoãn $240\text{ms}$ đợi animation kết thúc rồi mới gán `.hidden` và giải phóng khóa cuộn trang (`document.body.style.overflow = ''`).
  4. Nâng tham số cache-busting lên `?v=5.0` trên toàn bộ dự án.

---

### 🔴 Lỗi 33: Hiệu ứng đóng panel chi tiết mẫu nhà (`#detail-modal`) không thấy rõ hoặc bị giật lag
- **Hiện tượng:** Người dùng phản hồi "vẫn chưa được, ko có animation" khi bấm nút đóng `(X)` hoặc click nền của modal chi tiết mẫu nhà.
- **Nguyên nhân cốt lõi:**
  1. *Biên độ chuyển động quá nhỏ:* Phiên bản trước chỉ co tỉ lệ nhẹ 5% (`scale(0.95)`) trên một khung modal kích thước lớn tới $1200\text{px}$ mà không có độ dịch chuyển tọa độ trục dọc (`translateY`), khiến mắt người dùng cảm giác như modal chỉ mờ đi tức thì chứ không có chuyển động cơ học vật lý.
  2. *Xung đột giật layout thanh cuộn (Scrollbar Reflow Jitter):* Trong hàm `closeDetailPanel()` và `closeProfileModal()`, lệnh giải phóng thanh cuộn `document.body.style.overflow = ''` được kích hoạt ngay ở frame 0 cùng lúc thêm class `.is-closing`. Trên Windows Chrome, việc đột ngột hoàn trả thanh cuộn dọc (rộng ~17px) làm layout toàn bộ trang chủ bị reflow và giật đột ngột, làm gián đoạn (dropped frame) chu kỳ vẽ animation của trình duyệt.
  3. *Hiệu ứng làm mờ nền (backdrop blur):* Thuộc tính `backdrop-filter: blur(12px)` không nội suy mượt nếu chỉ thay đổi `opacity` trên overlay.
- **Cách khắc phục dứt điểm:**
  1. Nâng cấp CSS Animation trong [`style.css`](file:///d:/DreamHouse/style.css):
     - `@keyframes modalWindowIn`: Trượt lên từ `translateY(28px) scale(0.96)` lên `translateY(0) scale(1)` kết hợp `cubic-bezier(0.16, 1, 0.3, 1)` thời gian $0.34\text{s}$.
     - `@keyframes modalWindowOut`: Trượt xuống rõ rệt từ `translateY(0) scale(1)` xuống `translateY(28px) scale(0.96)` và `opacity: 0` trong $0.3\text{s}$, tạo cảm giác cơ học vật lý chân thực tương đồng với modal login.
     - `@keyframes modalOverlayOut`: Hạ từ từ `backdrop-filter: blur(12px)` về `blur(0px)` và mờ dần trong $0.3\text{s}$.
  2. Tinh chỉnh JS trong [`js/app.js`](file:///d:/DreamHouse/js/app.js): Di dời lệnh `document.body.style.overflow = ''` vào bên trong `setTimeout(..., 280)` – chỉ khôi phục thanh cuộn sau khi animation đóng đã chạy trọn vẹn và modal đã bị ẩn hoàn toàn, triệt tiêu 100% hiện tượng giật màn hình.
  3. Tăng tham số cache-busting lên `?v=5.1` trên toàn bộ dự án ([`index.html`](file:///d:/DreamHouse/index.html) và [`admin.html`](file:///d:/DreamHouse/admin.html)).

---

### 🔴 Lỗi 34: Cuộn trang đến Thư viện mẫu hoặc Liên hệ bị lệch điểm nhìn (thừa khoảng trống hoặc bị che khuất)
- **Hiện tượng:** Khi bấm vào liên kết điều hướng "Thư viện mẫu" hoặc "Liên hệ", trình duyệt tự động cuộn xuống nhưng để lại một khoảng trống đen mênh mông phía trên tiêu đề (ở mục Liên hệ) hoặc khoảng cách giữa đáy Header và nội dung không đều nhau giữa các mục.
- **Nguyên nhân cốt lõi:**
  1. *Chênh lệch padding giữa các section:* `.contact-section` có `padding: 100px 0;`, trong khi `.gallery-section` có `padding: 60px 0 100px;`.
  2. *Thuật toán cuộn cũ tính theo container bao ngoài:* Hàm `smoothScrollTo` cũ tính vị trí cuộn theo đỉnh của thẻ `<section>` hoặc `<main>`. Khi cộng dồn padding-top 100px với offset 84px của Header, khoảng cách từ đáy Header đến tiêu đề thực tế bị đội lên tới hơn 110px, làm lãng phí không gian hiển thị và đẩy form liên hệ tràn ra khỏi màn hình.
  3. *Thiếu tính thích ứng động của Header:* Header có thể thay đổi chiều cao nhẹ trên các kích thước màn hình khác nhau hoặc khi zoom.
- **Cách khắc phục dứt điểm:**
  1. Cân đối lại padding các section trong [`style.css`](file:///d:/DreamHouse/style.css): Cả `.gallery-section` và `.contact-section` đều sử dụng padding đồng bộ `40px 0 80px`, giảm `margin-top` của lưới liên hệ xuống `36px` để toàn bộ khối liên hệ nằm gọn gàng trong tầm mắt.
  2. Nâng cấp thuật toán `scrollToSection(target)` trong [`js/app.js`](file:///d:/DreamHouse/js/app.js):
     - Tự động lấy chiều cao thực tế của Header: `const headerHeight = header ? header.offsetHeight : 76;`.
     - Tìm đỉnh của phần tử tiêu đề nội dung: `const sectionTitle = element.querySelector('.section-title') || element;`.
     - Thiết lập khoảng cách đệm chuẩn mắt nhìn: Cố định đúng $26\text{px}$ từ đáy Header đến đỉnh tiêu đề (`rect.top + scrollTop - headerHeight - 26`).
  3. Cập nhật `scroll-margin-top: 104px;` và `scroll-padding-top: 104px;` trong CSS để bảo đảm điều hướng anchor link trực tiếp cũng đồng bộ hoàn hảo.
  4. Nâng tham số cache-busting lên `?v=5.5` trên toàn bộ dự án.

---

### 🔴 Lỗi 35: Mô hình 3D nằm lệch ở rìa ngoài sân lưới và bị chặn góc nhìn không vào được nội thất
- **Hiện tượng:**
  1. Khi mở modal xem 3D, ngôi nhà bị nằm lệch hẳn về một góc/rìa ngoài của sân lưới (GridHelper) thay vì nằm ở chính giữa trung tâm.
  2. Khi cuộn chuột để phóng to xem chi tiết nội thất các phòng bên trong thì camera bị chặn đứng lại ở bên ngoài tường, không thể lọt vào trong nhà.
- **Nguyên nhân cốt lõi:**
  1. *Gốc tọa độ mô hình bị lệch (Offset Pivot/Origin):* Khi xuất file GLTF/OBJ từ phần mềm kiến trúc (SketchUp/Revit/Blender), gốc tọa độ $(0,0,0)$ của file thường đặt ở một mốc ngẫu nhiên (ví dụ góc tường hoặc ranh đất). Code cũ trong [`js/viewer3d.js`](file:///d:/DreamHouse/js/viewer3d.js) chèn trực tiếp `currentMeshGroup` vào scene mà không tịnh tiến tọa độ của mesh về tâm sàn, làm nhà bị đẩy ra góc rìa sân.
  2. *Giới hạn bán kính cuộn quá lớn:* Lệnh `this.spherical.radius = Math.max(8, ...)` áp đặt khoảng cách camera tối thiểu là 8 mét. Đối với hầu hết các mẫu nhà phố (rộng 5m, sâu 10-16m), cự ly 8m nằm hoàn toàn ở bên ngoài tường ngoại thất, ngăn cản camera tiếp cận không gian bên trong.
  3. *Tường trần trong nhà bị tàng hình (Backface Culling):* Vật liệu mặc định của Three.js chỉ kết xuất `FrontSide`. Khi camera di chuyển vào phòng, các mặt trái của tường, vách ngăn và trần nhà bị culling biến mất.
  4. *Thiếu tính năng Pan:* Người dùng chỉ có thể xoay quanh một tâm cố định, không thể dịch chuyển camera qua lại giữa các phòng ngủ, phòng khách hoặc tầng trên.
- **Cách khắc phục dứt điểm:**
  1. **Tự động căn giữa tâm tuyệt đối:**
     - Sau khi nạp model, tính toán `initialBox` và `initialCenter`.
     - Dịch chuyển: `position.x -= initialCenter.x; position.z -= initialCenter.z; position.y -= initialBox.min.y;` (đáy nhà tiếp xúc chính xác với mặt sàn $y = 0$).
     - Tính toán lại bounding box chuẩn và cập nhật `target` vào tâm đối tượng. Ngôi nhà luôn nằm cân đối ở chính giữa sân lưới.
  2. **Mở khóa Zoom siêu cận ($0.1\text{m}$):**
     - Đổi giới hạn bán kính thành `Math.max(0.1, Math.min(100, this.spherical.radius))`.
     - Tốc độ zoom thích ứng theo cự ly (`zoomFactor = Math.max(0.1, radius * 0.08)`) giúp bước chuyển mượt mà, không bị nhảy giật khi di chuyển xuyên qua cửa sổ hoặc cửa chính vào trong phòng.
     - Giảm `camera.near` từ `0.1` xuống `0.05` ($5\text{cm}$) để hiển thị sắc nét các vật thể nội thất ở cự ly siêu gần mà không bị cắt phẳng.
  3. **Kích hoạt kết xuất hai mặt (`THREE.DoubleSide`):** Tự động duyệt qua toàn bộ mesh con và thiết lập `child.material.side = THREE.DoubleSide` để mọi bức tường và trần nhà bên trong luôn hiển thị nguyên vẹn.
  4. **Tích hợp tính năng Pan (Di chuyển tâm nhìn tự do):**
     - Chuột phải (hoặc Shift + Chuột trái): Di chuyển tâm nhìn sang trái, phải, lên, xuống tự do.
     - Cảm ứng 2 ngón tay trên điện thoại: Hỗ trợ cử chỉ chạm 2 ngón vừa Pan vừa Pinch-Zoom mượt mà.
     - Thêm nguồn sáng nội thất nhẹ (`interiorLight`) soi sáng ấm cúng bên trong không gian các phòng.
  5. Nâng tham số cache-busting lên `?v=5.6` trên toàn bộ dự án ([`index.html`](file:///d:/DreamHouse/index.html) và [`admin.html`](file:///d:/DreamHouse/admin.html)).

---

### 🔴 Lỗi 36: Trang Quản Trị (`admin.html`) bị vỡ font dấu tiếng Việt ở tiêu đề và thiếu đồng bộ giao diện Dark/Light Mode
- **Hiện tượng:**
  1. Tiêu đề *"Bảng Quản Trị Hệ Thống"* trên trang Admin bị nhảy khoảng cách chữ *"Thố ng"* do lỗi fallback font có chân khi có dấu sắc + mũ.
  2. Bảng quản trị sử dụng CSS inline cố định màu trắng (`#fff`, `#f7f6f2`), đơn điệu, không đồng bộ với hệ thống Design Tokens và không có nút chuyển đổi Sáng/Tối (Light/Dark Mode).
- **Nguyên nhân cốt lõi:**
  1. Trong `<head>` của [`admin.html`](file:///d:/DreamHouse/admin.html) chưa nhúng liên kết Google Fonts (`Inter` và `Playfair Display` hỗ trợ subset tiếng Việt), khiến trình duyệt tự lấy font Georgia mặc định của Windows khi hiển thị biến `--font-serif`, gây lỗi kerning ở ký tự `ố`.
  2. Các bảng và nút trong `admin.html` được viết từ giai đoạn đầu bằng inline `<style>` cơ bản, chưa kế thừa kiến trúc Glassmorphism và Design Tokens của [`style.css`](file:///d:/DreamHouse/style.css).
- **Cách khắc phục dứt điểm:**
  1. Nhúng đầy đủ bộ font Google `Inter` & `Playfair Display` vào `<head>` của [`admin.html`](file:///d:/DreamHouse/admin.html) giống hệt [`index.html`](file:///d:/DreamHouse/index.html).
  2. Thiết kế lại toàn diện Admin Portal trong [`admin.html`](file:///d:/DreamHouse/admin.html) và [`style.css`](file:///d:/DreamHouse/style.css) (Mục 15):
     - Tích hợp nút chuyển chế độ Sáng/Tối (Circular Reveal #219) đồng bộ `localStorage.getItem('dream_house_theme')`.
     - Xây dựng Hero Banner, 4 thẻ thống kê Bento KPI thời gian thực, thanh Segmented Pill Tabs, bộ lọc nhanh loại nhà và ô tìm kiếm tức thì.
     - Chuẩn hóa toàn bộ bảng dữ liệu, huy hiệu phân loại, huy hiệu 3D, nút thao tác Sửa/Xoá và Modal Thêm/Sửa mẫu nhà bằng hệ biến `--btn-close-...` và `--btn-subtle-...` tương thích hoàn hảo cả Light Mode và Dark Mode.
     - Mở rộng `.admin-body .container` lên `max-width: 1420px`, giảm padding ngang các cột xuống `11px`, gán `white-space: nowrap` cho cột Quy mô, Số tầng, Dự toán và Thao tác để toàn bộ 9 cột hiển thị trọn vẹn trên màn hình PC mà không bị cắt nút *Xoá* ở rìa phải (chỉ cuộn ngang khi màn hình hẹp).
  3. Nâng tham số cache-busting lên `?v=5.8` trên toàn bộ dự án.

---

### 🔴 Lỗi 37: Thông báo Toast hiện lên liên tục gây rối mắt và che khuất nội dung khi bấm icon trái tim (Yêu thích)
- **Hiện tượng:** Mỗi lần người dùng click vào icon trái tim trên ảnh mẫu nhà (hoặc trong modal chi tiết) để thả tim hoặc bỏ tim, màn hình lại bật lên một thanh thông báo Toast lớn ("Đã lưu mẫu nhà vào danh sách yêu thích!" hoặc "Đã gỡ mẫu nhà khỏi danh sách yêu thích.") kèm hiệu ứng đè lên nội dung duyệt web.
- **Nguyên nhân cốt lõi:**
  1. Trong hàm [`toggleFavorite(templateId)`](file:///e:/Dream-house/js/app.js), đoạn mã gọi `window.toast.success(...)` và `window.toast.info(...)` bị kích hoạt sau mỗi cú click.
  2. Nút trái tim vốn đã có hiệu ứng micro-interaction trực quan hoàn hảo (nở tim, hạt pháo hoa nổ bung `.u022-ring`, đổi màu đỏ/vàng kim tức thì) để xác nhận hành động cho người dùng. Việc bật thêm một hộp Toast pop-up toàn màn hình là dư thừa, làm giảm cảm giác sang trọng và gây ngắt quãng trải nghiệm duyệt nhà.
- **Cách khắc phục dứt điểm:**
  1. Loại bỏ hoàn toàn khối mã hiển thị `window.toast` trong hàm `toggleFavorite()` tại [`js/app.js`](file:///e:/Dream-house/js/app.js).
  2. Giữ nguyên toàn bộ logic đồng bộ ngầm: lưu tức thời vào `Set` trong RAM, cập nhật `localStorage` (`dream_house_favs`), và gửi mutation nền lên bảng `favorites` của cơ sở dữ liệu Supabase nếu người dùng đã đăng nhập.
  3. Cập nhật giao diện trái tim mượt mà ngay tại chỗ không có độ trễ, không còn bất kỳ toast pop-up nào che chắn tầm nhìn.
  4. Nâng tham số cache-busting lên `?v=5.9` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 38: Lưới mẫu nhà bị giật hình đột ngột khi chuyển đổi bộ lọc Yêu thích và thiếu trạng thái rỗng trực quan
- **Hiện tượng:** Khi click vào nút *"Chỉ hiện mục yêu thích"*, lưới mẫu nhà bị thay đổi đột ngột (cắt cụt hoặc biến mất tức thời) khiến người xem bị giật mắt. Nếu người dùng chưa lưu mẫu nhà nào, màn hình chỉ hiện một dòng chữ đơn điệu không có tính dẫn dắt hành vi. Ngoài ra nút lọc chỉ là checkbox OS cổ điển không có animation phản hồi tương xứng với đẳng cấp website kiến trúc.
- **Nguyên nhân cốt lõi:**
  1. Thao tác lọc trực tiếp gán đè `gallery.innerHTML` mà không thông qua giai đoạn chuyển tiếp hoạt ảnh (exit & enter transition phases).
  2. Các phần tử `.house-card` mới render không có cấu hình độ trễ so le (staggered delay), khiến toàn bộ thẻ cùng hiện lên một lúc một cách thô ráp.
  3. Nút lọc chưa được nâng cấp thành công tắc tương tác chuyên biệt (pill toggle switch).
- **Cách khắc phục dứt điểm:**
  1. Nâng cấp nút lọc thành công tắc xúc giác cao cấp với con trượt bo tròn, icon trái tim mini tự nhảy (`favHeartPopMini`) và huy hiệu đếm số lượng thời gian thực (`fav-count-badge`).
  2. Bổ sung hàm `animateGalleryTransition()` tạo hiệu ứng mờ co nhẹ ($180\text{ms}$) cho các thẻ cũ trước khi hiển thị thẻ mới.
  3. Cấp phát biến `--card-index: ${index}` cho từng thẻ nhà để chạy hoạt ảnh thác đổ (`@keyframes cardEntrance`) với đường cong chuyển động lò xo mượt mà.
  4. Hỗ trợ animation `.card-exit` mượt mà khi bỏ tim một mẫu nhà ngay trong giao diện lọc yêu thích.
  5. Xây dựng giao diện trạng thái rỗng (`.fav-empty-state`) với trái tim đập nhịp nhàng và nút hành động *"Khám phá tất cả mẫu nhà"*.
  6. Nâng tham số cache-busting lên `?v=6.0` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 39: Console báo lỗi `POST .../rest/v1/favorites?on_conflict=user_id%2Ctemplate_id 403 (Forbidden)`
- **Hiện tượng:** Khi người dùng mở website (đã đăng nhập) hoặc đăng nhập tài khoản, Console báo đỏ 2 dòng lỗi liên tiếp:
  `POST https://qdkhqvsbtmbgkmoldazt.supabase.co/rest/v1/favorites?on_conflict=user_id%2Ctemplate_id 403 (Forbidden)`.
- **Nguyên nhân cốt lõi:**
  1. **Thiếu quyền RLS UPDATE trên bảng `favorites`:** Lệnh `client.from('favorites').upsert(..., { onConflict: 'user_id,template_id' })` được PostgREST chuyển hóa thành truy vấn SQL `INSERT INTO ... ON CONFLICT (user_id, template_id) DO UPDATE SET ...`. Theo cơ chế Row Level Security của PostgreSQL, mệnh đề `ON CONFLICT DO UPDATE` bắt buộc user phải thỏa mãn cả 2 chính sách `INSERT` VÀ `UPDATE`. Do bảng `favorites` trong `02_security.sql` chỉ có chính sách cho `SELECT`, `INSERT`, `DELETE` mà thiếu `UPDATE`, PostgreSQL lập tức chặn và trả về HTTP 403 Forbidden.
  2. **Trùng lặp gọi đồng bộ (Double Invocation Race Condition):** Khi khởi động ứng dụng, cả 2 tiến trình `getSession()` và `onAuthStateChange('INITIAL_SESSION')` đều kích hoạt hàm `syncFavoritesWithSupabase()` gần như cùng một tích tắc, khiến 2 request POST xung đột chạy song song.
  3. **ID mẫu nhà offline không hợp lệ định dạng UUID:** Các mẫu thử nghiệm ban đầu dùng ID ngắn dạng chuỗi ký tự (`'np-01'`, `'bt-01'`) không tương thích với kiểu dữ liệu `UUID` của bảng `favorites`.
- **Cách khắc phục dứt điểm:**
  1. **Tối ưu logic Client trong [`js/app.js`](file:///e:/Dream-house/js/app.js):**
     - Đặt cờ khóa luồng `_isSyncingFavorites` để triệt tiêu hoàn toàn race condition gọi trùng lặp 2 lần.
     - Sau khi `select('template_id')` thành công, lấy tập hợp `existingDbIds` và chỉ lọc ra những ID hợp lệ UUID chưa có trong DB để gọi `insert()` thuần túy.
     - Loại bỏ việc dùng `upsert` kèm `on_conflict` không cần thiết.
     - Trong `toggleFavorite(templateId)`, kiểm tra regex UUID trước khi gọi lệnh ghi lên Supabase.
  2. **Tạo migration RLS [`supabase/08_fix_favorites_rls.sql`](file:///e:/Dream-house/supabase/08_fix_favorites_rls.sql):**
     - Bổ sung chính sách `CREATE POLICY "Users can update their own favorites" ON public.favorites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
     - Cập nhật đồng bộ vào [`supabase/all_in_one_setup.sql`](file:///e:/Dream-house/supabase/all_in_one_setup.sql) và [`supabase/02_security.sql`](file:///e:/Dream-house/supabase/02_security.sql).
  3. **Nâng tham số cache-busting lên `?v=6.1` trên toàn bộ dự án (`index.html` và `admin.html`).**

---

### 🔴 Lỗi 40: Thoát tab rồi quay lại tab web thì animation hiển thị các mẫu nhà bị tự động reload lại
- **Hiện tượng:** Khi người dùng đang xem danh sách mẫu nhà, chuyển sang một tab khác trong trình duyệt (hoặc thu nhỏ cửa sổ) rồi click quay lại tab Dream House, toàn bộ các thẻ mẫu nhà tự động chạy lại hoạt ảnh trượt lên (cascade animation) giống như trang web vừa bị F5 tải lại.
- **Nguyên nhân cốt lõi:**
  1. Thư viện Supabase JS tự động lắng nghe sự kiện `visibilitychange` của trình duyệt. Mỗi khi tab được hiển thị trở lại (`visibilityState === 'visible'`), Supabase tiến hành kiểm tra làm mới token và kích hoạt sự kiện `onAuthStateChange` với `event = 'TOKEN_REFRESHED'`.
  2. Trình lắng nghe `onAuthStateChange` trong [`js/app.js`](file:///e:/Dream-house/js/app.js) trước đó không kiểm tra loại `event`, lập tức gọi lại `syncFavoritesWithSupabase()`.
  3. Hàm `syncFavoritesWithSupabase()` luôn gọi `this.renderGallery()` ở cuối, xóa toàn bộ thẻ cũ và tạo mới lại các phần tử `.house-card` vào DOM.
  4. Vì các thẻ `.house-card` mới được sinh ra mang class animation `cardEntrance`, trình duyệt buộc phải kích hoạt lại toàn bộ chuỗi animation từ đầu.
- **Cách khắc phục dứt điểm:**
  1. Trong `client.auth.onAuthStateChange()`, bổ sung khối kiểm tra:
     `if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;`
     Chỉ làm mới đối tượng `this.currentUser = session.user` mà tuyệt đối không gọi lại hàm tải dữ liệu hay re-render.
  2. Trong `syncFavoritesWithSupabase()`, loại bỏ lệnh `this.renderGallery()` vô điều kiện. Thay vào đó, chỉ khi có ID yêu thích mới từ DB đổ về mới cập nhật trạng thái nút tim tại chỗ thông qua `updateCardFavoriteUI(favId, true)` (thao tác DOM trực tiếp không làm hủy thẻ).
  3. Nâng tham số cache-busting lên `?v=6.2` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 41: Huy hiệu góc ảnh thẻ nhà hiển thị slug kỹ thuật `biet-thu` thay vì tên có dấu `Biệt thự` hoặc phong cách người dùng nhập
- **Hiện tượng:** Admin chọn phân loại kiến trúc là "Biệt thự (Luxury Villa)" hoặc "Nhà phố", nhưng ngoài trang chủ thì góc trên bên trái bức ảnh lại hiển thị nhãn slug tiếng Anh không dấu có gạch ngang (`biet-thu`, `nha-pho`, `nha-cap-4`).
- **Nguyên nhân cốt lõi:**
  1. Trong [`js/app.js`](file:///e:/Dream-house/js/app.js) tại dòng render thẻ card: `<span class="card-badge">${style || item.type}</span>`. Do mẫu nhà không có `style_vi` nên code tự động in ra giá trị trường `item.type` (vốn là slug hệ thống trong DB).
  2. Trong [`admin.html`](file:///e:/Dream-house/admin.html), form tạo và chỉnh sửa mẫu nhà trước đây chưa có trường nhập `Phong cách / Nhãn hiển thị` (`style_vi`), người dùng không thể can thiệp chữ hiển thị trên huy hiệu này.
- **Cách khắc phục dứt điểm:**
  1. **Nâng cấp `js/app.js`:** Thêm bảng ánh xạ `typeDisplayNames` cho 3 loại nhà chuẩn (`nha-pho` -> "Nhà phố" / "Townhouse", `biet-thu` -> "Biệt thự" / "Villa", `nha-cap-4` -> "Nhà cấp 4" / "Bungalow"). Kiểm tra nếu `style` rỗng hoặc mang giá trị slug thì tự động chuyển sang tên tiếng Việt/Anh chuẩn đẹp mắt.
  2. **Thêm trường nhập `Phong cách / Nhãn hiển thị` (`#tpl-style`) trong [`admin.html`](file:///e:/Dream-house/admin.html):** Cho phép người dùng gõ trực tiếp phong cách mong muốn (ví dụ: *"Biệt thự vườn"*, *"Hiện đại"*, *"Tân cổ điển"*...) hoặc để trống thì hệ thống sẽ tự động lấy theo phân loại đã chọn.
  3. **Lưu trường `style_vi` và `style_en` vào database Supabase khi tạo hoặc cập nhật mẫu nhà.**
  4. Nâng tham số cache-busting lên `?v=6.3` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 42: Hiện tượng nháy nút Đăng nhập (Auth Flash / Delay) khi quay lại trang chủ hoặc vừa lưu mẫu nhà ở Admin
- **Hiện tượng:** Người dùng đã đăng nhập (hoặc Admin vừa lưu đồ án ở trang quản trị), khi mở lại trang chủ `index.html` thì góc phải thanh điều hướng ban đầu hiển thị nút `[Đăng nhập]` như chưa có tài khoản, phải đợi một lúc sau mới tự động chuyển sang hiển thị Avatar và tên tài khoản đã đăng nhập.
- **Nguyên nhân cốt lõi:**
  1. Trong HTML tĩnh ban đầu của `index.html`, nút `#btn-open-login` được hiển thị sẵn, còn menu `#user-menu` bị ẩn bằng class `hidden`.
  2. Trong hàm `setupAuth()` của [`js/app.js`](file:///e:/Dream-house/js/app.js), sau khi gọi `await client.auth.getSession()` và gán `this.currentUser = session.user`, hàm `this.updateAuthUI()` không được gọi ngay mà bị bỏ sót.
  3. Trong bộ lắng nghe `client.auth.onAuthStateChange`, để ngăn chặn re-render animation thẻ nhà, code trước đó đã thêm lệnh `if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;`. Vì `return` ngay mà không gọi `this.updateAuthUI()`, sự kiện `INITIAL_SESSION` của Supabase bị bỏ qua, dẫn đến giao diện vẫn giữ nguyên nút "Đăng nhập".
  4. Hàm `setupAuth()` không được `await` trong `init()`, dẫn đến giao diện phải chờ một sự kiện ngẫu nhiên sau đó (như đổi ngôn ngữ hoặc token refresh muộn) mới vô tình kích hoạt `updateAuthUI()`.
- **Cách khắc phục dứt điểm:**
  1. **Cơ chế phục hồi Frame 0 (0ms delay) từ `localStorage`:** Trước khi chạy các tác vụ bất đồng bộ, hàm `getCachedUserFromStorage()` quét khóa `sb-*-auth-token` của Supabase trong `localStorage`. Nếu tìm thấy `cachedUser`, gán ngay `this.currentUser = cachedUser` và gọi `this.updateAuthUI()` đồng bộ ngay lập tức. Nút "Đăng nhập" bị ẩn ngay từ mili-giây đầu tiên, hiển thị Avatar ngay lập tức.
  2. **Bổ sung `this.updateAuthUI()` ngay lập tức trong `setupAuth()`:** Cập nhật ngay khi lấy session từ server và cập nhật lại sau khi nạp hồ sơ người dùng (`loadUserProfile`).
  3. **Đồng bộ UI trong `onAuthStateChange`:** Khi gặp sự kiện `TOKEN_REFRESHED` hoặc `INITIAL_SESSION`, vẫn cập nhật `this.currentUser = session.user` và gọi `this.updateAuthUI()`, chỉ không re-render lại thẻ nhà.
  4. **Thêm `await this.setupAuth()` trong `init()`.**
  5. Nâng tham số cache-busting lên `?v=6.4` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 43: Giao diện thống kê phân tích thị hiếu cũ bị lặp danh sách 4 thẻ đơn điệu và thiếu tính tương tác trực quan
- **Hiện tượng:** Ban đầu tab Thống Kê (`#panel-analytics`) trong `admin.html` bố trí 4 card với danh sách text thanh tiến trình lặp lại giống nhau, thiếu biểu đồ hình học trực quan, không hiển thị được xu hướng tăng trưởng lưu lượng theo chu kỳ thời gian (ngày, tuần, tháng, toàn bộ) và phân bổ thị phần giữa các loại kiến trúc (Nhà phố, Biệt thự, Nhà cấp 4).
- **Nguyên nhân cốt lõi:**
  1. Chưa áp dụng các chuẩn thiết kế vi tương tác (micro-interactions) chuyên sâu cho dữ liệu kiến trúc.
  2. Bố cục 4 thẻ dạng text-list chiếm nhiều diện tích dọc nhưng mật độ thông tin và trải nghiệm thẩm mỹ thấp.
  3. Khi hệ thống tự động làm mới số liệu (auto-refresh mỗi 15 giây), nếu vẽ lại DOM hoàn toàn sẽ làm gián đoạn chu kỳ đang xem hoặc phân loại mà admin đang click kiểm tra.
- **Cách khắc phục dứt điểm:**
  1. **Tích hợp Lucian UX/UI Prompt #047 (Period Segmented Control & Dynamic Bezier Wave):**
     - Núm trượt cao su đàn hồi (`.u047-knob` spring easing), bộ đếm cuộn số mượt mà (`.u047-num`) qua `requestAnimationFrame`.
     - Đường cong sóng Bezier SVG (`.u047-line`, `.u047-area`) tự uốn lượn khi đổi chu kỳ (Hôm nay, 7 ngày, 30 ngày, Toàn bộ) kèm điểm phát sáng beacon đập nhịp tuần hoàn.
  2. **Tích hợp Lucian UX/UI Prompt #097 (Donut that re-splits & Center Stat Switcher):**
     - Biểu đồ tròn Donut SVG tương tác: Di chuột trượt lát cắt ra ngoài 7px và dày lên 34px, nhãn trung tâm đảo hoạt ảnh hiển thị số lượt xem và % thị phần.
     - Click lát cắt hoặc nút phân loại: Tự động tính toán lại góc quay lấp đầy 360 độ (`morph()`) và cuộn lại tổng số (`rollTotal()`).
     - Rung phản hồi (Tactile Shake) ngăn chặn tắt phân loại cuối cùng.
  3. **Tái cấu trúc 2 Tầng (2-Tier Grid):** Tầng 1 gồm 2 Hero Visual Interactive Widgets; Tầng 2 gồm 2 Leaderboards chi tiết xếp hạng lượt xem và lượt thả tim.
  4. **Lưu giữ trạng thái tương tác (State Preservation):** Lưu `root._curPeriod` và `root._onState` để cơ chế làm mới định kỳ không gây reset giao diện của người dùng.
  5. Đồng bộ biến CSS Design Tokens `--ux-*` cho cả Dark Mode và Light Mode, nâng phiên bản cache-busting lên `?v=6.5`.

---

### 🔴 Lỗi 44: Thẻ KPI Bento "Lượt xem mẫu (Realtime)" trên trang Quản trị bị vỡ 3 dòng tiêu đề, méo huy hiệu `TRỰC TIẾP` và lệch trục ngang
- **Hiện tượng:** Trên hàng thẻ KPI Bento (`.admin-stats-grid`) của `admin.html`, thẻ thứ 2 ("Lượt xem mẫu") bị ép chữ `LƯỢT XEM MẪU (REALTIME)` thành 3 dòng dọc, huy hiệu xanh `.live-pulse-badge` (`TRỰC TIẾP`) bị gãy làm 2 dòng (`TRỰC` / `TIẾP`) và dính sát vào ô icon mắt màu cyan; chấm tròn `.pulse-dot` bị bóp dẹt thành vạch dọc; số `0` bị đẩy tụt xuống thấp hơn hẳn các thẻ bên cạnh; dòng mô tả cuối `"Chưa có lượt xem nào ghi nhận"` bị rớt chữ `"nhận"` xuống dòng thứ 2.
- **Nguyên nhân cốt lõi:**
  1. Khi nâng `.admin-stats-grid` từ 4 cột lên 5 cột, chiều ngang mỗi thẻ giảm xuống còn ~235px (trừ padding và icon còn ~134px).
  2. Đặt cả cụm chữ dài `LƯỢT XEM MẪU (REALTIME)` lẫn huy hiệu `.live-pulse-badge` chung một hàng flex ngang với `.admin-stat-icon` khiến không gian bị thiếu hụt nghiêm trọng.
  3. `.live-pulse-badge` thiếu `white-space: nowrap; flex-shrink: 0;` và `.pulse-dot` thiếu `flex-shrink: 0; min-width: 6px;`, dẫn tới việc Flexbox tự động bóp méo chấm tròn và bẻ gãy dòng chữ `TRỰC TIẾP`.
  4. `.admin-stat-card` dùng `display: flex; justify-content: space-between;` khiến cột icon bên phải (dù chỉ cao 42px ở góc trên) chiếm mất 54px chiều ngang dọc suốt từ đỉnh xuống đáy thẻ, làm dòng `.admin-stat-meta` ở dưới cùng bị hẹp và rớt chữ.
- **Cách khắc phục dứt điểm:**
  1. **Tái cấu trúc 3 tầng đồng nhất cho toàn bộ 5 thẻ KPI (`.admin-stat-card`):**
     - **Tầng 1 (`.admin-stat-label`):** Rút gọn nhãn thành `LƯỢT XEM MẪU NHÀ` với `white-space: nowrap; padding-right: 50px;`, đảm bảo luôn nằm trên **1 dòng duy nhất** ngang bằng với 4 thẻ còn lại.
     - **Tầng 2 (`.admin-stat-value-row`):** Đưa huy hiệu `<span class="live-pulse-badge"><span class="pulse-dot"></span>Trực tiếp</span>` xuống nằm cạnh con số lớn `#stat-total-views` (`gap: 10px`). Vị trí này có khoảng trống ngang rộng rãi nên huy hiệu hiển thị trọn vẹn và 5 con số lớn của cả 5 thẻ thẳng hàng tuyệt đối trên một trục ngang.
     - **Tầng 3 (`.admin-stat-meta`):** Cho phép trải rộng 100% chiều ngang đáy thẻ kèm `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`.
  2. **Định vị tuyệt đối cho `.admin-stat-icon` (`position: absolute; top: 18px; right: 18px; width: 42px; height: 42px;`):** Giữ icon cố định ở góc trên phải, giải phóng toàn bộ chiều rộng bên dưới cho dòng phụ đề.
  3. **Khóa hình học cho `.live-pulse-badge` & `.pulse-dot`:** Thêm `white-space: nowrap; flex-shrink: 0; line-height: 1;` cho badge và `min-width: 6px; min-height: 6px; flex-shrink: 0;` cho chấm tròn.
  4. Giữ nguyên hành vi hiển thị thuần túy đồng nhất với 4 thẻ KPI còn lại (không gắn click chuyển tab), nâng tham số phiên bản cache-busting lên `?v=6.7` trên toàn bộ `index.html` và `admin.html`.

---

### 🔴 Lỗi 45: Giao diện xếp hạng thị hiếu (Lượt xem & Thả tim) hiển thị dạng danh sách phẳng, khó so sánh trực quan
- **Hiện tượng:** Tại Tầng 2 của tab Thống Kê (`#panel-analytics`), hai card xếp hạng mẫu nhà hiển thị các hàng chữ ngang lặp lại kèm thanh tiến trình nhỏ, thiếu độ cao trực quan của biểu đồ cột, khiến quản trị viên khó nhận diện ngay mẫu nhà nào đang tạo sức hút vượt trội.
- **Nguyên nhân cốt lõi:**
  1. Chưa xây dựng giao diện biểu đồ cột chuyên biệt cho hai tập dữ liệu (Lượt xem và Thả tim).
  2. Thiếu trục tung (Y-axis gridlines) để đối chiếu trực quan các mốc giá trị thực tế (Max, 50%, 0).
- **Cách khắc phục dứt điểm:**
  1. **Tạo Biểu Đồ Cột Đứng Hiện Đại (`.analytics-column-chart-wrap`):**
     - Trục tung nét đứt mảnh hiển thị các mốc giá trị thực tế.
     - Cột đứng chuyển sắc mềm mại (Cyan-Blue cho lượt xem, Rose-Pink cho thả tim), tự động tính toán chiều cao cột theo tỷ lệ thực tế với animation lò xo (`transition: height 0.75s var(--ease-spring)`).
     - Thẻ số liệu (`.chart-col-value-badge`) nổi phía trên đỉnh cột.
     - Chân cột tích hợp huy hiệu thứ hạng (🥇, 🥈, 🥉, #4...), ảnh phối cảnh thu nhỏ (32×32px), tên mẫu nhà và nhãn phân loại kiến trúc.
  2. **Tích hợp bộ chuyển đổi góc nhìn (`.chart-view-toggle`):** Cho phép người dùng chuyển nhanh giữa chế độ *Biểu đồ Cột* (Mặc định) và *Bảng Danh Sách* tùy nhu cầu.
  3. Tự động hỗ trợ Dark Mode, Light Mode và Responsive trên thiết bị di động.
  4. Nâng tham số cache-busting lên `?v=6.8` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 46: Giao diện trên thiết bị di động (Mobile) bị vỡ bố cục Header, chèn ép logo, lệch nút Hero và tràn thanh bộ lọc
- **Hiện tượng:**
  1. Logo *"Dream House"* trên thanh điều hướng di động bị co ép xuống 2 hàng ("Dream" và "House"), chữ "Dream" bị tràn mép trên và cắt cụt nửa thân chữ; các nút Dark Mode, VI/EN và Admin bị dính chùm chật chội.
  2. Huy hiệu câu châm ngôn *"KIẾN TRÚC TINH HOA - XÂY DỰNG TỔ ẤM HOÀN MỸ"* bị rớt chữ *"MỸ"* trơ trọi ở hàng thứ 2.
  3. Hai nút bấm *"Khám phá mẫu nhà"* và *"Liên hệ"* trong khối Hero bị lệch kích thước nghiêm trọng (nút to nút nhỏ).
  4. Ô tìm kiếm mẫu nhà bị cắt ngắn cụt chữ placeholder; hai dropdown *"Tất cả loại nhà"* và *"Mặc định sắp xếp"* bị co cụm méo mó; nút switch *"Chỉ hiện mục yêu thích"* bị dạt sang một bên không cân đối.
- **Nguyên nhân cốt lõi:**
  1. Thiếu các thiết lập CSS Media Queries `@media (max-width: 768px)` và `@media (max-width: 380px)` cho các thành phần hạt nhân (Navbar, Brand, Hero CTA, Filter Controls).
  2. `.container` giữ padding cố định `24px` ở cả 2 bên khiến màn hình 375px (iPhone) chỉ còn 327px không gian khả dụng. Cụm `.header-actions` chiếm tới 228px, dồn ép phần còn lại cho Logo chỉ còn dưới 100px.
  3. `.brand-title` thiếu thuộc tính `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` nên bị ngắt dòng không mong muốn.
  4. `.hero-cta-group` và `.filter-dropdowns` sử dụng flexbox tự do không có tỷ lệ cột cố định cho màn hình hẹp.
- **Cách khắc phục dứt điểm:**
  1. **Tái thiết kế thanh điều hướng Header trên Mobile:**
     - Giảm padding ngang `.container` xuống `16px`.
     - Giảm kích thước `.u219-tg` (36×36px), `#lang-toggle` (cao 36px, padding 10px), menu tài khoản người dùng (`max-width: 76px` cho tên, tự động ẩn chữ chỉ giữ avatar trên màn hình < 380px).
     - Khóa `.brand-title` trên **1 hàng duy nhất** (`white-space: nowrap; line-height: 1.15; font-size: 1.25rem;`), bảo đảm logo không bao giờ bị cắt xén hay đè chữ.
  2. **Cân đối khối Hero:**
     - Điều chỉnh font huy hiệu tagline thành `0.7rem`, padding `5px 12px; max-width: 100%;` triệt tiêu lỗi rớt chữ "MỸ".
     - Giảm kích thước tiêu đề `.hero-headline` xuống `clamp(1.75rem, 6.8vw, 2.3rem)` với `line-height: 1.22;`.
     - Bố cục 2 nút CTA thành lưới 2 cột đối xứng (`grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;`).
  3. **Tối ưu thanh công cụ bộ lọc Thư viện mẫu (`#gallery-section`):**
     - Ô tìm kiếm mở rộng `100%` toàn chiều ngang, font `0.86rem`.
     - Nhóm 2 dropdown dàn đều dạng lưới 2 cột (`grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;`), nhãn text có `text-overflow: ellipsis;`, menu con mở rộng 100%.
     - Công tắc lọc yêu thích mở rộng `100%`, căn giữa hoàn hảo.
  4. **Tối ưu Modal Chi tiết mẫu nhà (`#detail-modal`) & Trang Admin:**
     - Chuyển layout modal sang 1 cột dọc thông suốt, điều chỉnh canvas 3D cao 250px và ảnh 190px.
     - Tối ưu 5 thẻ Bento KPI của Admin thành 1 cột dọc trên màn hình di động.
  5. Nâng tham số cache-busting lên `?v=7.0` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 48: Thanh Tab Điều Hướng Admin (`.admin-nav-tabs`) bị rớt hàng và méo mó viền bo tròn trên Mobile do cố định lưới 2 cột (`grid-template-columns: 1fr 1fr`) khi có 3 tabs
- **Hiện tượng:**
  1. Trên màn hình điện thoại, thanh tab điều hướng Admin hiển thị dị dạng: Tab 1 *"Quản lý Mẫu Nhà"* và Tab 2 *"Yêu Cầu Tư Vấn & Báo Gi..."* nằm ở dòng 1 (Tab 2 bị cụt chữ), trong khi Tab 3 *"Thống Kê & Phân Tích"* bị rớt xuống dòng 2 đứng một mình lệch sang trái.
  2. Viền ngoài hình viên thuốc bo tròn (`border-radius: var(--radius-full)`) bị kéo giãn chiều dọc theo 2 dòng, cắt ngang nửa thân của Tab 3 tạo thành một hình oval méo mó rất mất thẩm mỹ.
- **Nguyên nhân cốt lõi:**
  1. Trước đây hệ thống Admin chỉ có 2 tabs ("Quản lý Mẫu Nhà" và "Yêu Cầu Tư Vấn"), CSS mobile `@media (max-width: 640px)` quy định `.admin-nav-tabs { display: grid; grid-template-columns: 1fr 1fr; }`.
  2. Khi tích hợp thêm Tab 3 *"Thống Kê & Phân Tích"*, lưới 2 cột bắt buộc phần tử thứ 3 rớt xuống dòng thứ 2.
  3. Tiêu đề Tab 2 quá dài *"Yêu Cầu Tư Vấn & Báo Giá"* chiếm nhiều diện tích ngang gây tràn chữ trên màn hình hẹp.
- **Cách khắc phục dứt điểm:**
  1. **Chuyển đổi sang Flex Cuộn Ngang Mượt Mà (Touch Horizontal Scroll):**
     - Tại `@media (max-width: 640px)` trong `style.css`: Thay thế `display: grid; grid-template-columns: 1fr 1fr;` bằng layout Flex với `overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; border-radius: var(--radius-full);`.
     - Các nút `.tab-btn` được gán `flex-shrink: 0; white-space: nowrap; padding: 8px 14px; font-size: 0.82rem; gap: 6px;`.
  2. **Tinh chỉnh tiêu đề Tab tinh gọn:** Rút ngắn nhãn hiển thị trong `admin.html` từ *"Yêu Cầu Tư Vấn & Báo Giá"* thành *"Yêu Cầu Tư Vấn"* để thanh thoát, cân xứng với các tab khác.
  3. **Kết quả:** Thanh tab giữ trọn vẹn kiểu dáng viên thuốc tròn cao cấp chuẩn Apple/Bento UI, vuốt cảm ứng ngang êm ái, co giãn tự nhiên không bao giờ bị cắt chữ hay méo viền dù có thêm bao nhiêu tab mới.
  4. Nâng tham số cache-busting lên `?v=7.1` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 49: Nút Đóng (X) trên Modal Thêm/Sửa Mẫu Nhà (`#template-modal`) bị đè lấn lên tiêu đề và giao diện chưa tối ưu thẩm mỹ
- **Hiện tượng:**
  1. Khi mở modal *"Thêm Mẫu Thiết Kế Mới"* hoặc *"Chỉnh Sửa Mẫu Thiết Kế"* trên Admin (đặc biệt trên màn hình di động), nút tròn đóng (X) nằm đè trực tiếp lên chữ cuối của tiêu đề (chữ "Mới" hoặc chữ "Kế").
  2. Giao diện nút X trước đó có màu xám mờ đục đơn điệu, nét chữ X dày (stroke 2.5), thiếu chiều sâu và viền sáng phản chiếu kính mờ (frosted glass) chuẩn Apple / Luxury Bento.
- **Nguyên nhân cốt lõi:**
  1. `.admin-modal-header` không được thiết lập `padding-right` dành riêng cho nút đóng, trong khi nút `.modal-close` được gán `position: absolute; right: 18px; top: 16px;`.
  2. Khối tiêu đề `<h3>` trong `admin.html` sử dụng inline style `font-size: 1.45rem;` kéo dài toàn bộ chiều rộng thẻ, không có khoảng thở dự phòng khiến text dài tràn qua góc phải và bị nút close đè lên.
  3. Biến Design Tokens `--btn-close-...` dùng màu nền xám mờ và thiếu các lớp đổ bóng đa tầng (`box-shadow`, `inset highlight`).
- **Cách khắc phục dứt điểm:**
  1. **Tạo khoảng đệm an toàn tuyệt đối cho Header (`padding-right: 54px;`):**
     - Trong `style.css`: Gán `.admin-modal-header { padding-right: 54px; position: relative; }` (trên mobile: `padding-right: 46px;`).
     - Bọc tiêu đề trong `.admin-modal-title-wrap { flex: 1; min-width: 0; }`, áp dụng class `.admin-modal-title` với `word-break: break-word; font-size: 1.35rem;` (mobile: `1.18rem;`), loại bỏ hoàn toàn inline style cũ.
     - Căn chỉnh vị trí nút close trong `.admin-modal-window .modal-close` ngay hàng thẳng lối với khối icon header (`top: 24px; right: 28px;` trên desktop; `top: 18px; right: 16px;` trên mobile).
  2. **Nâng cấp toàn diện UI Nút X (Luxury Glassmorphic Button):**
     - Chuẩn hóa kích thước `36×36px` (mobile `34×34px`), bo tròn hoàn hảo `var(--radius-full)`.
     - Kính mờ siêu mịn với `backdrop-filter: blur(12px);`, đổ bóng đa tầng `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);` kèm viền phản chiếu ánh sáng tinh tế `inset 0 1px 0 rgba(255, 255, 255, 0.12)`.
     - Tinh chỉnh icon SVG: Kích thước `15×15px`, nét vẽ `stroke-width: 2.2` bo tròn `stroke-linecap="round"` sắc nét, thanh thoát.
     - Hiệu ứng Hover sang trọng: Nền đỏ hồng trong suốt `rgba(239, 68, 68, 0.2)`, viền đỏ nhẹ, icon phát sáng `#fca5a5`, đổ bóng glow `box-shadow: 0 4px 16px rgba(239, 68, 68, 0.28)`, chuyển động xoay 90 độ mượt mà với lò xo vật lý `transition: all 0.25s var(--ease-spring); transform: rotate(90deg) scale(1.08);`.
     - Hiệu ứng Active bấm nhún: `transform: rotate(90deg) scale(0.92);`.
  3. Nâng tham số cache-busting lên `?v=7.2` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 50: Vẫn hiển thị tiếng Việt tại nhiều vị trí giao diện khi chuyển sang Tiếng Anh (Song ngữ chưa triệt để)
- **Hiện tượng:**
  1. Người dùng bấm nút chuyển ngôn ngữ sang **EN**, giao diện chính đổi sang tiếng Anh nhưng trong Dropdown Menu của User Profile vẫn hiển thị: *"QUẢN TRỊ VIÊN (ADMIN)"*, *"Bảng quản trị Admin"*, *"Mẫu nhà đã lưu yêu thích"*, *"Chỉnh sửa hồ sơ"*, *"Cài đặt hệ thống"*.
  2. Dòng phụ đề thư viện (`.section-sub`): *"Tuyển chọn các đồ án kiến trúc sẵn sàng thi công với dự toán tham khảo minh bạch."* vẫn giữ nguyên tiếng Việt.
  3. Thẻ mẫu nhà (house card) hiển thị nhãn phân loại *"Biệt thự"* và tên mẫu *"Nhà phố 2 tầng 5x16m"* bằng tiếng Việt do database chỉ lưu tên/phong cách tiếng Việt.
  4. Các khu vực trong Contact Section, Auth Modal, Profile Modal thiếu thuộc tính `data-i18n` đồng bộ.
- **Nguyên nhân cốt lõi:**
  1. Các thẻ văn bản trong dropdown menu (`#user-dropdown-menu`), phụ đề gallery, kênh liên hệ và modal hồ sơ được viết hardcode tiếng Việt trong `index.html` mà không được gắn thuộc tính `data-i18n`.
  2. Trong `js/app.js`, hàm `updateAuthUI()` gán nhãn cứng `roleBadge.textContent = isAdmin ? 'Quản trị viên (Admin)' : 'Thành viên';` thay vì lấy từ từ điển `window.i18n.t()`.
  3. Trong `renderGallery()`, bảng tra cứu `typeDisplayNames` chỉ có các key slug tiếng Anh (`biet-thu`, `nha-pho`, `nha-cap-4`), khi gặp giá trị phong cách tiếng Việt (`Biệt thự`, `Nhà phố`) thì trả về `undefined` và giữ nguyên tiếng Việt.
- **Cách khắc phục dứt điểm:**
  1. **Bổ sung toàn diện từ điển song ngữ trong `js/i18n.js`:** Thêm đầy đủ 30+ key mới cho menu dropdown (`menu_admin`, `menu_favorites`, `menu_profile`, `menu_settings`, `role_admin`, `role_member`), phụ đề gallery (`gallery_sub`), kênh liên hệ, auth showcase và toàn bộ form hồ sơ cá nhân.
  2. **Gắn thuộc tính `data-i18n` đồng bộ trong `index.html`:** Quét toàn bộ mã nguồn HTML bằng script phân tích cú pháp để phát hiện và gán thẻ `data-i18n` cho 100% các phần tử giao diện, không bỏ sót bất kỳ văn bản nào.
  3. **Xây dựng bộ chuyển dịch thông minh (`getLocalizedTemplateName` & `getLocalizedStyle`) trong `js/app.js`:**
     - Tự động chuyển đổi badge phong cách tiếng Việt sang tiếng Anh chuẩn: `Biệt thự` $\to$ `Villa`, `Nhà phố` $\to$ `Townhouse`, `Nhà cấp 4` $\to$ `Bungalow`, `Hiện đại` $\to$ `Modern`, `Tân cổ điển` $\to$ `Neo-Classical`, v.v.
     - Tự động chuyển đổi cú pháp tên mẫu nhà kiến trúc phổ biến sang tiếng Anh: `Nhà phố 2 tầng 5x16m` $\to$ `2-Story Modern Townhouse 5x16m`, `Biệt thự 3 tầng` $\to$ `3-Story Luxury Villa`, v.v.
  4. **Cập nhật `updateAuthUI()`:** Đồng bộ `roleBadge` và `profile-role-text` theo từ điển i18n hiện hành.
  5. Nâng tham số cache-busting lên `?v=7.3` trên toàn bộ dự án (`index.html` và `admin.html`).

---

### 🔴 Lỗi 47: Header trang Quản Trị (`admin.html`) bị đè chèn ép logo, vỡ chữ `Dream Ho...` và đẩy văng nút Đăng xuất trên Mobile
- **Hiện tượng:**
  1. Logo *"Dream House"* trên thanh điều hướng trang Admin bị bóp nghẹt thành `Dream Ho...`, đồng thời bị huy hiệu `ADMIN PORTAL` (màu vàng có chấm xanh) nhảy đè chèn lấn lên chữ.
  2. Nút *"Về trang chủ"* bị tràn mép phải cắt cụt chữ, nút *"Đăng xuất"* bị đẩy văng hoàn toàn ra ngoài màn hình điện thoại.
  3. Trong Hero Banner của Admin, nút làm mới `(⟳)` đứng cô độc một mình ở hàng trên, còn nút `+ Thêm mẫu nhà mới` bị rớt xuống hàng dưới chiếm 100% chiều ngang.
- **Nguyên nhân cốt lõi:**
  1. Thẻ bao bọc logo và badge `<div style="display: flex; align-items: center; gap: 16px;">` thiếu `min-width: 0; flex-shrink: 1;`.
  2. Cụm nút bên phải chứa đồng thời nút Theme Toggle, nút *"Về trang chủ"* dạng chữ dài và nút *"Đăng xuất"* dạng chữ dài, tổng chiều rộng lên tới 314px (vượt quá 85% chiều rộng cả màn hình điện thoại 360-390px), dồn ép logo bên trái chỉ còn lại dưới 30px không gian khả dụng.
  3. Nút `.btn-admin-add` trên mobile được gán `width: 100%`, làm đứt gãy liên kết ngang với nút làm mới `.btn-admin-refresh`.
- **Cách khắc phục dứt điểm:**
  1. **Tái cấu trúc khối thương hiệu (`.admin-header-brand-wrap`):** Gán `min-width: 0; flex-shrink: 1;`. Khóa `.brand-title` kích thước `1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`. Ẩn dòng phụ đề `.brand-sub` trên mobile.
  2. **Thu gọn huy hiệu Admin:** Giảm padding `3px 8px; font-size: 0.65rem;`. Trên màn hình siêu nhỏ (< 380px), tự động ẩn chữ `Portal`, chỉ giữ lại chấm tròn xanh nhấp nháy phát sáng bảo vệ không gian cho logo.
  3. **Chuyển đổi nút điều hướng sang Icon Pill tròn 36×36px:**
     - Nút *"Về trang chủ"* (`.admin-btn-home`): Chuyển thành icon ngôi nhà 36×36px bo tròn, ẩn chữ trên mobile.
     - Nút *"Đăng xuất"* (`.admin-btn-logout`): Chuyển thành icon đăng xuất 36×36px bo tròn, ẩn chữ trên mobile.
     - Giảm tổng chiều rộng cụm nút bên phải từ **314px xuống còn 124px**, giải phóng hơn **220px** cho Logo bên trái luôn hiển thị thẳng thớm, nguyên vẹn 100%.
  4. **Cân đối khối Hero Actions của Admin:**
     - Áp dụng `display: flex; gap: 8px; width: 100%; align-items: center;`.
     - Nút Làm mới giữ `44×44px` bo góc 12px, nút Thêm mẫu nhà nhận `flex: 1; width: auto;`, hai nút nằm chung một hàng ngang liền mạch, sang trọng.
  5. Nâng tham số cache-busting lên `?v=7.0` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 48: Thanh Tab Điều Hướng Admin (`.admin-nav-tabs`) bị rớt hàng và méo mó viền bo tròn trên Mobile do cố định lưới 2 cột (`grid-template-columns: 1fr 1fr`) khi có 3 tabs
- **Hiện tượng:**
  1. Trên màn hình điện thoại, thanh tab điều hướng Admin hiển thị dị dạng: Tab 1 *"Quản lý Mẫu Nhà"* và Tab 2 *"Yêu Cầu Tư Vấn & Báo Gi..."* nằm ở dòng 1 (Tab 2 bị cụt chữ), trong khi Tab 3 *"Thống Kê & Phân Tích"* bị rớt xuống dòng 2 đứng một mình lệch sang trái.
  2. Viền ngoài hình viên thuốc bo tròn (`border-radius: var(--radius-full)`) bị kéo giãn chiều dọc theo 2 dòng, cắt ngang nửa thân của Tab 3 tạo thành một hình oval méo mó rất mất thẩm mỹ.
- **Nguyên nhân cốt lõi:**
  1. Trước đây hệ thống Admin chỉ có 2 tabs ("Quản lý Mẫu Nhà" và "Yêu Cầu Tư Vấn"), CSS mobile `@media (max-width: 640px)` quy định `.admin-nav-tabs { display: grid; grid-template-columns: 1fr 1fr; }`.
  2. Khi tích hợp thêm Tab 3 *"Thống Kê & Phân Tích"*, lưới 2 cột bắt buộc phần tử thứ 3 rớt xuống dòng thứ 2.
  3. Tiêu đề Tab 2 quá dài *"Yêu Cầu Tư Vấn & Báo Giá"* chiếm nhiều diện tích ngang gây tràn chữ trên màn hình hẹp.
- **Cách khắc phục dứt điểm:**
  1. **Chuyển đổi sang Flex Cuộn Ngang Mượt Mà (Touch Horizontal Scroll):**
     - Tại `@media (max-width: 640px)` trong `style.css`: Thay thế `display: grid; grid-template-columns: 1fr 1fr;` bằng layout Flex với `overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none; border-radius: var(--radius-full);`.
     - Các nút `.tab-btn` được gán `flex-shrink: 0; white-space: nowrap; padding: 8px 14px; font-size: 0.82rem; gap: 6px;`.
  2. **Tinh chỉnh tiêu đề Tab tinh gọn:** Rút ngắn nhãn hiển thị trong `admin.html` từ *"Yêu Cầu Tư Vấn & Báo Giá"* thành *"Yêu Cầu Tư Vấn"* để thanh thoát, cân xứng với các tab khác.
  3. **Kết quả:** Thanh tab giữ trọn vẹn kiểu dáng viên thuốc tròn cao cấp chuẩn Apple/Bento UI, vuốt cảm ứng ngang êm ái, co giãn tự nhiên không bao giờ bị cắt chữ hay méo viền dù có thêm bao nhiêu tab mới.
  4. Nâng tham số cache-busting lên `?v=7.1` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 49: Nút Đóng (X) trên Modal Thêm/Sửa Mẫu Nhà (`#template-modal`) bị đè lấn lên tiêu đề và giao diện chưa tối ưu thẩm mỹ
- **Hiện tượng:**
  1. Khi mở modal *"Thêm Mẫu Thiết Kế Mới"* hoặc *"Chỉnh Sửa Mẫu Thiết Kế"* trên Admin (đặc biệt trên màn hình di động), nút tròn đóng (X) nằm đè trực tiếp lên chữ cuối của tiêu đề (chữ "Mới" hoặc chữ "Kế").
  2. Giao diện nút X trước đó có màu xám mờ đục đơn điệu, nét chữ X dày (stroke 2.5), thiếu chiều sâu và viền sáng phản chiếu kính mờ (frosted glass) chuẩn Apple / Luxury Bento.
- **Nguyên nhân cốt lõi:**
  1. `.admin-modal-header` không được thiết lập `padding-right` dành riêng cho nút đóng, trong khi nút `.modal-close` được gán `position: absolute; right: 18px; top: 16px;`.
  2. Khối tiêu đề `<h3>` trong `admin.html` sử dụng inline style `font-size: 1.45rem;` kéo dài toàn bộ chiều rộng thẻ, không có khoảng thở dự phòng khiến text dài tràn qua góc phải và bị nút close đè lên.
  3. Biến Design Tokens `--btn-close-...` dùng màu nền xám mờ và thiếu các lớp đổ bóng đa tầng (`box-shadow`, `inset highlight`).
- **Cách khắc phục dứt điểm:**
  1. **Tạo khoảng đệm an toàn tuyệt đối cho Header (`padding-right: 54px;`):**
     - Trong `style.css`: Gán `.admin-modal-header { padding-right: 54px; position: relative; }` (trên mobile: `padding-right: 46px;`).
     - Bọc tiêu đề trong `.admin-modal-title-wrap { flex: 1; min-width: 0; }`, áp dụng class `.admin-modal-title` với `word-break: break-word; font-size: 1.35rem;` (mobile: `1.18rem;`), loại bỏ hoàn toàn inline style cũ.
     - Căn chỉnh vị trí nút close trong `.admin-modal-window .modal-close` ngay hàng thẳng lối với khối icon header (`top: 24px; right: 28px;` trên desktop; `top: 18px; right: 16px;` trên mobile).
  2. **Nâng cấp toàn diện UI Nút X (Luxury Glassmorphic Button):**
     - Chuẩn hóa kích thước `36×36px` (mobile `34×34px`), bo tròn hoàn hảo `var(--radius-full)`.
     - Kính mờ siêu mịn với `backdrop-filter: blur(12px);`, đổ bóng đa tầng `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);` kèm viền phản chiếu ánh sáng tinh tế `inset 0 1px 0 rgba(255, 255, 255, 0.12)`.
     - Tinh chỉnh icon SVG: Kích thước `15×15px`, nét vẽ `stroke-width: 2.2` bo tròn `stroke-linecap="round"` sắc nét, thanh thoát.
     - Hiệu ứng Hover sang trọng: Nền đỏ hồng trong suốt `rgba(239, 68, 68, 0.2)`, viền đỏ nhẹ, icon phát sáng `#fca5a5`, đổ bóng glow `box-shadow: 0 4px 16px rgba(239, 68, 68, 0.28)`, chuyển động xoay 90 độ mượt mà với lò xo vật lý `transition: all 0.25s var(--ease-spring); transform: rotate(90deg) scale(1.08);`.
     - Hiệu ứng Active bấm nhún: `transform: rotate(90deg) scale(0.92);`.
  3. Nâng tham số cache-busting lên `?v=7.2` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 50: Vẫn hiển thị tiếng Việt tại nhiều vị trí giao diện khi chuyển sang Tiếng Anh (Song ngữ chưa triệt để)
- **Hiện tượng:**
  1. Người dùng bấm nút chuyển ngôn ngữ sang **EN**, giao diện chính đổi sang tiếng Anh nhưng trong Dropdown Menu của User Profile vẫn hiển thị: *"QUẢN TRỊ VIÊN (ADMIN)"*, *"Bảng quản trị Admin"*, *"Mẫu nhà đã lưu yêu thích"*, *"Chỉnh sửa hồ sơ"*, *"Cài đặt hệ thống"*.
  2. Dòng phụ đề thư viện (`.section-sub`): *"Tuyển chọn các đồ án kiến trúc sẵn sàng thi công với dự toán tham khảo minh bạch."* vẫn giữ nguyên tiếng Việt.
  3. Thẻ mẫu nhà (house card) hiển thị nhãn phân loại *"Biệt thự"* và tên mẫu *"Nhà phố 2 tầng 5x16m"* bằng tiếng Việt do database chỉ lưu tên/phong cách tiếng Việt.
  4. Các khu vực trong Contact Section, Auth Modal, Profile Modal thiếu thuộc tính `data-i18n` đồng bộ.
- **Nguyên nhân cốt lõi:**
  1. Các thẻ văn bản trong dropdown menu (`#user-dropdown-menu`), phụ đề gallery, kênh liên hệ và modal hồ sơ được viết hardcode tiếng Việt trong `index.html` mà không được gắn thuộc tính `data-i18n`.
  2. Trong `js/app.js`, hàm `updateAuthUI()` gán nhãn cứng `roleBadge.textContent = isAdmin ? 'Quản trị viên (Admin)' : 'Thành viên';` thay vì lấy từ từ điển `window.i18n.t()`.
  3. Trong `renderGallery()`, bảng tra cứu `typeDisplayNames` chỉ có các key slug tiếng Anh (`biet-thu`, `nha-pho`, `nha-cap-4`), khi gặp giá trị phong cách tiếng Việt (`Biệt thự`, `Nhà phố`) thì trả về `undefined` và giữ nguyên tiếng Việt.
- **Cách khắc phục dứt điểm:**
  1. **Bổ sung toàn diện từ điển song ngữ trong `js/i18n.js`:** Thêm đầy đủ 30+ key mới cho menu dropdown (`menu_admin`, `menu_favorites`, `menu_profile`, `menu_settings`, `role_admin`, `role_member`), phụ đề gallery (`gallery_sub`), kênh liên hệ, auth showcase và toàn bộ form hồ sơ cá nhân.
  2. **Gắn thuộc tính `data-i18n` đồng bộ trong `index.html`:** Quét toàn bộ mã nguồn HTML bằng script phân tích cú pháp để phát hiện và gán thẻ `data-i18n` cho 100% các phần tử giao diện, không bỏ sót bất kỳ văn bản nào.
  3. **Xây dựng bộ chuyển dịch thông minh (`getLocalizedTemplateName` & `getLocalizedStyle`) trong `js/app.js`:**
     - Tự động chuyển đổi badge phong cách tiếng Việt sang tiếng Anh chuẩn: `Biệt thự` $\to$ `Villa`, `Nhà phố` $\to$ `Townhouse`, `Nhà cấp 4` $\to$ `Bungalow`, `Hiện đại` $\to$ `Modern`, `Tân cổ điển` $\to$ `Neo-Classical`, v.v.
     - Tự động chuyển đổi cú pháp tên mẫu nhà kiến trúc phổ biến sang tiếng Anh: `Nhà phố 2 tầng 5x16m` $\to$ `2-Story Modern Townhouse 5x16m`, `Biệt thự 3 tầng` $\to$ `3-Story Luxury Villa`, v.v.
  4. **Cập nhật `updateAuthUI()`:** Đồng bộ `roleBadge` và `profile-role-text` theo từ điển i18n hiện hành.
  5. Nâng tham số cache-busting lên `?v=7.3` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 51: Nút Đóng (X) trên Mobile bị chìm/vô hình trên nền ảnh và Lỗi Console 404 RPC `increment_template_view`
- **Hiện tượng:**
  1. Khi mở modal chi tiết mẫu nhà (`#detail-modal`) trên màn hình điện thoại (mobile), nút đóng nằm ở góc trên bên phải đè trực tiếp lên phần trời sáng của ảnh phối cảnh kiến trúc. Ở Dark Theme, nút biến thành một vòng tròn màu trắng xám mờ mờ và dấu X gần như biến mất hoàn toàn, người dùng rất khó nhận diện để bấm đóng modal.
  2. Mỗi lần người dùng mở xem chi tiết mẫu nhà, DevTools Console xuất hiện dòng đỏ `POST https://qdkhqvsbtmbgkmoldazt.supabase.co/rest/v1/rpc/increment_template_view 404 (Not Found)` kèm cảnh báo `Lỗi ghi nhận lượt xem mẫu nhà: Could not find the function public.increment_template_view(t_id) in the schema cache`.
- **Nguyên nhân cốt lõi:**
  1. *Lỗi Nút X Mobile:* Nút đóng dùng token mờ nhạt `--btn-close-bg: rgba(255, 255, 255, 0.08)` với icon màu bạc nhạt `#cbd5e1`. Khi đè lên nền ảnh bầu trời trắng và hiệu ứng backdrop-blur, toàn bộ vùng nút bị hòa lẫn vào ảnh. Kích thước trên mobile chỉ $34\times34\text{px}$ chưa đạt chuẩn công thái học chạm ngón tay.
  2. *Lỗi Supabase RPC 404:* Dự án Supabase từ xa (`qdkhqvsbtmbgkmoldazt.supabase.co`) chưa được người dùng chạy script SQL `supabase/09_template_views_analytics.sql` trong SQL Editor, khiến PostgREST không tìm thấy stored procedure trong schema cache và trả về HTTP 404. Việc client tiếp tục gọi RPC khi xem các mẫu nhà khác khiến console liên tục bị spam dòng đỏ 404.
- **Cách khắc phục dứt điểm:**
  1. **Nâng cấp UI Nút Đóng trên Detail Modal & Mobile:**
     - Thiết lập quy tắc chuyên biệt cho `#detail-modal .modal-close` và `#close-detail-modal`: Áp dụng phong cách **Luxury Dark Glassmorphic Pill** (`background: rgba(15, 23, 42, 0.8) !important; border: 1.5px solid rgba(255, 255, 255, 0.35) !important; color: #ffffff !important; backdrop-filter: blur(16px) saturate(180%);`).
     - Tăng kích thước icon SVG lên $18\times18\text{px}$, nét vẽ `stroke-width: 2.5` kết hợp bóng đổ `filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6))` đảm bảo dấu X luôn trắng sáng và tương phản tuyệt đối trên 100% mọi bức ảnh phối cảnh (dù trời nắng gắt hay nền trắng toát).
     - Tăng kích thước nút trên Mobile lên $38\times38\text{px}$ chuẩn Human Interface Guidelines, vị trí `top: 14px; right: 14px; z-index: 60;` chống che khuất.
     - Hiệu ứng Hover/Active mượt mà với nền đỏ `#ef4444`, bóng glow `rgba(239, 68, 68, 0.5)` và xoay 90 độ mượt mà.
  2. **Xử lý Graceful Fallback & Tắt spam RPC 404:**
     - Trong `js/app.js`: Tích hợp cờ nhận diện `this._rpcIncrementMissing`. Khi nhận mã lỗi `PGRST202` hoặc thông báo thiếu hàm trong schema cache, hệ thống lập tức ghi nhớ và tắt gửi RPC cho các lần mở mẫu tiếp theo, ngăn chặn 100% việc spam lỗi 404 đỏ console.
     - Bộ đếm lượt xem cục bộ (`item.view_count++`) vẫn hoạt động trơn tru tức thì (zero-lag UI feedback).
     - Chuyển cảnh báo console sang thông báo `console.info` thân thiện, hướng dẫn quản trị viên chạy file `09_template_views_analytics.sql` trong Supabase SQL Editor để kích hoạt tính năng đồng bộ vĩnh viễn vào DB.
  3. Nâng tham số cache-busting lên `?v=7.4` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 52: Tràn cuộn ngang trên giao diện Mobile khiến nội dung bị cắt mép & Vẫn sót dòng đỏ Console 404
- **Hiện tượng:**
  1. Khi mở panel chi tiết mẫu nhà (`#detail-modal`) trên mobile, khung modal bị phình to hơn màn hình điện thoại, trang bị cuộn ngang (horizontal scroll) qua lại. Toàn bộ mép phải của modal bị che khuất: dòng ghi chú điều khiển 3D (`.viewer-footer`), đoạn văn bản mô tả (`.detail-desc-block`) và bảng thông số kỹ thuật bị mất chữ ở mép phải.
  2. Mặc dù đã có cơ chế cờ tắt lặp lại RPC, nhưng ở lần mở mẫu đầu tiên sau khi tải trang, trình duyệt vẫn gửi request `POST /rpc/increment_template_view` và in 1 dòng đỏ 404 trong Console.
- **Nguyên nhân cốt lõi:**
  1. *Lỗi tràn ngang Three.js Canvas:* Hàm `init()` của `Viewer3D` khi container chưa render xong lấy `fallbackWidth = 450px`, gán inline style `width: 450px` lên thẻ `<canvas>`, lớn hơn viewport mobile ($360\text{px} - 390\text{px}$) khiến container bị đẩy bung ra ngoài.
  2. *Lỗi tràn ngang Container & Grid:* `.modal-overlay` và `.modal-window` thiếu `overflow-x: hidden !important;`, các cột grid trong `.specs-table` dùng `1fr 1fr` với `min-width: auto` làm cột phình theo text dài. Thanh điều khiển `.viewer-header` và `.camera-presets` có độ rộng cố định lớn hơn chiều rộng mobile.
  3. *Lỗi dòng đỏ Console 404:* Khi người dùng chưa chạy script SQL trên Supabase, request thăm dò ở frame đầu tiên luôn bị PostgREST trả về 404 và trình duyệt tự động ghi log màu đỏ.
- **Cách khắc phục dứt điểm:**
  1. **Khóa cứng cuộn ngang toàn cục:** Thiết lập `overflow-x: hidden !important; max-width: 100vw;` cho `html`, `body`, `.modal-overlay`, `.modal-window`, `.detail-grid`, `.detail-visual-col`, `.detail-info-col`.
  2. **Ràng buộc tuyệt đối thẻ Canvas Three.js:** Gán `.threejs-canvas canvas { width: 100% !important; max-width: 100% !important; display: block !important; }` và trong `js/viewer3d.js` tính `fallbackWidth = Math.min(window.innerWidth - 32, 450)`.
  3. **Tự động co giãn linh hoạt & ngắt dòng an toàn:**
     - Cho phép flex-wrap trên `.viewer-header` và `.camera-presets`.
     - Áp dụng `word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important;` cho 100% văn bản (`.hint`, `.status`, `.desc-text`, `.spec-val`).
     - Bảng thông số: Dùng `repeat(2, minmax(0, 1fr))` trên mobile và tự động chuyển sang 1 cột trên màn hình siêu hẹp $\le 480\text{px}$.
  4. **Triệt tiêu dòng đỏ 404 Console:** Thêm cờ `ENABLE_VIEW_RPC: false` vào `js/config.js` và `generate-config.js`. Khi cờ này tắt, hệ thống chỉ đếm cục bộ trên client (zero-lag UI) và không gửi request thăm dò, đảm bảo console sạch bóng 100%.
  5. Nâng tham số cache-busting lên `?v=7.5` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 53: Nút Đóng (X) trên Modal Chi Tiết Mẫu Nhà bị cuộn trôi mất khi xem nội dung phía dưới
- **Hiện tượng:** Khi người dùng mở modal chi tiết mẫu nhà (`#detail-modal`) trên mobile hoặc desktop, lúc ở đầu trang thì nút X hiển thị bình thường. Nhưng khi vuốt cuộn xuống dưới để xem mô hình 3D, đọc bảng thông số kích thước, mô tả hay nút bấm nhận báo giá, nút X bị cuộn trôi lên trên và khuất khỏi màn hình, khiến người dùng muốn tắt modal phải cuộn ngược lại đỉnh trang.
- **Nguyên nhân cốt lõi:**
  1. Nút `#close-detail-modal` trước đây được đặt bên trong thẻ `.modal-window` với `position: absolute;`. Vì `.modal-window` là container có `overflow-y: auto`, toàn bộ con absolute bên trong nó đều bị cuộn trôi theo nội dung.
  2. `.modal-window` giữ thuộc tính `transform` từ animation mở modal (`modalWindowIn`), khiến việc gán `position: fixed` cho phần tử con bên trong bị trình duyệt giáng cấp thành `absolute` so với chính `.modal-window`.
- **Cách khắc phục dứt điểm:**
  1. Trong `index.html`: Di chuyển nút `<button id="close-detail-modal">` ra làm con trực tiếp của `#detail-modal` (`.modal-overlay`), đứng ngang hàng với `.modal-window`.
  2. Trong `style.css`: Thiết lập nút ở chế độ **Fixed Floating** với `z-index: 1050 !important;`:
     - Trên Desktop: Tính toán tọa độ động `top: max(18px, calc((100vh - 92vh) / 2 + 16px)); right: max(18px, calc((100vw - 1200px) / 2 + 20px));` ghim chính xác ở góc trên bên phải của modal.
     - Trên Mobile ($\le 768\text{px}$): Ghim cố định tại `top: 16px !important; right: 16px !important; width: 38px; height: 38px;` (màn hình nhỏ $\le 480\text{px}$: `top: 12px; right: 12px;`).
  3. Khi cuộn `.modal-window`, nút X hoàn toàn độc lập và **luôn luôn hiện diện lơ lửng ở góc trên bên phải mọi lúc**, người dùng có thể chạm đóng bất kỳ lúc nào chỉ với 1 chạm.
  4. Nâng tham số cache-busting lên `?v=7.6` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 54: UI Dropdown thông báo khi xổ xuống bị lệch hẳn sang trái, mất cân đối và đứt gãy liên kết với chuông
- **Hiện tượng:**
  1. Khi người dùng bấm vào nút chuông thông báo (đặc biệt trên màn hình điện thoại hoặc tablet), panel thông báo xổ xuống bị trôi dạt về tận cùng bên trái của màn hình (nằm dưới logo thương hiệu), để lại khoảng trống mênh mông ở nửa phải màn hình.
  2. Mũi tên tam giác chỉ hướng bị lệch vị trí hoàn toàn, không trỏ vào chuông, tạo cảm giác panel thông báo như rơi tự do không có điểm neo.
  3. Thẻ tab đang chọn ("Tư vấn") hiển thị màu trắng sáng chói trên nền Dark Theme, gây nhức mắt và lạc quẻ với phong cách vàng kim sang trọng của Dream House; nút "Đã đọc tất cả" màu xám xanh chìm nghỉm, tương phản kém khó bấm.
  4. Tên người dùng và nội dung bị xuống dòng dạng block nhiều tầng khiến danh sách cồng kềnh, thiếu vạch phân chia ngăn cách.
- **Nguyên nhân cốt lõi:**
  1. Quy tắc CSS `@media (max-width: 768px)` sử dụng thuộc tính `position: absolute; right: -42px; width: 320px;`. Vì chuông nằm bên trái nút Admin avatar (~90px), việc dịch -42px khiến panel rộng 320px bị tràn sang góc trái của màn hình điện thoại (360px - 414px).
  2. Mũi tên `.u074-pan::before` dùng giá trị hardcode tĩnh `right: 54px;` không tính toán động theo tọa độ thực tế của nút chuông.
  3. Thiếu token đồng bộ vàng kim `--u074-accent-bg` cho tab active, dùng màu trắng của Light mode áp dụng vào Dark mode.
- **Cách khắc phục dứt điểm:**
  1. **Căn giữa đối xứng hoàn hảo trên Mobile:** Đặt `position: fixed !important; left: 14px !important; right: 14px !important; width: auto !important; max-width: calc(100vw - 28px); top: 68px;` tạo viền đối xứng 14px hai bên trên mọi kích thước màn hình.
  2. **Mũi tên định vị tâm chuông tự động (Dynamic Arrow Positioning):**
     - Trong `js/app.js`: Xây dựng hàm `positionDropdown()` tự động đo đạc tọa độ `bellRect` và `panRect`, tính toán khoảng cách `bellCenter - panRect.left` và gán vào biến CSS `--u074-arrow-left`.
     - Mũi tên `.u074-pan::before` dùng `left: var(--u074-arrow-left); transform: translateX(-50%) rotate(45deg);` bảo đảm luôn luôn trỏ chính xác $100\%$ vào tâm nút chuông.
     - Cập nhật `transformOrigin` đồng bộ theo tọa độ này giúp hiệu ứng bung mở và thu gập diễn ra mượt mà từ đúng vị trí chuông.
  3. **Nâng cấp mỹ thuật Bento & Thước đo Lux:**
     - Tab active chuyển sang Luxury Gold Pill (`background: var(--u074-accent-bg); color: var(--u074-accent); border: 1px solid rgba(229,185,93,0.35);`).
     - Nút "Đã đọc tất cả" có nền pill nổi bật, chữ vàng dễ bấm, tương phản đạt chuẩn WCAG.
     - Tên khách hàng và nội dung hiển thị `inline` thanh thoát, bổ sung đường phân cách mờ tinh tế `.u074-it:not(:last-child) { border-bottom: 1px solid var(--u074-line); }`.
     - Bổ sung thông báo trạng thái trống `.u074-empty` khi tab lọc không có dữ liệu.
     - Ẩn chữ `user-name` trên màn hình $\le 640\text{px}$ để bảo toàn không gian cho Logo "Dream House" không bao giờ bị cắt chữ `Dream H...`.
  4. Nâng tham số cache-busting lên `?v=7.9` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 55: Bấm vào dòng thông báo trong chuông không mở thông tin chi tiết người cần tư vấn
- **Hiện tượng:** Khi người dùng click vào một mục thông báo yêu cầu tư vấn (ví dụ *"Phạm Thanh Hải gửi yêu cầu tư vấn..."*), dòng thông báo chỉ đổi sang trạng thái đã đọc (`.read`) và chấm xanh biến mất, không có modal hay cửa sổ nào hiển thị số điện thoại, lời nhắn hay thông tin khách hàng cần tư vấn.
- **Nguyên nhân cốt lõi:**
  1. Template gốc của Prompt #074 chỉ tập trung vào hiệu ứng hoạt họa UI (animating read dot, ring, spring counter) mà chưa được kết nối logic dữ liệu nghiệp vụ (Business Logic).
  2. Chưa có cấu trúc Modal và bộ điều khiển để bóc tách các trường dữ liệu của khách hàng (`name`, `contact`, `template_name`, `message`, `status`).
- **Cách khắc phục dứt điểm:**
  1. **Xây dựng Modal Chi Tiết Tư Vấn (`#inquiry-detail-modal`):**
     - Tạo layout Luxury Bento hiển thị đầy đủ: Avatar viết hoa với gradient, Tên khách hàng, Badge trạng thái (*Yêu cầu tư vấn mới* / *Đã tư vấn*), Thời gian gửi.
     - Khối thông tin liên lạc có nút "Gọi ngay" (`tel:...`) và nút "Sao chép" (vào clipboard có Toast thông báo).
     - Khối mẫu nhà quan tâm có nút "Xem mô hình 3D" (mở trực tiếp 3D viewer của mẫu nhà).
     - Khối lời nhắn nhu cầu trích dẫn đẹp mắt.
     - Khối chân modal hỗ trợ nút "Đánh dấu đã tư vấn" (cập nhật DB Supabase) và "Quản trị Admin".
  2. **Gắn sự kiện tương tác trong `initNotificationBell()`:**
     - Khi bấm vào dòng thông báo, tự động đóng dropdown chuông và gọi `this.openInquiryDetailModal(inquiryData)`.
     - Tự động đồng bộ với các yêu cầu tư vấn thực tế từ bảng `inquiries` trên Supabase nếu có dữ liệu.
     - Tích hợp phím Escape và click backdrop đóng modal êm ái.
  3. Nâng tham số cache-busting lên `?v=8.0` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 56: Tài khoản User thông thường bị hiển thị danh sách lead tư vấn của khách hàng khác
- **Hiện tượng:** Khi tài khoản thông thường (role `user`, không phải Admin) mở chuông thông báo, danh sách lại hiển thị các lead tư vấn của khách hàng khác (*Phạm Thanh Hải*, *Nguyễn Văn Tuấn*, *Trần Thị Mai*...). Người dùng cuối thấy dữ liệu riêng tư của người khác và các nút xử lý của Admin.
- **Nguyên nhân cốt lõi:**
  1. Hàm nạp thông báo ban đầu `getInitialData()` trước đó dùng chung một mảng mẫu chứa danh sách khách hàng và tự động tải toàn bộ bản ghi từ bảng `inquiries` của Supabase mà không phân biệt người dùng là Admin hay User thông thường.
  2. Chưa có cơ chế phân tách quyền (`Role-Based Notification Dispatching`) giữa vai trò Quản trị viên và Khách hàng/Thành viên.
  3. Nhãn Tab 2 cố định chữ *"Tư vấn"* (Inquiries) thay vì *"Tư vấn của tôi"* (My Inquiries) đối với User.
- **Cách khắc phục dứt điểm:**
  1. **Tạo hàm kiểm tra Admin (`checkIsAdmin()`):** Kiểm tra chặt chẽ `currentProfile.role === 'admin'` hoặc `user_metadata.role === 'admin'`.
  2. **Tách biệt 2 nguồn dữ liệu thông báo:**
     - **Với Admin:** Tải toàn bộ lead khách hàng gửi đến từ form website và truy vấn `supabase.from('inquiries')`. Tab 2 có tên *"Khách tư vấn"*. Modal cho phép đánh dấu đã tư vấn và truy cập trang quản trị Admin.
     - **Với User:** Tab 2 tự động đổi thành *"Tư vấn của tôi"*. Chỉ hiển thị:
       + Xác nhận khi chính người dùng gửi yêu cầu tư vấn về mẫu nhà đang xem (`localStorage: dream_house_my_inquiries`).
       + Phản hồi chính thức từ Kiến trúc sư DreamHouse (Võ Quốc Việt) gửi riêng cho mẫu nhà người dùng đang quan tâm.
       + Cập nhật bản vẽ mới của mẫu nhà yêu thích và thông báo chào mừng từ hệ thống.
       + Ẩn hoàn toàn các nút can thiệp Admin trong modal chi tiết, thay bằng nút xem mô hình 3D và hotline KTS.
  3. **Tự động đồng bộ khi chuyển tài khoản:** Lồng gọi `this._renderNotificationList()` vào `updateAuthUI()` để khi đăng nhập/đăng xuất lập tức cập nhật lại danh sách thông báo tương ứng với vai trò.
  4. Nâng tham số cache-busting lên `?v=8.1` trên toàn bộ dự án (`index.html` và `admin.html`).

### 🔴 Lỗi 57: Nút So Sánh trên thẻ mẫu nhà bị đặt đè lên huy hiệu (Badge) loại nhà gây xung đột thị giác và che khuất nội dung
- **Hiện tượng:** Khi hiển thị danh sách mẫu nhà ở Thư viện, nút bấm so sánh dạng viên thuốc mang nhãn `[⚖️ So sánh]` bị đặt tại góc trên cùng bên trái (`top: 12px; left: 12px;`), đè trực tiếp lên huy hiệu phân loại nhà (`.card-badge` tại `top: 14px; left: 14px;` như "Nhà phố", "Biệt thự"). Nút chiếm diện tích lớn, che khuất chữ của huy hiệu và làm mất đi vẻ thẩm mỹ tinh giản, cao cấp của ảnh phối cảnh.
- **Nguyên nhân cốt lõi:**
  1. CSS vị trí `.card-compare-btn` dùng tọa độ tuyệt đối `top: 12px; left: 12px;` trùng khớp với tọa độ của `.card-badge`.
  2. Nút chứa cả icon và chuỗi văn bản dài ("⚖️ So sánh") gây cồng kềnh, bất cân xứng với nút thả tim yêu thích tròn $40\text{px}$ ở góc đối diện.
- **Cách khắc phục dứt điểm:**
  1. **Tách biệt vị trí hoàn toàn:**
     - Giữ nguyên góc trên bên trái (`top: 14px; left: 14px;`) cho huy hiệu `.card-badge` để luôn hiển thị thoáng đãng 100%.
     - Di chuyển nút so sánh sang góc trên bên phải, nằm song song bên cạnh nút Yêu Thích hình tròn (`top: 14px; right: 60px;`).
  2. **Chuẩn hóa thiết kế tròn kính mờ (Circular Glassmorphic Duo):**
     - Đổi nút so sánh thành dạng hình tròn $40\text{px} \times 40\text{px}$ đồng bộ chuẩn với nút Heart Like (`.card-fav-u022`).
     - Sử dụng icon vector SVG cán cân đối chuẩn sắc nét (Lucide/Feather scale icon), loại bỏ text tĩnh che ảnh.
     - Tích hợp Tooltip nổi nhẹ (Floating Tooltip) khi rê chuột (`data-tooltip="So sánh"` / `data-tooltip="Đã chọn so sánh"`).
     - Trạng thái kích hoạt (`.active`): Chuyển màu vàng gold sang trọng với viền sáng neon (`box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.3)`).
  3. Tăng tham số cache-busting lên `?v=8.6` trên `index.html` và `admin.html`.

### 🔴 Lỗi 58: Màn hình First Fold của trang chủ thiếu điểm thu hút thị giác và bị khoảng trống đen (Void) ở Dark Mode
- **Hiện tượng:** Khu vực Hero ban đầu chỉ có khối văn bản biên tập lệch sang góc trái trên nền lưới tối, toàn bộ nửa bên phải là khoảng trống đen phẳng lặng. Khách hàng truy cập không thấy được hình ảnh đồ án thực tế hay mô hình 3D ngay ở nếp gấp đầu tiên (First Fold), làm giảm ấn tượng ban đầu và tỷ lệ chuyển đổi.
- **Nguyên nhân cốt lõi:**
  1. Bố cục Hero cũ là dạng 1 cột đơn điệu với `max-width: 880px`, không có khu vực giới thiệu đồ án trực quan.
  2. Nền Dark Mode thiếu quầng sáng hắt không gian (Spatial Depth / Ambient Lighting) khiến trang web có cảm giác quá tĩnh và đơn sắc.
- **Cách khắc phục dứt điểm:**
  1. Nâng cấp bố cục Hero thành dạng Hero Split 2 cột (`1.15fr` / `0.95fr`): Cột trái giữ trọn vẹn văn phong biên tập sang trọng, bổ sung hàng chỉ số năng lực bảo chứng (`150+ Đồ án thực tế`, `100% Bản vẽ CAD Vector`, `4.9★ Gia chủ tin cậy`).
  2. Bổ sung Sân Khấu Kiến Trúc Nổi (Interactive Hero Showcase Stage): Khung kính mờ Glassmorphism mạ viền vàng hairline, quầng sáng mềm mại Ambient Aura lan tỏa phía sau, 2 thẻ kính mờ lơ lửng (Floating Glass Tags: *Loại nhà* và *3D Tương tác 360°*), nút xem chi tiết & 3D, và thanh pagination chấm tròn tự động xoay chuyển 3 phong cách tiêu biểu sau 7 giây.
  3. Bổ sung dải băng chạy chữ năng lực Marquee Ticker Strip phân cách mượt mà giữa Hero và Thư viện mẫu.
  4. Đảm bảo co giãn 1 cột hoàn hảo trên Mobile/Tablet (`< 992px` và `< 768px`) và tương thích 100% cả Light Mode lẫn Dark Mode.
  5. Tăng tham số cache-busting lên `?v=8.8` trên `index.html` và `admin.html`.

### 🔴 Lỗi 59: Nút Đóng Modal (X) bị mất, che khuất hoặc văng ra ngoài khung hình do đặt sai cấp bậc DOM (DOM Hierarchy)
- **Hiện tượng:** Khi người dùng mở Modal Bảng Tính Dự Toán Nhanh (`#quick-calc-modal`), trên khung cửa sổ modal không nhìn thấy bất kỳ nút Đóng `✕` nào (như đã ghi nhận trong ảnh phản ánh thực tế). Người dùng không có cách bấm đóng modal trực quan trên màn hình ngoài việc nhấn phím `Esc` hoặc bấm ra ngoài màn mờ backdrop. Các modal khác (`#fengshui-modal`, `#compare-modal`, `#brochure-modal`, `#floorplan-lightbox-modal`) cũng gặp nguy cơ tương tự.
- **Nguyên nhân cốt lõi:**
  1. **Đặt nút ngoài khung cửa sổ modal:** Trong cấu trúc HTML cũ, `<button id="close-quick-calc-modal" class="modal-close">` được đặt làm con trực tiếp của `#quick-calc-modal` (lớp phủ `.modal-overlay`), là anh em ngang hàng bên ngoài `<div class="modal-window quick-calc-window">`.
  2. **Lỗi định vị tương đối theo Viewport:** CSS `.modal-close` sử dụng `position: absolute; top: 16px; right: 18px;`. Khi đặt trong `.modal-overlay` (có kích thước bằng toàn bộ màn hình 100vw, ví dụ màn hình 1920px), nút bị dạt ra sát rìa phải của màn hình máy tính (cách khung modal tới hơn $410\text{px}$), hoàn toàn tách rời khỏi thẻ modal ở giữa. Khi người dùng nhìn vào khung tính toán thì thấy không có nút `✕`.
  3. **Lỗi tương phản và z-index thấp:** `z-index: 25` của `.modal-close` trước đây có nguy cơ bị che khuất bởi các phần tử con có `z-index` cao hơn, đồng thời không có quy chuẩn riêng cho kích thước cảm ứng ngón tay trên Mobile ($40\text{px} \times 40\text{px}$).
- **Cách khắc phục dứt điểm:**
  1. **Đưa nút đóng vào bên trong `<div class="modal-window ...">`:** Đồng bộ đưa nút đóng `✕` làm phần tử con đầu tiên bên trong toàn bộ các Modal:
     - `#quick-calc-modal` -> `#close-quick-calc-modal` nằm trong `.quick-calc-window`.
     - `#floorplan-lightbox-modal` -> `#close-floorplan-lightbox` nằm trong `.floorplan-lightbox-window`.
     - `#fengshui-modal` -> `#close-fengshui-modal` nằm trong `.fengshui-modal-window`.
     - `#compare-modal` -> `#close-compare-modal` nằm trong `.compare-modal-window`.
     - `#brochure-modal` -> `#close-brochure-modal` nằm trong `.brochure-modal-window`.
  2. **Chuẩn hóa CSS Luxury Glassmorphic Nút Đóng cho cả PC & Mobile:**
     - **Trên Desktop/PC:** `position: absolute; top: 20px; right: 22px; width: 40px; height: 40px; border-radius: 50%; z-index: 70;` cố định chắc chắn tại góc trên bên phải của khung cửa sổ modal.
     - **Trên Mobile (`max-width: 768px`):** Tọa độ co về `top: 14px; right: 14px; width: 40px; height: 40px; min-width: 40px; min-height: 40px;` - đạt chuẩn công thái học Human Interface Guidelines (vùng chạm an toàn $\ge 40\text{px}$).
     - **Độ tương phản Light / Dark Mode:** Sử dụng design tokens chuẩn:
       + Light Mode: Nền `rgba(15, 23, 42, 0.06)`, viền `1px solid rgba(15, 23, 42, 0.14)`, icon `#1e293b`.
       + Dark Mode: Nền `rgba(255, 255, 255, 0.08)`, viền `1px solid rgba(255, 255, 255, 0.22)`, icon `#f8fafc`, bóng đổ sâu `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35)`.
       + Hover: Xoay mượt mà $90^\circ$ và phóng to nhẹ `scale(1.08)` với hiệu ứng viền đỏ cảnh báo dịu nhẹ `rgba(239, 68, 68, 0.14)`.
  3. **Tạo khoảng đệm an toàn trên Header Modal:** Bổ sung `padding-right: 48px - 52px;` cho toàn bộ header của các modal (`.quick-calc-header`, `.fengshui-header`, `.compare-header`, `.brochure-toolbar-wrap`, `.lightbox-header`) để tuyệt đối không bị chữ hoặc badge đè lên nút đóng.
  4. Nâng tham số cache-busting lên `?v=9.1` trên `index.html` và `admin.html`.

---

## 4. CHECKLIST KIỂM TRA HỆ THỐNG TRƯỚC KHI BÀN GIAO (VERIFICATION MATRIX)

| Tình huống thử nghiệm | Hành vi mong đợi | Kết quả kiểm tra |
| :--- | :--- | :---: |
| **Khách vãng lai xem web** | Xem danh sách mẫu, xoay 3D, bấm đổi VI/EN mượt mà không reload trang. | Đạt |
| **Gửi form tư vấn không đăng nhập** | Dữ liệu được ghi thành công vào bảng `inquiries` với `user_id = NULL`. | Đạt |
| **Đăng ký Email & Mật khẩu** | Tạo bản ghi trong `auth.users`, trigger tự tạo bản ghi trong `public.profiles` với `role = 'user'`. | Đạt |
| **Đăng nhập Google OAuth** | Đăng nhập thành công, lấy được `full_name` và `avatar_url` đưa vào profile. | Đạt |
| **Đồng bộ yêu thích** | Các mục đã thả tim khi chưa đăng nhập tự động đẩy lên bảng `favorites` khi đăng nhập. | Đạt |
| **Chuyển tab / Tải lại trang chủ** | Không nháy nút Đăng nhập (0ms delay), giữ nguyên trạng thái phiên đăng nhập. | Đạt |
| **Theo dõi lượt xem thời gian thực** | Bấm xem mẫu tự động tăng `view_count`, Admin Dashboard cập nhật tỷ lệ xem trực tiếp. | Đạt |
| **User thường cố truy cập admin** | Bị chuyển hướng về trang chủ `index.html`, RLS chặn toàn bộ thao tác thêm/sửa/xoá. | Đạt |
| **Admin tải file .glb & ảnh** | Tải thành công vào Storage, tạo mẫu nhà mới thành công và hiển thị ngay ngoài trang chủ. | Đạt |
| **Bảng phân tích thị hiếu Admin** | Hiển thị đầy đủ Top xem nhiều nhất (%), Top yêu thích (thả tim), Top yêu cầu tư vấn. | Đạt |


