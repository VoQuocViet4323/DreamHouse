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

## 4. CHECKLIST KIỂM TRA HỆ THỐNG TRƯỚC KHI BÀN GIAO (VERIFICATION MATRIX)

| Tình huống thử nghiệm | Hành vi mong đợi | Kết quả kiểm tra |
| :--- | :--- | :---: |
| **Khách vãng lai xem web** | Xem danh sách mẫu, xoay 3D, bấm đổi VI/EN mượt mà không reload trang. | Đạt |
| **Gửi form tư vấn không đăng nhập** | Dữ liệu được ghi thành công vào bảng `inquiries` với `user_id = NULL`. | Đạt |
| **Đăng ký Email & Mật khẩu** | Tạo bản ghi trong `auth.users`, trigger tự tạo bản ghi trong `public.profiles` với `role = 'user'`. | Đạt |
| **Đăng nhập Google OAuth** | Đăng nhập thành công, lấy được `full_name` và `avatar_url` đưa vào profile. | Đạt |
| **Đồng bộ yêu thích** | Các mục đã thả tim khi chưa đăng nhập tự động đẩy lên bảng `favorites` khi đăng nhập. | Đạt |
| **User thường cố truy cập admin** | Bị chuyển hướng về trang chủ `index.html`, RLS chặn toàn bộ thao tác thêm/sửa/xoá. | Đạt |
| **Admin tải file .glb & ảnh** | Tải thành công vào Storage, tạo mẫu nhà mới thành công và hiển thị ngay ngoài trang chủ. | Đạt |

