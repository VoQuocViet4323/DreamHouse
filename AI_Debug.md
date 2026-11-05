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

