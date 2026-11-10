// js/i18n.js
// Bộ từ điển song ngữ Việt - Anh hoàn chỉnh
const I18N = {
    vi: {
        site_name: "Dream House",
        page_title: "DreamHouse - Kiến Trúc & Xây Dựng",
        tagline: "Kiến trúc tinh hoa - Xây dựng tổ ấm hoàn mỹ",
        preloader_text: "Đang tải không gian kiến trúc...",
        hero_title: "Không gian sống lý tưởng trong tầm tay bạn",
        hero_sub: "Khám phá bộ sưu tập mẫu nhà phố, biệt thự và nhà cấp 4 hiện đại cùng mô hình 3D tương tác thực tế.",
        hero_cta: "Khám phá mẫu nhà",
        nav_gallery: "Thư viện mẫu",
        nav_favorites: "Đã lưu",
        nav_contact: "Liên hệ",
        nav_admin: "Quản trị",
        nav_login: "Đăng nhập",
        nav_logout: "Đăng xuất",

        // Bộ lọc
        filter_all_types: "Tất cả loại nhà",
        filter_townhouse: "Nhà phố",
        filter_villa: "Biệt thự",
        filter_level4: "Nhà cấp 4",
        filter_sort_default: "Mặc định sắp xếp",
        filter_sort_price_asc: "Ngân sách: Thấp đến Cao",
        filter_sort_price_desc: "Ngân sách: Cao đến Thấp",
        filter_sort_area_desc: "Diện tích lớn nhất",
        filter_search_placeholder: "Tìm kiếm mẫu nhà, phong cách...",
        filter_only_favorites: "Chỉ hiện mục yêu thích",

        // Thẻ & Thông số
        spec_size: "Kích thước",
        spec_floors: "Số tầng",
        spec_gfa: "Diện tích sàn",
        spec_estimate: "Dự toán tham khảo",
        spec_rooms: "Công năng",
        spec_roof: "Kiểu mái",
        spec_balcony: "Ban công",
        balcony_yes: "Có ban công",
        balcony_no: "Không có",
        btn_view_detail: "Xem chi tiết & 3D",
        empty_gallery: "Không tìm thấy mẫu nhà nào phù hợp với bộ lọc.",

        // Kiểu mái
        roof_flat: "Mái bằng hiện đại",
        roof_hip: "Mái Nhật",
        roof_gable: "Mái Thái",

        // Chi tiết mẫu
        detail_modal_default_title: "Tên Mẫu Thiết Kế",
        detail_tab_photo: "Ảnh thiết kế & Phối cảnh",
        detail_tab_3d: "Mô hình 3D tương tác",
        detail_3d_hint: "Chuột trái xoay • Chuột phải/2 ngón di chuyển • Cuộn để vào trong nhà",
        detail_cam_front: "Mặt tiền",
        detail_cam_side: "Góc bên",
        detail_cam_top: "Trên cao",
        detail_cam_reset: "Gốc",
        btn_inquire_this: "Nhận báo giá mẫu này",
        btn_favorite_add: "Lưu vào yêu thích",
        btn_favorite_remove: "Bỏ yêu thích",
        btn_prev: "Mẫu trước",
        btn_next: "Mẫu tiếp theo",
        status_fallback_3d: "Đang hiển thị mô hình khối mô phỏng theo kích thước thực tế.",
        status_webgl_error: "Trình duyệt không hỗ trợ WebGL hoặc tải 3D gặp sự cố.",

        // Liên hệ & Báo giá
        contact_section_title: "Liên Hệ Tư Vấn & Nhận Dự Toán",
        contact_section_sub: "Đội ngũ kiến trúc sư và kỹ sư sẵn sàng hỗ trợ bạn 24/7.",
        contact_direct_title: "Kết nối trực tiếp",
        contact_btn_zalo: "Nhắn Zalo ngay (0367020403)",
        contact_btn_call: "Gọi điện thoại",
        contact_btn_fb: "Nhắn tin Facebook",
        contact_btn_email: "Gửi Email",
        contact_form_title: "Để lại thông tin tư vấn",
        form_name: "Họ và tên của bạn",
        form_contact: "Số điện thoại hoặc Email",
        form_message: "Nội dung cần tư vấn (diện tích đất, ngân sách, phong cách...)",
        form_template_refer: "Mẫu nhà quan tâm:",
        form_submit: "Gửi yêu cầu tư vấn",
        form_sending: "Đang gửi thông tin...",
        form_success: "Cảm ơn bạn! Yêu cầu tư vấn đã được gửi thành công. Chúng tôi sẽ liên hệ trong ít phút.",
        form_error: "Có lỗi khi gửi tin nhắn. Vui lòng liên hệ trực tiếp qua Zalo hoặc Hotline.",

        // Hộp thoại Auth
        auth_title_login: "Đăng nhập",
        auth_title_register: "Đăng ký tài khoản",
        auth_btn_google: "Tiếp tục với Google",
        auth_or: "hoặc",
        auth_email_hint: "Đăng nhập bằng tên tài khoản hoặc email",
        auth_email_hint_register: "Đăng ký tài khoản bằng Username",
        btn_back_home: "Quay lại trang chủ",
        auth_email: "Tên tài khoản hoặc Email",
        auth_username: "Tên tài khoản (Username)",
        auth_pass: "Mật khẩu (tối thiểu 6 ký tự)",
        auth_confirm_pass: "Xác nhận mật khẩu",
        auth_pass_placeholder: "Nhập mật khẩu...",
        auth_confirm_pass_placeholder: "Nhập lại mật khẩu...",
        auth_name: "Họ tên hiển thị",
        auth_remember_me: "Ghi nhớ tài khoản",
        auth_forgot: "Quên mật khẩu?",
        auth_no_acc: "Chưa có tài khoản? Đăng ký ngay",
        auth_has_acc: "Đã có tài khoản? Đăng nhập",
        auth_login_action: "Đăng nhập",
        auth_register_action: "Đăng ký",
        auth_reset_action: "Gửi email khôi phục",
        auth_username_placeholder: "Ví dụ: quocviet99",
        auth_login_placeholder: "Nhập tên tài khoản hoặc email...",
        auth_welcome: "Xin chào",
        auth_sync_favorites: "Đã đồng bộ các mẫu yêu thích trên máy này vào tài khoản của bạn.",

        // Hồ sơ cá nhân (Profile Panel)
        profile_title: "Hồ sơ cá nhân & Tài khoản",
        profile_subtitle: "Quản lý và cập nhật thông tin tài khoản của bạn",
        profile_name: "Họ và tên hiển thị",
        profile_phone: "Số điện thoại liên hệ",
        profile_email: "Địa chỉ Email",
        profile_avatar_url: "Đường dẫn ảnh đại diện (Avatar URL)",
        profile_change_pass_title: "Đổi mật khẩu tài khoản",
        profile_change_pass_sub: "Cập nhật mật khẩu bảo mật (tối thiểu 6 ký tự)",
        profile_current_pass: "Mật khẩu hiện tại",
        profile_current_pass_placeholder: "Nhập mật khẩu đang dùng để xác minh...",
        profile_new_pass: "Mật khẩu mới",
        profile_confirm_pass: "Xác nhận mật khẩu",
        profile_pass_strength: "Độ mạnh mật khẩu",
        profile_pass_weak: "Yếu",
        profile_pass_medium: "Trung bình",
        profile_pass_good: "Khá",
        profile_pass_strong: "Rất mạnh",
        profile_pass_match: "Mật khẩu khớp",
        profile_pass_mismatch: "Mật khẩu chưa khớp",
        profile_save_btn: "Lưu thay đổi",
        profile_saving: "Đang lưu...",
        profile_save_success: "Cập nhật hồ sơ thành công!",
        btn_cancel: "Hủy bỏ",

        // Menu xổ xuống của người dùng (User Profile Menu)
        menu_admin: "Bảng quản trị Admin",
        menu_favorites: "Mẫu nhà đã lưu yêu thích",
        menu_profile: "Chỉnh sửa hồ sơ",
        menu_settings: "Cài đặt hệ thống",
        role_admin: "Quản trị viên (Admin)",
        role_member: "Thành viên",

        // Chuông thông báo (Notification Bell #074)
        notif_tab_all: "Tất cả",
        notif_tab_inquiries: "Tư vấn",
        notif_mark_all: "Đã đọc tất cả",
        notif_empty: "Không có thông báo mới",

        // Phụ đề Gallery
        gallery_sub: "Tuyển chọn các đồ án kiến trúc sẵn sàng thi công với dự toán tham khảo minh bạch.",

        // Kênh liên hệ trực tiếp
        contact_direct_note: "Thông tin liên hệ trực tiếp của phụ trách dự án Võ Quốc Việt:",
        contact_badge_zalo: "Phản hồi nhanh trong 15 phút",
        contact_badge_phone: "Tư vấn kỹ thuật xây dựng",
        contact_badge_email: "Gửi hồ sơ mặt bằng & bản vẽ",

        // Khung giới thiệu Auth
        auth_badge_model: "Mô hình thực tế",
        auth_badge_drawings: "Bản vẽ kỹ thuật chuẩn",
        auth_headline_prefix: "Kiến tạo không gian sống &",
        auth_headline_highlight: "tổ ấm trong mơ",
        auth_showcase_sub: "Trải nghiệm trực quan mô hình 3D thực tế, lựa chọn phong cách kiến trúc độc bản và đồng hành cùng chuyên gia xây dựng tổ ấm hoàn mỹ.",
        auth_btn_explore: "Khám phá bộ sưu tập mẫu",

        // Chi tiết Hồ sơ cá nhân (Profile Modal)
        profile_label_name: "Họ và tên hiển thị",
        profile_label_phone: "Số điện thoại liên hệ",
        profile_label_email: "Địa chỉ Email",
        profile_badge_verified: "Đã xác thực",
        profile_label_avatar: "Ảnh đại diện (Avatar)",
        profile_btn_choose_file: "Chọn ảnh từ máy tính",
        profile_avatar_no_file: "Chưa chọn tệp ảnh mới",
        profile_or_url: "Hoặc dán liên kết URL ảnh",
        profile_preset_label: "Mẫu nhanh:",
        profile_preset_architect: "Kiến trúc sư",
        profile_preset_engineer: "Kỹ sư",
        profile_preset_designer: "Thiết kế",
        profile_preset_letter: "Dùng chữ cái",
        profile_security_title: "Đổi mật khẩu tài khoản",
        profile_security_desc: "Cập nhật mật khẩu bảo mật (tối thiểu 6 ký tự)",
        profile_pill_open: "Mở",
        profile_pill_close: "Đóng",
        profile_strength_label: "Độ mạnh:",
        profile_strength_val_empty: "Chưa nhập",
        profile_crit_length: "Tối thiểu 6 ký tự",
        profile_crit_alphanumeric: "Có cả chữ và số",
        profile_meta_member_since: "Thành viên từ:",
        profile_meta_id: "Mã ID:",

        // Trang quản trị
        admin_title: "Hệ Thống Quản Trị - DreamHouse",
        admin_tab_templates: "Quản lý mẫu nhà",
        admin_tab_inquiries: "Yêu cầu tư vấn",
        admin_btn_new: "+ Thêm mẫu nhà mới",
        admin_btn_save: "Lưu thông tin",
        admin_btn_cancel: "Huỷ bỏ",
        admin_delete_confirm: "Bạn có chắc chắn muốn xoá mẫu nhà này?",
        admin_status_new: "Mới",
        admin_status_handled: "Đã xử lý",
        admin_mark_handled: "Đánh dấu đã xử lý",
        admin_unauthorized: "Bạn không có quyền quản trị! Đang quay lại trang chủ..."
    },
    en: {
        site_name: "Dream House",
        page_title: "DreamHouse - Architecture & Construction",
        tagline: "Architectural Excellence - Crafting Your Ideal Living",
        preloader_text: "Loading architectural space...",
        hero_title: "Your Dream Living Space Within Reach",
        hero_sub: "Explore our curated collection of townhouses, luxury villas, and country bungalows with interactive 3D models.",
        hero_cta: "Browse House Models",
        nav_gallery: "Gallery",
        nav_favorites: "Saved",
        nav_contact: "Contact",
        nav_admin: "Admin",
        nav_login: "Sign In",
        nav_logout: "Sign Out",

        // Filters
        filter_all_types: "All House Types",
        filter_townhouse: "Townhouse",
        filter_villa: "Villa",
        filter_level4: "Country House",
        filter_sort_default: "Default Order",
        filter_sort_price_asc: "Estimate: Low to High",
        filter_sort_price_desc: "Estimate: High to Low",
        filter_sort_area_desc: "Largest Floor Area",
        filter_search_placeholder: "Search models, styles...",
        filter_only_favorites: "Only show saved favorites",

        // Specs
        spec_size: "Dimensions",
        spec_floors: "Floors",
        spec_gfa: "Gross Floor Area",
        spec_estimate: "Estimated Cost",
        spec_rooms: "Layout & Rooms",
        spec_roof: "Roof Style",
        spec_balcony: "Balcony",
        balcony_yes: "Yes",
        balcony_no: "No",
        btn_view_detail: "View Details & 3D",
        empty_gallery: "No house models match your criteria.",

        // Roof styles
        roof_flat: "Modern Flat Roof",
        roof_hip: "Hip Roof (Japanese Style)",
        roof_gable: "Gable Roof (Thai Style)",

        // Modal
        detail_modal_default_title: "House Design Model",
        detail_tab_photo: "Design Photos & Perspectives",
        detail_tab_3d: "Interactive 3D Walkthrough",
        detail_3d_hint: "Left drag to orbit • Right drag to pan • Scroll to zoom inside",
        detail_cam_front: "Front",
        detail_cam_side: "Side",
        detail_cam_top: "Top",
        detail_cam_reset: "Reset",
        btn_inquire_this: "Inquire About This Model",
        btn_favorite_add: "Save to Favorites",
        btn_favorite_remove: "Remove Favorite",
        btn_prev: "Previous",
        btn_next: "Next",
        status_fallback_3d: "Displaying procedural 3D block rendered from actual building dimensions.",
        status_webgl_error: "WebGL is not supported by your browser or 3D failed to load.",

        // Contact
        contact_section_title: "Get in Touch & Request an Estimate",
        contact_section_sub: "Our team of architects and structural engineers is here to bring your vision to life.",
        contact_direct_title: "Direct Channels",
        contact_btn_zalo: "Chat on Zalo (0367020403)",
        contact_btn_call: "Call Phone",
        contact_btn_fb: "Message on Facebook",
        contact_btn_email: "Send Email (voviet4323@gmail.com)",
        contact_form_title: "Send a Consultation Request",
        form_name: "Your Full Name",
        form_contact: "Email or Phone Number",
        form_message: "Your requirements (land size, budget, preferences...)",
        form_template_refer: "Selected Model:",
        form_submit: "Submit Request",
        form_sending: "Sending request...",
        form_success: "Thank you! Your request has been received. We will contact you promptly.",
        form_error: "Failed to send inquiry. Please reach out via Email or Facebook directly.",

        // Auth
        auth_title_login: "Log in",
        auth_title_register: "Create an account",
        auth_btn_google: "Log In Using Google",
        auth_or: "or",
        auth_email_hint: "Log in using username or email",
        auth_email_hint_register: "Sign up using a Username",
        btn_back_home: "Back to Home",
        auth_email: "Username or Email",
        auth_username: "Username",
        auth_pass: "Password (min 6 characters)",
        auth_confirm_pass: "Confirm Password",
        auth_pass_placeholder: "Enter password...",
        auth_confirm_pass_placeholder: "Confirm password...",
        auth_name: "Full Name",
        auth_remember_me: "Remember me",
        auth_forgot: "Forgot password?",
        auth_no_acc: "Don't have an account? Sign up",
        auth_has_acc: "Already have an account? Sign in",
        auth_login_action: "Sign In",
        auth_register_action: "Sign Up",
        auth_reset_action: "Send Reset Link",
        auth_username_placeholder: "e.g. johndoe99",
        auth_login_placeholder: "Enter username or email...",
        auth_welcome: "Welcome",
        auth_sync_favorites: "Your local favorite models have been synced to your account.",

        // Profile Panel
        profile_title: "Profile & Account Settings",
        profile_subtitle: "Manage and update your personal information",
        profile_name: "Display Name",
        profile_phone: "Phone Number",
        profile_email: "Email Address",
        profile_avatar_url: "Avatar Image URL",
        profile_change_pass_title: "Change Account Password",
        profile_change_pass_sub: "Update your secure password (min. 6 characters)",
        profile_current_pass: "Current Password",
        profile_current_pass_placeholder: "Enter current password to verify...",
        profile_new_pass: "New Password",
        profile_confirm_pass: "Confirm Password",
        profile_pass_strength: "Password Strength",
        profile_pass_weak: "Weak",
        profile_pass_medium: "Medium",
        profile_pass_good: "Good",
        profile_pass_strong: "Strong",
        profile_pass_match: "Passwords match",
        profile_pass_mismatch: "Passwords do not match",
        profile_save_btn: "Save Changes",
        profile_saving: "Saving...",
        profile_save_success: "Profile updated successfully!",
        btn_cancel: "Cancel",

        // User profile menu
        menu_admin: "Admin Portal",
        menu_favorites: "Saved Favorites",
        menu_profile: "Edit Profile",
        menu_settings: "System Settings",
        role_admin: "Administrator (Admin)",
        role_member: "Member",

        // Notification Bell #074
        notif_tab_all: "All",
        notif_tab_inquiries: "Inquiries",
        notif_mark_all: "Mark all read",
        notif_empty: "No new notifications",

        // Gallery section
        gallery_sub: "Curated architectural designs ready for construction with transparent estimates.",

        // Direct channels
        contact_direct_note: "Direct contact information for Project Lead Vo Quoc Viet:",
        contact_badge_zalo: "Fast reply within 15 minutes",
        contact_badge_phone: "Technical engineering support",
        contact_badge_email: "Send floor plans & drawings",

        // Auth showcase
        auth_badge_model: "Interactive 3D Walkthrough",
        auth_badge_drawings: "Standard BIM Blueprints",
        auth_headline_prefix: "Crafting your living space &",
        auth_headline_highlight: "your dream home",
        auth_showcase_sub: "Visually experience real 3D models, select signature architectural styles, and partner with experts to craft your ideal sanctuary.",
        auth_btn_explore: "Explore House Models",

        // Profile modal
        profile_label_name: "Full Name",
        profile_label_phone: "Phone Number",
        profile_label_email: "Email Address",
        profile_badge_verified: "Verified",
        profile_label_avatar: "Profile Avatar",
        profile_btn_choose_file: "Choose from Computer",
        profile_avatar_no_file: "No new file selected",
        profile_or_url: "Or paste image URL",
        profile_preset_label: "Quick presets:",
        profile_preset_architect: "Architect",
        profile_preset_engineer: "Engineer",
        profile_preset_designer: "Designer",
        profile_preset_letter: "Use Initials",
        profile_security_title: "Change Account Password",
        profile_security_desc: "Update security password (min. 6 characters)",
        profile_pill_open: "Open",
        profile_pill_close: "Close",
        profile_strength_label: "Strength:",
        profile_strength_val_empty: "Not entered",
        profile_crit_length: "At least 6 characters",
        profile_crit_alphanumeric: "Both letters and numbers",
        profile_meta_member_since: "Member since:",
        profile_meta_id: "User ID:",

        // Admin
        admin_title: "Dream House Management",
        admin_tab_templates: "House Templates",
        admin_tab_inquiries: "Inquiries",
        admin_btn_new: "+ Add New Template",
        admin_btn_save: "Save Changes",
        admin_btn_cancel: "Cancel",
        admin_delete_confirm: "Are you sure you want to delete this template?",
        admin_status_new: "New",
        admin_status_handled: "Handled",
        admin_mark_handled: "Mark as Handled",
        admin_unauthorized: "Access denied. Admin privileges required. Redirecting to home..."
    }
};

class I18nManager {
    constructor() {
        // Lấy ngôn ngữ: Ưu tiên localStorage, sau đó lấy theo ngôn ngữ trình duyệt
        const savedLang = localStorage.getItem('dream_house_lang');
        const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        this.currentLang = savedLang || (browserLang.startsWith('vi') ? 'vi' : 'en');
    }

    getLang() {
        return this.currentLang;
    }

    setLang(lang) {
        if (lang !== 'vi' && lang !== 'en') return;
        this.currentLang = lang;
        localStorage.setItem('dream_house_lang', lang);
        document.documentElement.lang = lang;
        this.updateDOM();
    }

    toggle() {
        this.setLang(this.currentLang === 'vi' ? 'en' : 'vi');
    }

    t(key) {
        const dict = I18N[this.currentLang] || I18N.vi;
        return dict[key] || I18N.vi[key] || key;
    }

    // Định dạng tiền tệ theo quy ước:
    // Tiếng Việt: "1.85 tỷ", "850 triệu"
    // Tiếng Anh: "≈ 1.85 billion VND" hoặc "≈ 850 million VND"
    formatCost(vnd) {
        if (!vnd || isNaN(vnd)) return this.currentLang === 'vi' ? 'Liên hệ' : 'Contact us';
        const num = Number(vnd);
        if (this.currentLang === 'vi') {
            if (num >= 1000000000) {
                const billions = (num / 1000000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                return `${billions} tỷ VNĐ`;
            } else {
                const millions = Math.round(num / 1000000).toLocaleString('vi-VN');
                return `${millions} triệu VNĐ`;
            }
        } else {
            if (num >= 1000000000) {
                const billions = (num / 1000000000).toFixed(2).replace(/\.00$/, '');
                return `≈ ${billions} billion VND`;
            } else {
                const millions = (num / 1000000).toFixed(0);
                return `≈ ${millions} million VND`;
            }
        }
    }

    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const dict = I18N[this.currentLang] || I18N.vi;
            const text = dict[key] || (I18N.vi ? I18N.vi[key] : null);
            if (text && text !== key) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.getAttribute('placeholder')) {
                        el.setAttribute('placeholder', text);
                    }
                } else if (el.tagName === 'TITLE') {
                    document.title = text;
                    el.textContent = text;
                } else {
                    el.textContent = text;
                }
            }
        });

        // Cập nhật trạng thái nút đổi ngôn ngữ (HIỂN THỊ VI KHI TIẾNG VIỆT, EN KHI TIẾNG ANH)
        const toggleBtn = document.getElementById('lang-toggle');
        if (toggleBtn) {
            const isEn = this.currentLang === 'en';
            toggleBtn.classList.toggle('lang-en', isEn);
            toggleBtn.classList.toggle('lang-vi', !isEn);
            toggleBtn.setAttribute('title', isEn ? 'Switch to Vietnamese / Chuyển sang Tiếng Việt' : 'Chuyển sang Tiếng Anh / Switch to English');
            toggleBtn.setAttribute('aria-label', isEn ? 'Current language: English. Click to switch to Vietnamese' : 'Ngôn ngữ hiện tại: Tiếng Việt. Bấm để đổi sang Tiếng Anh');

            // Nếu nút chưa có cấu trúc track (fallback), tự động render cấu trúc track
            if (!toggleBtn.querySelector('.lang-pill-track')) {
                toggleBtn.innerHTML = `
                    <svg class="lang-globe-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span class="lang-pill-track" aria-hidden="true">
                        <span class="lang-code lang-code-vi">VI</span>
                        <span class="lang-code lang-code-en">EN</span>
                    </span>
                `;
            }

            // Kích hoạt animation nhún nảy (bounce/pulse) khi đổi chế độ
            toggleBtn.classList.remove('switching');
            void toggleBtn.offsetWidth; // force reflow
            toggleBtn.classList.add('switching');
        }

        // Kích hoạt sự kiện thay đổi ngôn ngữ cho các thành phần khác cập nhật dữ liệu mẫu
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
    }
}

window.i18n = new I18nManager();

