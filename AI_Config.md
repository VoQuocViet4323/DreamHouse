# AI_CONFIG - HƯỚNG DẪN CẤU HÌNH THỦ CÔNG & VẬN HÀNH

Tài liệu này được biên soạn cho cả **người dùng không chuyên kỹ thuật** lẫn **AI Agent** để thực hiện cấu hình chính xác toàn bộ hệ thống từ đầu đến cuối mà không gặp lỗi.

---

## MỤC LỤC
1. [Khởi tạo Dự án Supabase & Lấy Khóa API](#1-khởi-tạo-dự-án-supabase--lấy-khóa-api)
2. [Cấu hình Google OAuth (Đăng nhập Google thật)](#2-cấu-hình-google-oauth-đăng-nhập-google-thật)
3. [Cấu hình URL Chuyển Hướng (Redirect URLs)](#3-cấu-hình-url-chuyển-hướng-redirect-urls)
4. [Cách Cấp Quyền Quản Trị Viên (Admin)](#4-cách-cấp-quyền-quản-trị-viên-admin)
5. [Cấu hình Thư Mục Storage & Giới Hạn Tải Tệp](#5-cấu-hình-thư-mục-storage--giới-hạn-tải-tệp)
6. [Tích hợp Khóa vào Mã Nguồn Web](#6-tích-hợp-khóa-vào-mã-nguồn-web)

---

## 1. KHỞI TẠO DỰ ÁN SUPABASE & LẤY KHÓA API

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập (hoặc đăng ký bằng tài khoản GitHub).
2. Nhấp chuột vào nút **New Project**.
   - **Name:** `Dream House` (hoặc tên tuỳ ý).
   - **Database Password:** Đặt mật khẩu an toàn và lưu lại.
   - **Region:** Chọn khu vực gần Việt Nam nhất (ví dụ: `Southeast Asia (Singapore)`).
   - Nhấn **Create new project** và đợi khoảng 1-2 phút để máy chủ khởi tạo xong.
3. Khi dự án đã sẵn sàng, vào biểu tượng **Project Settings** (bánh răng ở menu bên trái) > chọn mục **API**.
4. Bạn sẽ thấy 2 thông số cần lấy:
   - **Project URL:** Có dạng `https://xxxxxxxxxxxxxx.supabase.co`
   - **anon public:** Khóa công khai dùng cho trình duyệt (chuỗi JWT dài).
   > [!IMPORTANT]
   > Tuyệt đối **KHÔNG** lấy và **KHÔNG** dán khóa `service_role` vào file mã nguồn trình duyệt!

---

## 2. CẤU HÌNH GOOGLE OAUTH (ĐĂNG NHẬP GOOGLE THẬT)

Để khách có thể bấm "Tiếp tục với Google" và đăng nhập thành công:

### Bước 2.1: Lấy URL Callback từ Supabase
1. Tại Supabase Dashboard, vào menu **Authentication** (biểu tượng hình người) > chọn **Providers**.
2. Tìm đến mục **Google**, bấm mở rộng.
3. Bạn sẽ thấy dòng **Callback URL (for OAuth)** có định dạng:
   ```text
   https://<mã-dự-án>.supabase.co/auth/v1/callback
   ```
   *Nhấp nút copy để lưu địa chỉ này lại.*

### Bước 2.2: Tạo OAuth Client trên Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một Dự án mới (Project Name: `Dream House Web`).
3. Vào menu **APIs & Services** > chọn **OAuth consent screen** (Màn hình đồng ý):
   - Chọn loại: **External** (Bên ngoài) > bấm **Create**.
   - Điền thông tin cơ bản:
     - **App name:** `Nhà Mơ Ước`
     - **User support email:** Nhập email của bạn (ví dụ: `voviet4323@gmail.com`).
     - **Developer contact information:** Nhập lại email.
   - Bấm **Save and Continue** qua các bước Scopes cho đến khi hoàn thành.
4. Chuyển sang tab **Credentials** (Thông tin xác thực) > bấm **+ CREATE CREDENTIALS** > chọn **OAuth client ID**:
   - **Application type:** Chọn `Web application`.
   - **Name:** `Dream House Web Client`.
   - Tại mục **Authorized redirect URIs** (URI chuyển hướng được phép): Bấm **+ ADD URI** và dán chính xác **Callback URL** đã lấy ở Bước 2.1 từ Supabase vào đây.
   - Bấm **CREATE**.
5. Màn hình sẽ hiển thị:
   - **Client ID** (dạng `xxxxxx.apps.googleusercontent.com`)
   - **Client Secret**

### Bước 2.3: Dán Khóa vào Supabase
1. Quay lại trang **Supabase > Authentication > Providers > Google**.
2. Bật công tắc **Enable Sign in with Google**.
3. Dán **Client ID** và **Client Secret** vào 2 ô tương ứng.
4. Nhấn **Save**.

---

## 3. CẤU HÌNH URL CHUYỂN HƯỚNG (REDIRECT URLS)

Để sau khi đăng nhập Google hoặc bấm link xác thực email, trình duyệt chuyển hướng đúng về trang web của bạn:

1. Vào **Authentication** > **URL Configuration**.
2. **Site URL:** Điền địa chỉ website chính của bạn (ví dụ khi chạy thử trên máy: `http://localhost:3000` hoặc `http://127.0.0.1:5500`, hoặc domain thật sau này `https://nhamouoc.vn`).
3. **Redirect URLs:** Thêm tất cả các địa chỉ bạn dùng để chạy web:
   ```text
   http://localhost:3000/*
   http://localhost:5500/*
   http://127.0.0.1:5500/*
   https://yourdomain.com/*
   ```
4. Bấm **Save**.

---

## 4. CÁCH CẤP QUYỀN QUẢN TRỊ VIÊN (ADMIN)

Mặc định khi bất kỳ ai đăng ký (kể cả bạn), trigger SQL sẽ đặt tài khoản ở quyền `user` (người dùng thường) để đảm bảo an toàn. Để nâng quyền tài khoản của bạn lên `admin`:

1. Đăng ký/đăng nhập tài khoản của bạn trên website một lần (bằng Email hoặc Google) để hệ thống sinh dòng dữ liệu trong bảng `profiles`.
2. Mở tab **SQL Editor** trên Supabase.
3. Chạy câu lệnh SQL sau (thay thế địa chỉ email thật của bạn vào):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'voviet4323@gmail.com' -- << THAY EMAIL CỦA BẠN VÀO ĐÂY
);
```

4. Sau khi câu lệnh chạy thành công (`UPDATE 1`), bạn tải lại trang web; nút **Quản trị (Admin)** sẽ lập tức xuất hiện trên thanh điều hướng và bạn có toàn quyền truy cập trang `admin.html`.

---

## 5. CẤU HÌNH THƯ MỤC STORAGE & GIỚI HẠN TẢI TỆP

Khi bạn chạy file `supabase/03_storage.sql`, 2 bucket sau đã được cấu hình tự động:
1. `template-images`: Chế độ **Public**, dung lượng tối đa **3 MB**, chấp nhận JPG, PNG, WEBP.
2. `template-models`: Chế độ **Public**, dung lượng tối đa **10 MB**, chấp nhận file `.glb`.

Để kiểm tra trực quan:
- Vào menu **Storage** trên Supabase Dashboard.
- Bạn sẽ thấy 2 thư mục `template-images` và `template-models` xuất hiện với nhãn **Public**.
- Chính sách bảo mật RLS đảm bảo khách vãng lai chỉ có thể **đọc/tải**, chỉ tài khoản có role `admin` mới được quyền tải file lên (`INSERT`) hoặc xoá (`DELETE`).

---

## 6. TÍCH HỢP KHÓA VÀO MÃ NGUỒN WEB (TỰ ĐỘNG HÓA QUA .ENV)

Dự án đã hỗ trợ **cơ chế tự động sinh file cấu hình** từ `.env` để bảo vệ mã nguồn và dễ dàng triển khai đa máy:

1. Mở hoặc tạo file `.env` tại thư mục gốc dự án:
2. Điền thông số Supabase của bạn:
   ```env
   SUPABASE_URL=https://qdkhqvsbtmbgkmoldazt.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_HNBq9BOkrn7bmJxsG4ZHbQ_p937j35i
   CONTACT_PHONE=0367020403
   CONTACT_ZALO=https://zalo.me/0367020403
   CONTACT_EMAIL=voviet4323@gmail.com
   CONTACT_FACEBOOK=https://www.facebook.com/quocviet43
   PORT=3000
   ```
3. Chạy script đồng bộ tự động:
   ```powershell
   node generate-config.js
   ```
   *Script sẽ tự động đọc `.env`, kiểm tra tránh ghi đè URL giả lập, và sinh file `js/config.js` chuẩn xác.*
4. Chạy hệ thống bằng file `start.bat` (nhấp đúp chuột) hoặc lệnh `npm run dev`. Trình duyệt sẽ tự động mở tại `http://localhost:3000`.

---

## 7. CẤU HÌNH ĐĂNG KÝ TÀI KHOẢN BẰNG USERNAME (KHÔNG CẦN EMAIL)

Hệ thống hỗ trợ tính năng đăng ký tài khoản nhanh bằng **Tên tài khoản (Username)** kèm ô xác nhận mật khẩu, không phụ thuộc vào hòm thư Email.

Để kích hoạt tính năng tự động tạo user và tránh hoàn toàn giới hạn Rate Limit gửi mail của Supabase Free tier:
1. Mở **Supabase Dashboard** > chọn mục **SQL Editor**.
2. Mở file [`supabase/05_username_auth.sql`](supabase/05_username_auth.sql) trong thư mục dự án, copy toàn bộ nội dung và dán vào SQL Editor.
3. Nhấn **Run**.
4. Script sẽ tự động:
   - Thêm cột `username` và index `UNIQUE` vào bảng `public.profiles`.
   - Cập nhật trigger `handle_new_user()` để lưu username.
   - Tạo hàm RPC `public.register_user_by_username()` giúp chèn người dùng xác thực trực tiếp vào `auth.users` với cờ `email_confirmed_at = now()`. Người dùng có thể đăng ký và đăng nhập được ngay lập tức!

---

## 8. CẤU HÌNH THEO DÕI LƯỢT XEM MẪU NHÀ & THỐNG KÊ THỜI GIAN THỰC

Để kích hoạt bộ đếm lượt xem chi tiết mẫu nhà thời gian thực và bảng phân tích thị hiếu Admin Dashboard:
1. Mở **Supabase Dashboard** > chọn mục **SQL Editor**.
2. Mở file [`supabase/09_template_views_analytics.sql`](supabase/09_template_views_analytics.sql) trong thư mục dự án, dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
3. Script sẽ tự động:
   - Thêm cột `view_count INTEGER NOT NULL DEFAULT 0` vào bảng `public.templates`.
   - Tạo hàm RPC `public.increment_template_view(UUID)` với quyền `SECURITY DEFINER` để ghi nhận lượt xem nguyên tử cho cả khách vãng lai và thành viên.
   - Tạo chính sách RLS cho phép tài khoản Quản trị viên (Admin) truy vấn bảng `public.favorites` nhằm phân tích mức độ yêu thích (thả tim) của từng đồ án.



