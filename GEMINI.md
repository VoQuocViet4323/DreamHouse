# QUY TẮC TỰ ĐỘNG CHO DỰ ÁN DREAM HOUSE (NHÀ MƠ ƯỚC)

1. **Tự động đọc và cập nhật `memories.md`:**
   - Khi bắt đầu nhiệm vụ mới hoặc khi hoàn thành bất kỳ yêu cầu nào (thêm tính năng, chỉnh sửa giao diện UI/UX, sửa lỗi bug, cập nhật cơ sở dữ liệu Supabase, cấu hình hệ thống), bạn **BẮT BUỘC phải tự động cập nhật tiến trình vào file `memories.md`** trong thư mục gốc dự án (Mục 6 - Nhật ký Tiến trình Phát triển và các mục kiến trúc liên quan) mà không cần người dùng nhắc nhở.

2. **Tự động cập nhật cẩm nang lỗi `AI_Debug.md`:**
   - Mỗi khi phát hiện và xử lý bất kỳ lỗi nào (lỗi đăng nhập, lỗi biến môi trường `.env`, lỗi đệ quy RLS, lỗi tải Storage, lỗi Three.js, lỗi tương phản màu sắc Dark/Light Mode...), bạn **BẮT BUỘC phải bổ sung ngay lỗi đó vào file `AI_Debug.md`** với đầy đủ: Hiện tượng, Nguyên nhân cốt lõi và Cách khắc phục dứt điểm để tuyệt đối không lặp lại trong tương lai.

3. **Tự động cập nhật tài liệu vận hành `AI_Config.md` & `README.md`:**
   - Khi có thay đổi về quy trình khởi chạy dự án, biến môi trường `.env`, cấu trúc thư mục hoặc cơ chế đồng bộ, bạn **BẮT BUỘC cập nhật tương ứng vào `AI_Config.md` và `README.md`** để tài liệu luôn phản ánh đúng 100% hiện trạng mã nguồn.

4. **Đồng bộ GitHub tự động:**
   - Sau khi hoàn tất chỉnh sửa mã nguồn và đồng bộ tất cả các file tài liệu Markdown (`memories.md`, `AI_Debug.md`, `AI_Config.md`, `README.md`, `GEMINI.md`), hãy commit và push lên nhánh `main` của repository `https://github.com/VoQuocViet4323/DreamHouse.git`.

5. **Ngôn ngữ & Phong cách giao tiếp & Quy tắc Cache-Busting:**
   - Luôn phản hồi bằng tiếng Việt rõ ràng, ngắn gọn, chuyên nghiệp.
   - Khi thay đổi CSS/JS trong `index.html` hoặc `admin.html`, luôn tăng tham số phiên bản cache-busting (`?v=...`) để trình duyệt của người dùng nhận giao diện mới ngay lập tức mà không bị dính cache cũ.
   - Khi thiết kế giao diện cho Modal/Dialog và các nút tương tác, bắt buộc dùng hệ thống Design Tokens CSS (`--btn-close-...`, `--btn-subtle-...`) để luôn đảm bảo tính tương phản hoàn hảo giữa Light Mode và Dark Mode.

