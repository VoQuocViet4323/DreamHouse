# MEMORIES - DỰ ÁN NHÀ MƠ ƯỚC (DREAM HOUSE)

Tài liệu này lưu trữ bối cảnh kiến trúc, các quyết định thiết kế quan trọng, quy ước nghiệp vụ và hành trình phát triển để thành viên mới hoặc AI agent đọc hiểu tức thì khi tiếp quản dự án.

---

## 1. Bối cảnh & Mục tiêu cốt lõi
- **Tên dự án:** Nhà Mơ Ước (Dream House)
- **Định vị:** Nền tảng web trưng bày thiết kế kiến trúc và xây dựng, phong cách tối giản biên tập (Editorial Minimalist), tập trung tôn vinh ảnh thực tế và mô hình 3D tương tác.
- **Mô hình vận hành:**
  - Khách vãng lai xem mẫu, tương tác 3D, lọc mẫu nhà, gửi yêu cầu tư vấn báo giá ngay mà không bắt buộc đăng nhập.
  - Đăng nhập (Email hoặc Google OAuth) phục vụ mục đích: Lưu và đồng bộ danh sách yêu thích đa thiết bị, phân quyền Quản trị viên (Admin).
  - Không có giỏ hàng hay thanh toán online trực tiếp; mục tiêu cốt lõi là tạo phễu thu thập nhu cầu (leads) và chuyển đổi qua Zalo/Hotline/Facebook/Email.

---

## 2. Các quyết định kỹ thuật cốt lõi (Key Decisions)

### A. Kiến trúc Single-Page App tĩnh (Vanilla JS + HTML5 + CSS3)
- **Lý do chọn:** Tốc độ tải trang siêu nhanh, không phụ thuộc framework cồng kềnh (React/Vue/Next), triển khai miễn phí cực dễ trên Vercel, Netlify, Cloudflare Pages hoặc GitHub Pages.
- **Thư viện bên thứ ba tối giản:**
  - `Three.js` (r128) + `GLTFLoader` cho dựng và điều khiển 3D.
  - `@supabase/supabase-js` cho Database, Storage, Auth.

### B. Cơ chế 3D kép (Hybrid 3D Engine)
- **Vấn đề giải quyết:** Không phải lúc nào kiến trúc sư cũng có sẵn file `.glb` đã tối ưu cho tất cả các mẫu nhà.
- **Giải pháp:**
  - Nếu trường `model_path` trong Database có link file: Three.js tải file `.glb` chuẩn từ Supabase Storage.
  - Nếu `model_path` rỗng: Thuật toán trong `js/viewer3d.js` tự động dựng khối 3D hình học thực tế (procedural parametric block) dựa trên các thông số kỹ thuật (`width_m`, `depth_m`, `floors`, `roof`, `has_balcony`). Điều này đảm bảo 100% mẫu nhà đều có 3D xoay được ngay từ ngày đầu tiên.

### C. Cơ chế đa ngôn ngữ (Bilingual Vi - En không reload)
- Toàn bộ text giao diện lưu trong dictionary `js/i18n.js`.
- Dữ liệu mẫu nhà phân nhánh song ngữ rõ ràng:
  - Text: `name_vi`/`name_en`, `description_vi`/`description_en`, `style_vi`/`style_en`, `rooms_vi`/`rooms_en`.
  - Số liệu dùng chung: `width_m`, `depth_m`, `floors`, `gfa_m2`, `cost_estimate_vnd`.
- Định dạng tiền tệ tự động theo ngôn ngữ:
  - Bản tiếng Việt: "1.85 tỷ VNĐ", "850 triệu VNĐ".
  - Bản tiếng Anh: "≈ 1.85 billion VND" hoặc "≈ 850 million VND".
- Kênh liên hệ ưu tiên:
  - Bản tiếng Việt ưu tiên Zalo và Hotline.
  - Bản tiếng Anh ưu tiên Email và Facebook.

### D. Kiến trúc Cơ sở dữ liệu & Phân quyền Supabase (PostgreSQL + RLS)
- **Bảo mật tuyệt đối:** RLS (Row Level Security) kích hoạt trên 100% các bảng (`templates`, `template_images`, `profiles`, `favorites`, `inquiries`) và các Storage buckets (`template-images`, `template-models`).
- **Tránh vòng lặp đệ quy:** Hàm `is_admin()` được tạo dưới dạng `SECURITY DEFINER` và `STABLE` trên schema `public`, query trực tiếp `profiles.role = 'admin'` với `auth.uid()`.
- **Đồng bộ User tự động:** Trigger `on_auth_user_created` trên bảng `auth.users` tự động điền `profiles` ngay khi người dùng đăng ký qua Email hoặc Google OAuth.
- **Storage giới hạn chuẩn:**
  - Ảnh: tối đa 3 MB (`image/jpeg`, `image/png`, `image/webp`).
  - 3D Model: tối đa 10 MB (`model/gltf-binary`, `application/octet-stream`).

---

## 3. Quy ước và tiêu chuẩn dữ liệu mô hình 3D (SketchUp & Blender)
Khi đội ngũ 3D xuất file đưa lên hệ thống, bắt buộc tuân theo tiêu chuẩn:
1. **Định dạng:** `.glb` (GL Transmission Format Binary).
2. **Kích thước file:** Dưới 5 MB (tuyệt đối không vượt quá 10 MB).
3. **Toạ độ gốc (Origin):** Nằm chính giữa đáy của ngôi nhà $(0, 0, 0)$ trên mặt đất.
4. **Đơn vị đo:** Mét (Meters, tỉ lệ $1:1$).
5. **Texture:** Độ phân giải tối đa 2048 × 2048 px, định dạng nén JPG/WebP, gộp Atlas texture khi có thể.

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
| Thêm / Sửa / Xoá mẫu nhà | ❌ | ❌ | ✅ |
| Tải file lên Storage | ❌ | ❌ | ✅ |
| Xem và xử lý danh sách `inquiries` | ❌ | ❌ | ✅ |

