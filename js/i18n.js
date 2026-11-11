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
        notif_tab_inquiries: "Khách tư vấn",
        notif_tab_my_inquiries: "Tư vấn của tôi",
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
        admin_unauthorized: "Bạn không có quyền quản trị! Đang quay lại trang chủ...",

        // Tính dự toán tương tác (Feature 1: Interactive Cost Calculator)
        nav_calculator: "Tính dự toán",
        hero_btn_calc: "Dự toán chi phí",
        calc_interactive_title: "Dự Toán Chi Phí Tương Tác",
        calc_interactive_sub: "Tự động bóc tách theo quy mô & gói vật tư 2026",
        calc_package_label: "Gói vật tư thi công hoàn thiện:",
        calc_foundation_label: "Giải pháp kết cấu móng:",
        calc_area_badge: "m² quy đổi",
        calc_total_estimate: "Tổng mức đầu tư ước tính:",
        calc_formula_detail: "Đơn giá:",
        calc_vat_note: "(Ước tính theo đơn giá Q1/2026 • Đã gồm nhân công trọn gói)",
        calc_part_raw: "Thô & Kết cấu (52%)",
        calc_part_finish: "Hoàn thiện (33%)",
        calc_part_me: "Điện nước MEP (10%)",
        calc_part_mgmt: "Dự phòng & QL (5%)",
        calc_btn_inquire_pkg: "Nhận báo giá theo phương án này →",

        // Gói vật tư
        pkg_rough: "Xây Thô",
        pkg_rough_desc: "Nhân công + sắt thép xi măng",
        pkg_standard: "Tiêu Chuẩn",
        pkg_standard_desc: "Chìa khóa trao tay phổ thông",
        pkg_premium: "Nâng Cao",
        pkg_premium_desc: "Vật liệu cao cấp, bảo hành 5 năm",
        pkg_luxury: "Luxury",
        pkg_luxury_desc: "Đẳng cấp dinh thự & Smarthome",
        pkg_popular: "Khuyên dùng",

        // Loại móng
        fnd_single: "Móng Đơn (25%)",
        fnd_pile: "Móng Cọc (40%)",
        fnd_strip: "Móng Băng (50%)",
        fnd_raft: "Móng Bè (75%)",

        // Quick Calculator Modal
        calc_modal_title: "Bảng Tính Dự Toán Xây Nhà Nhanh",
        calc_modal_sub: "Nhập kích thước khu đất để nhận ngay bảng khái toán chi tiết",
        calc_input_width: "Mặt tiền khu đất (m):",
        calc_input_depth: "Chiều sâu khu đất (m):",
        calc_input_floors: "Số tầng xây dựng:",
        calc_input_roof: "Kiểu kết cấu mái:",
        roof_flat_short: "Mái bằng BTCT (35%)",
        roof_hip_short: "Mái Nhật kèo thép (70%)",
        roof_gable_short: "Mái Thái kèo thép (70%)",
        roof_concrete_tile: "Mái đúc dán ngói (100%)",
        calc_land_area: "Diện tích đất:",
        calc_total_gfa: "Tổng diện tích xây dựng quy đổi:",
        calc_match_title: "Gợi ý mẫu nhà Dream House phù hợp:",
        calc_btn_view_match: "Xem chi tiết mẫu này",
        calc_btn_send_consult: "Gửi dự toán này để KTS tư vấn chi tiết →",

        // Feature 2: Bóc tách mặt bằng 2D/3D từng tầng (Floor-by-Floor Layer Explorer)
        floorplan_title: "Sơ Đồ Mặt Bằng Bố Trí Công Năng",
        floorplan_sub: "Bóc tách kích thước & diện tích từng phòng theo tiêu chuẩn kiến trúc",
        tab_view_photo: "Phối cảnh",
        tab_view_3d: "3D Tương tác",
        tab_view_floorplan: "Mặt bằng tầng",
        floor_1_name: "Mặt bằng Tầng 1 (Trệt)",
        floor_2_name: "Mặt bằng Tầng 2 (Lầu 1)",
        floor_3_name: "Mặt bằng Tầng 3 (Lầu 2)",
        floor_roof_name: "Mặt bằng Mái",
        floor_btn_zoom: "Phóng to bản vẽ",
        floor_btn_iso3d: "Mặt cắt 3D",
        floor_room_list_title: "Chi tiết công năng & diện tích các phòng:",
        floor_total_living: "Tổng diện tích sàn sử dụng:",
        floor_lightbox_hint: "Bấm ra ngoài hoặc phím Esc để đóng bản vẽ",
        room_living: "Phòng khách liên thông",
        room_kitchen: "Bếp & Phòng ăn",
        room_bedroom: "Phòng ngủ",
        room_bed_master: "Phòng ngủ Master",
        room_bath: "Nhà vệ sinh (WC)",
        room_bath_master: "WC riêng khép kín",
        room_altar: "Phòng thờ gia tiên",
        room_balcony: "Ban công đón gió",
        room_terrace: "Sân thượng & BBQ",
        room_laundry: "Khu giặt phơi & Kỹ thuật",
        room_garage: "Sân trước & Gara xe",
        room_skylight: "Giếng trời thông gió",
        room_corridor: "Sảnh thang & Hành lang",

        // Feature 3: Tiện ích Phong Thủy & Thước Lỗ Ban (Feng Shui & Lu Ban Architectural Ruler)
        nav_fengshui: "Phong thủy",
        hero_btn_fengshui: "Tra cứu phong thủy",
        fengshui_title: "Tiện Ích Phong Thủy & Thước Lỗ Ban",
        fengshui_sub: "Bản địa hóa theo quy chuẩn phong thủy xây dựng nhà ở dân dụng Việt Nam",
        fengshui_tab_luban: "Thước Lỗ Ban Trực Tuyến",
        fengshui_tab_battrach: "Bát Trạch & Hướng Nhà",
        luban_unit_mm: "Milimét (mm)",
        luban_unit_cm: "Xentimét (cm)",
        luban_input_placeholder: "Nhập kích thước đo...",
        luban_ruler_522: "Thước 52.2 cm: Thông Thủy (Cửa, Chiều cao lọt lòng)",
        luban_ruler_429: "Thước 42.9 cm: Dương Trạch (Bếp, Cầu thang, Nội thất)",
        luban_ruler_388: "Thước 38.8 cm: Âm Phần & Bàn Thờ (Bàn thờ gia tiên)",
        luban_presets_title: "Kích thước phong thủy chuẩn thông dụng:",
        luban_preset_door1: "Cửa đi 1 cánh (810 × 2120 mm)",
        luban_preset_door2: "Cửa chính 2 cánh (1330 × 2120 mm)",
        luban_preset_door4: "Cửa chính 4 cánh (2550 × 2620 mm)",
        luban_preset_altar: "Bàn thờ gia tiên (1270 × 610 mm)",
        luban_preset_height: "Chiều cao tầng trệt (3600 mm)",
        luban_result_title: "Kết quả phân tích kích thước phong thủy:",
        luban_status_good: "CUNG TỐT (CÁT)",
        luban_status_bad: "CUNG XẤU (HUNG)",
        battrach_birth_year: "Năm sinh gia chủ (Dương lịch):",
        battrach_gender: "Giới tính gia chủ:",
        battrach_gender_male: "Nam (Gia chủ)",
        battrach_gender_female: "Nữ (Gia chủ)",
        battrach_btn_calc: "Tra cứu phong thủy",
        battrach_result_title: "Thông số phong thủy Bát Trạch:",
        battrach_can_chi: "Can Chi & Niên Mệnh:",
        battrach_cung_phi: "Quẻ Cung Phi:",
        battrach_group: "Nhóm Bát Trạch:",
        battrach_group_east: "Đông Tứ Mệnh (Hợp hướng Đông, Đông Nam, Nam, Bắc)",
        battrach_group_west: "Tây Tứ Mệnh (Hợp hướng Tây, Tây Bắc, Tây Nam, Đông Bắc)",
        battrach_good_dirs: "4 Hướng Tốt (Đón Vượng Khí & Tài Lộc):",
        battrach_bad_dirs: "4 Hướng Xấu (Cần Tránh Hoặc Hóa Giải):",
        battrach_rule_door: "Hướng cửa chính & Ban công:",
        battrach_rule_altar: "Hướng ban thờ gia tiên:",
        battrach_rule_kitchen: "Bố trí bếp nấu (Tọa hung hướng cát):",
        battrach_rule_bed: "Hướng kê giường ngủ:",
        battrach_btn_send_consult: "Gửi thông tin phong thủy này để KTS tư vấn mặt bằng →",
        detail_fengshui_title: "Tư Vấn Phong Thủy & Kích Thước Lỗ Ban",
        detail_fengshui_desc: "Đồ án được thiết kế đồng bộ theo kích thước thước Lỗ Ban cung Tài Lộc và tương thích Bát Trạch.",
        detail_btn_open_fengshui: "Mở công cụ tra cứu phong thủy →",

        // Feature 4: Công cụ So sánh mẫu nhà đối đầu (Side-by-Side Compare)
        compare_title: "So Sánh Mẫu Nhà Đối Đầu",
        compare_sub: "Đối chiếu trực quan kích thước, công năng, kiến trúc và dự toán chi phí",
        compare_dock_title: "So sánh mẫu nhà",
        compare_dock_empty: "Chọn từ 2 đến 3 mẫu nhà để đối chiếu",
        compare_btn_action: "So sánh ngay",
        compare_btn_clear: "Xóa tất cả",
        compare_btn_add: "So sánh",
        compare_btn_added: "Đã chọn so sánh",
        compare_limit_reached: "Bạn chỉ có thể so sánh tối đa 3 mẫu nhà cùng lúc",
        compare_need_two: "Vui lòng chọn ít nhất 2 mẫu nhà để so sánh đối đầu",
        compare_diff_toggle: "Chỉ hiện điểm khác biệt",
        compare_sec_general: "Thông tin kiến trúc chung",
        compare_sec_specs: "Kích thước & Quy mô",
        compare_sec_rooms: "Bố trí công năng phòng ốc",
        compare_sec_cost: "Dự toán chi phí 2026",
        compare_sec_fengshui: "Định hướng phong thủy",
        compare_row_type: "Loại hình nhà",
        compare_row_dims: "Kích thước mặt tiền × sâu",
        compare_row_land_area: "Diện tích đất",
        compare_row_gfa: "Tổng diện tích xây dựng quy đổi",
        compare_row_floors: "Số tầng cao",
        compare_row_roof: "Giải pháp kết cấu mái",
        compare_row_bedrooms: "Phòng ngủ",
        compare_row_bathrooms: "Phòng vệ sinh (WC)",
        compare_row_living: "Phòng khách",
        compare_row_kitchen: "Bếp & Bàn ăn",
        compare_row_balcony: "Ban công / Lô gia",
        compare_row_altar: "Phòng thờ gia tiên",
        compare_row_garage: "Gara / Sân để xe",
        compare_row_skylight: "Giếng trời thông gió",
        compare_row_price: "Tổng dự toán khái toán",
        compare_row_unit_cost: "Đơn giá xây dựng bình quân",
        compare_row_direction: "Hướng nhà thích hợp",
        compare_row_kua: "Nhóm Bát Trạch hợp",
        compare_btn_view_detail: "Xem chi tiết mẫu này",
        compare_btn_select_this: "Chọn mẫu này & Tư vấn →",
        detail_btn_add_compare: "⚖️ Thêm vào so sánh",
        detail_btn_remove_compare: "✓ Đã trong danh sách so sánh",

        // Feature 5: Xuất hồ sơ tóm tắt 1-Click (Concept PDF Brochure)
        detail_btn_export_pdf: "📄 Xuất hồ sơ Concept PDF",
        brochure_title: "Hồ Sơ Thiết Kế Kiến Trúc Concept",
        brochure_sub: "Hồ sơ tóm tắt đồ án kiến trúc, mặt bằng bố trí công năng & khái toán kinh phí thi công 2026",
        brochure_btn_print: "In hồ sơ / Lưu file PDF (A4)",
        brochure_btn_zalo: "Nhận tư vấn qua Zalo KTS",
        brochure_code_label: "Mã hồ sơ đồ án:",
        brochure_date_label: "Ngày phát hành:",
        brochure_architect_label: "Kiến trúc sư chủ trì:",
        brochure_page1_title: "1. Phối Cảnh & Đặc Tả Kiến Trúc",
        brochure_page2_title: "2. Mặt Bằng Kỹ Thuật & Công Năng Từng Tầng",
        brochure_page3_title: "3. Khái Toán Kinh Phí & Tiêu Chuẩn Thi Công",
        brochure_seal_text: "HỒ SƠ THIẾT KẾ DREAM HOUSE ARCHITECTURAL DESIGN",
        brochure_signature_title: "KTS. Võ Quốc Việt",

        // Hero Redesign & Ticker v8.8
        hero_badge_pill: "Đồ án kiến trúc & Khái toán 2026",
        hero_title_prefix: "Không gian sống",
        hero_title_suffix: "trong tầm tay bạn",
        hero_stat_projects_num: "150+",
        hero_stat_projects_label: "Đồ án thực tế",
        hero_stat_cad_num: "100%",
        hero_stat_cad_label: "Bản vẽ CAD Vector",
        hero_stat_rating_num: "4.9★",
        hero_stat_rating_label: "Gia chủ tin cậy",
        hero_stage_badge_3d: "Mô hình 3D tương tác 360°",
        hero_stage_explore: "Xem chi tiết & 3D →",
        ticker_item_1: "Thực tế ảo 3D & Three.js Interactive",
        ticker_item_2: "Bản vẽ kỹ thuật CAD Vector 1/100 TCXDVN",
        ticker_item_3: "Dự toán bóc tách diện tích quy đổi Sxd 2026",
        ticker_item_4: "Thước Lỗ Ban 3 dải đo & La bàn Bát Trạch",
        ticker_item_5: "Xuất hồ sơ Concept PDF Brochure 1-Click",

        // Sections Về Chúng Tôi, Quy Trình & Cảm Nhận v8.9
        nav_about: "Về chúng tôi",
        nav_workflow: "Quy trình",
        about_tagline: "Kiến trúc tinh hoa · Triết lý bền vững",
        about_title: "Kiến Tạo Không Gian Sống Đậm Bản Sắc & Vị Nhân Sinh",
        about_sub: "Dream House không chỉ xây nên những bức tường, chúng tôi kết tinh ước mơ, vi khí hậu bản địa và giải pháp thi công chuẩn mực cho từng tổ ấm.",
        about_lead_arch: "KTS. Võ Quốc Việt",
        about_lead_title: "Sáng lập & Chủ nhiệm thiết kế Dream House",
        about_quote: "“Một ngôi nhà hoàn mỹ phải là nơi gia chủ cảm nhận được sự bình yên ngay khi bước qua ngưỡng cửa, và bền vững cùng năm tháng mà không lỗi thời.”",
        about_stat_1_num: "350+",
        about_stat_1_label: "Đồ án hoàn thiện",
        about_stat_2_num: "98.5%",
        about_stat_2_label: "Dự toán chuẩn xác",
        about_stat_3_num: "63",
        about_stat_3_label: "Tỉnh thành kết nối",
        about_pillar1_title: "Tinh Hoa Hình Khối & Vi Khí Hậu",
        about_pillar1_desc: "Tối ưu hóa đối lưu gió tự nhiên, giếng trời trung tâm và ánh sáng nhiệt đới, giúp không gian luôn tràn ngập năng lượng sinh thái và tiết kiệm điện năng.",
        about_pillar2_title: "Phong Thủy Hoàng Đạo & Cung Mệnh",
        about_pillar2_desc: "Tích hợp nghiêm ngặt Thước Lỗ Ban 3 dải đo thông thủy và La bàn Bát Trạch hợp tuổi, đem lại vượng khí, tài lộc và sự an tâm trọn vẹn cho gia đạo.",
        about_pillar3_title: "Minh Bạch Dự Toán & Chuẩn TCXDVN",
        about_pillar3_desc: "Bóc tách chính xác 4 cấp độ vật tư 2026, đối chiếu mô hình 3D với bản vẽ CAD Vector 1/100, bảo vệ gia chủ khỏi rủi ro phát sinh chi phí ngoài hợp đồng.",

        workflow_tagline: "QUY TRÌNH BÀN GIAO KHÉP KÍN",
        workflow_title: "4 Bước Hiện Thực Hóa Ngôi Nhà Mơ Ước",
        workflow_sub: "Quy trình làm việc minh bạch, khoa học và chặt chẽ giúp gia chủ hoàn toàn thảnh thơi từ nét vẽ đầu tiên đến ngày nhận chìa khóa.",
        step1_num: "01",
        step1_title: "Khảo Sát & Khởi Tạo Ý Tưởng",
        step1_desc: "Lắng nghe nhu cầu sinh hoạt, đo đạc khu đất, xác định ngân sách dự toán mục tiêu và tra cứu hướng nhà phong thủy hợp tuổi.",
        step2_num: "02",
        step2_title: "Mô Hình 3D & Dạo Bước 360°",
        step2_desc: "Phác thảo không gian kiến trúc 3D tương tác thực tế, cho phép gia chủ trải nghiệm trực quan từng phòng ốc trước khi đặt viên gạch đầu tiên.",
        step3_num: "03",
        step3_title: "Bản Vẽ CAD & Bóc Tách Dự Toán",
        step3_desc: "Triển khai đầy đủ hồ sơ kỹ thuật kiến trúc, kết cấu, điện nước (MEP) và bảng khái toán chi tiết 4 hạng mục vật tư thi công 2026.",
        step4_num: "04",
        step4_title: "Xuất Hồ Sơ & Giám Sát Tác Giả",
        step4_desc: "Bàn giao hồ sơ in ấn A4 chuẩn thi công hoặc PDF Concept 1-Click, tư vấn cấp phép xây dựng và đồng hành giám sát tới ngày tân gia.",
        guarantee_badge: "CAM KẾT CHẤT LƯỢNG VÀNG",
        guarantee_1: "100% Không phát sinh chi phí ngoài dự toán thẩm duyệt",
        guarantee_2: "Bản vẽ kỹ thuật chuẩn TCXDVN 2026 dễ hiểu cho mọi đội thợ",
        guarantee_3: "Đồng hành giám sát tác giả trọn vẹn tới ngày tân gia",

        testimonials_tagline: "BẢO CHỨNG TỪ GIA CHỦ",
        testimonials_title: "Những Câu Chuyện Tổ Ấm Đã Thành Hình",
        testimonials_sub: "Sự hài lòng và niềm hạnh phúc của hơn 350+ gia đình là thước đo giá trị cao quý nhất của đội ngũ Dream House.",
        testi_1_name: "Anh Nguyễn Văn Tuấn",
        testi_1_loc: "KĐT Ecopark, Hà Nội",
        testi_1_model: "Nhà phố 3 tầng mặt tiền 5m",
        testi_1_comment: "“Nhờ bản vẽ 3D tương tác và bộ tính dự toán của Dream House, vợ chồng tôi nắm chắc từng đồng chi phí, thi công thực tế khớp 99% so với thiết kế ban đầu. Rất an tâm!”",
        testi_2_name: "Chị Trần Thị Mai",
        testi_2_loc: "Thủ Đức, TP. Hồ Chí Minh",
        testi_2_model: "Biệt thự vườn Mái Nhật",
        testi_2_comment: "“Phần tra cứu phong thủy Bát Trạch và thước Lỗ Ban đo cửa rất tỉ mỉ, người lớn trong nhà xem xong ai cũng ưng ý. Hồ sơ xuất PDF in A4 cực kỳ sắc nét để thợ xây làm theo.”",
        testi_3_name: "Bác Lê Hoàng Nam",
        testi_3_loc: "Cẩm Lệ, TP. Đà Nẵng",
        testi_3_model: "Nhà cấp 4 Mái Nhật",
        testi_3_comment: "“Làm nhà ở quê cứ sợ thợ làm sai ý, may có hồ sơ bản vẽ CAD của KTS Võ Quốc Việt rành mạch từng chi tiết. Giám sát từ xa nhiệt tình, nhà xây xong thoáng mát đúng ý nguyện.”"
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
        notif_tab_inquiries: "Client Leads",
        notif_tab_my_inquiries: "My Inquiries",
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
        admin_unauthorized: "Access denied. Admin privileges required. Redirecting to home...",

        // Interactive Cost Calculator
        nav_calculator: "Cost Estimator",
        hero_btn_calc: "Estimate Cost",
        calc_interactive_title: "Interactive Cost Estimator",
        calc_interactive_sub: "Real-time itemized estimate by floor area & finish tiers (2026)",
        calc_package_label: "Construction package:",
        calc_foundation_label: "Foundation engineering solution:",
        calc_area_badge: "equiv. m²",
        calc_total_estimate: "Estimated Total Investment:",
        calc_formula_detail: "Unit price:",
        calc_vat_note: "(Estimated at Q1/2026 market rates • All-inclusive turnkey labor)",
        calc_part_raw: "Structure & Core (52%)",
        calc_part_finish: "Finishes & Deco (33%)",
        calc_part_me: "MEP & Electrical (10%)",
        calc_part_mgmt: "Contingency & Mgmt (5%)",
        calc_btn_inquire_pkg: "Request Quote for this Package →",

        // Packages
        pkg_rough: "Rough & Labor",
        pkg_rough_desc: "Core structure + basic utilities",
        pkg_standard: "Standard",
        pkg_standard_desc: "Turnkey standard residential",
        pkg_premium: "Premium",
        pkg_premium_desc: "High-grade materials, 5yr warranty",
        pkg_luxury: "Luxury",
        pkg_luxury_desc: "Bespoke finishes & smart home",
        pkg_popular: "Popular",

        // Foundations
        fnd_single: "Single Footing (25%)",
        fnd_pile: "Piled Foundation (40%)",
        fnd_strip: "Strip Footing (50%)",
        fnd_raft: "Raft / Mat (75%)",

        // Quick Calculator Modal
        calc_modal_title: "Quick Home Construction Estimator",
        calc_modal_sub: "Enter your land plot dimensions to get an instant turnkey estimate",
        calc_input_width: "Land frontage width (m):",
        calc_input_depth: "Land plot depth (m):",
        calc_input_floors: "Number of floors:",
        calc_input_roof: "Roof structure type:",
        roof_flat_short: "RC Flat Roof (35%)",
        roof_hip_short: "Japanese Hip Roof (70%)",
        roof_gable_short: "Thai Gable Roof (70%)",
        roof_concrete_tile: "Concrete Tiled Roof (100%)",
        calc_land_area: "Plot area:",
        calc_total_gfa: "Total equivalent construction area:",
        calc_match_title: "Matched Dream House Designs:",
        calc_btn_view_match: "View this design",
        calc_btn_send_consult: "Send this estimate for Architect Consultation →",

        // Feature 2: Floor-by-Floor Layer Explorer
        floorplan_title: "Floor-by-Floor Functional Layout",
        floorplan_sub: "Detailed room dimensions & flow breakdown by architectural standards",
        tab_view_photo: "Perspectives",
        tab_view_3d: "3D Interactive",
        tab_view_floorplan: "Floor Plans",
        floor_1_name: "Floor 1 (Ground)",
        floor_2_name: "Floor 2 (Level 1)",
        floor_3_name: "Floor 3 (Level 2)",
        floor_roof_name: "Roof Plan",
        floor_btn_zoom: "Fullscreen Plan",
        floor_btn_iso3d: "3D Isometric View",
        floor_room_list_title: "Room dimensions & functional schedule:",
        floor_total_living: "Usable floor area this level:",
        floor_lightbox_hint: "Click outside or press Esc to close",
        room_living: "Living & Reception Hall",
        room_kitchen: "Kitchen & Dining",
        room_bedroom: "Bedroom",
        room_bed_master: "Master Suite",
        room_bath: "Bathroom (WC)",
        room_bath_master: "En-suite Bath",
        room_altar: "Altar / Sacred Room",
        room_balcony: "Balcony",
        room_terrace: "Terrace & BBQ",
        room_laundry: "Laundry & Utilities",
        room_garage: "Front Yard & Garage",
        room_skylight: "Airwell & Skylight",
        room_corridor: "Stair Hall & Circulation",

        // Feature 3: Localized Feng Shui & Lu Ban Architectural Ruler
        nav_fengshui: "Feng Shui",
        hero_btn_fengshui: "Feng Shui & Ruler",
        fengshui_title: "Feng Shui & Lu Ban Architectural Ruler",
        fengshui_sub: "Localized architectural Feng Shui & Bagua compass for Vietnamese residences",
        fengshui_tab_luban: "Online Lu Ban Ruler",
        fengshui_tab_battrach: "Bagua & House Directions",
        luban_unit_mm: "Millimeters (mm)",
        luban_unit_cm: "Centimeters (cm)",
        luban_input_placeholder: "Enter dimension...",
        luban_ruler_522: "52.2 cm Ruler: Clear Opening (Doors & Ceiling Heights)",
        luban_ruler_429: "42.9 cm Ruler: Solid Dimensions (Kitchen, Stairs, Furniture)",
        luban_ruler_388: "38.8 cm Ruler: Sacred & Altar Dimensions",
        luban_presets_title: "Common auspicious architectural dimensions:",
        luban_preset_door1: "Single Door (810 × 2120 mm)",
        luban_preset_door2: "Double Door (1330 × 2120 mm)",
        luban_preset_door4: "4-Panel Door (2550 × 2620 mm)",
        luban_preset_altar: "Altar Table (1270 × 610 mm)",
        luban_preset_height: "Ground Floor Height (3600 mm)",
        luban_result_title: "Dimension Feng Shui Analysis:",
        luban_status_good: "AUSPICIOUS (GOOD)",
        luban_status_bad: "INAUSPICIOUS (AVOID)",
        battrach_birth_year: "Owner Birth Year (Solar):",
        battrach_gender: "Gender:",
        battrach_gender_male: "Male (Owner)",
        battrach_gender_female: "Female (Owner)",
        battrach_btn_calc: "Analyze Feng Shui",
        battrach_result_title: "Bagua Natal Chart Breakdown:",
        battrach_can_chi: "Lunar Zodiac & Element:",
        battrach_cung_phi: "Kua / Trigram:",
        battrach_group: "Bagua Group:",
        battrach_group_east: "East Kua (Favorable: East, SE, South, North)",
        battrach_group_west: "West Kua (Favorable: West, NW, SW, NE)",
        battrach_good_dirs: "4 Favorable Directions (Prosperity & Vitality):",
        battrach_bad_dirs: "4 Inauspicious Directions (Avoid or Remediate):",
        battrach_rule_door: "Main Entrance & Balcony:",
        battrach_rule_altar: "Altar Orientation:",
        battrach_rule_kitchen: "Kitchen Placement (Sit Bad, Face Good):",
        battrach_rule_bed: "Bed Orientation:",
        battrach_btn_send_consult: "Send Feng Shui data for Architect Consultation →",
        detail_fengshui_title: "Feng Shui & Lu Ban Guidance",
        detail_fengshui_desc: "Designed in harmony with Lu Ban auspicious dimensions and Bagua directions.",
        detail_btn_open_fengshui: "Open Feng Shui & Lu Ban Tool →",

        // Feature 4: Side-by-Side Compare
        compare_title: "Side-by-Side Design Comparison",
        compare_sub: "Visual head-to-head comparison of dimensions, layout, specs and cost estimates",
        compare_dock_title: "Compare Designs",
        compare_dock_empty: "Select 2 to 3 designs to compare",
        compare_btn_action: "Compare Now",
        compare_btn_clear: "Clear All",
        compare_btn_add: "Compare",
        compare_btn_added: "In Comparison",
        compare_limit_reached: "You can compare up to 3 designs at a time",
        compare_need_two: "Please select at least 2 designs to compare head-to-head",
        compare_diff_toggle: "Highlight differences only",
        compare_sec_general: "General Architecture",
        compare_sec_specs: "Dimensions & Scale",
        compare_sec_rooms: "Functional Room Schedule",
        compare_sec_cost: "2026 Estimated Budget",
        compare_sec_fengshui: "Feng Shui Harmony",
        compare_row_type: "House Category",
        compare_row_dims: "Width × Depth",
        compare_row_land_area: "Land Footprint",
        compare_row_gfa: "Total Equivalent Construction Area",
        compare_row_floors: "Floors",
        compare_row_roof: "Roof Architectural Style",
        compare_row_bedrooms: "Bedrooms",
        compare_row_bathrooms: "Bathrooms (WC)",
        compare_row_living: "Living Room",
        compare_row_kitchen: "Kitchen & Dining",
        compare_row_balcony: "Balcony / Loggia",
        compare_row_altar: "Sacred Altar Room",
        compare_row_garage: "Garage / Parking",
        compare_row_skylight: "Airwell & Skylight",
        compare_row_price: "Estimated Total Budget",
        compare_row_unit_cost: "Average Unit Rate",
        compare_row_direction: "Recommended Orientation",
        compare_row_kua: "Compatible Bagua Group",
        compare_btn_view_detail: "View Full Details",
        compare_btn_select_this: "Select This & Consult →",
        detail_btn_add_compare: "⚖️ Add to Compare",
        detail_btn_remove_compare: "✓ In Compare List",

        // Feature 5: Download Concept PDF Brochure
        detail_btn_export_pdf: "📄 Download Concept PDF",
        brochure_title: "Executive Architectural Concept Dossier",
        brochure_sub: "Curated architectural concept, CAD floor layouts & 2026 cost estimation breakdown",
        brochure_btn_print: "Print Dossier / Save as PDF (A4)",
        brochure_btn_zalo: "Consult with Lead Architect on Zalo",
        brochure_code_label: "Dossier ID:",
        brochure_date_label: "Issue Date:",
        brochure_architect_label: "Lead Architect:",
        brochure_page1_title: "1. Perspectives & Architectural Specs",
        brochure_page2_title: "2. Technical Floor Plans & Room Schedule",
        brochure_page3_title: "3. Cost Estimates & Material Standards",
        brochure_seal_text: "CERTIFIED DREAM HOUSE ARCHITECTURAL DESIGN",
        brochure_signature_title: "Arch. Vo Quoc Viet",

        // Hero Redesign & Ticker v8.8
        hero_badge_pill: "Architectural Dossiers & 2026 Estimates",
        hero_title_prefix: "Living space",
        hero_title_suffix: "within your reach",
        hero_stat_projects_num: "150+",
        hero_stat_projects_label: "Real Projects",
        hero_stat_cad_num: "100%",
        hero_stat_cad_label: "Vector CAD Plans",
        hero_stat_rating_num: "4.9★",
        hero_stat_rating_label: "Homeowner Trust",
        hero_stage_badge_3d: "Interactive 3D 360°",
        hero_stage_explore: "View Details & 3D →",
        ticker_item_1: "Interactive 3D Three.js Spatial Experience",
        ticker_item_2: "TCXDVN Standard 1/100 Vector CAD Blueprints",
        ticker_item_3: "Transparent 2026 Equivalent Area Cost Engine",
        ticker_item_4: "3-Tier Lu Ban Ruler & 8-Mansion Feng Shui",
        ticker_item_5: "1-Click Architectural Concept PDF Dossier",

        // Sections Về Chúng Tôi, Quy Trình & Cảm Nhận v8.9
        nav_about: "About Us",
        nav_workflow: "Workflow",
        about_tagline: "ARCHITECTURAL EXCELLENCE · TIMELESS PHILOSOPHY",
        about_title: "Crafting Human-Centric Spaces of Timeless Distinction",
        about_sub: "Dream House doesn't merely design walls; we synthesize personal aspirations, tropical microclimates, and rigorous construction engineering for each home.",
        about_lead_arch: "Arch. Vo Quoc Viet",
        about_lead_title: "Founder & Lead Design Architect",
        about_quote: "“A truly perfect home is where the soul finds serenity at the threshold, enduring gracefully across generations without ever fading out of style.”",
        about_stat_1_num: "350+",
        about_stat_1_label: "Completed Dossiers",
        about_stat_2_num: "98.5%",
        about_stat_2_label: "Cost Accuracy",
        about_stat_3_num: "63",
        about_stat_3_label: "Provinces Covered",
        about_pillar1_title: "Form Mastery & Microclimate",
        about_pillar1_desc: "Optimizing natural cross-ventilation, central skylights, and ambient daylight to keep interiors thermally comfortable while drastically cutting energy use.",
        about_pillar2_title: "Feng Shui Harmony & Auspicious Measure",
        about_pillar2_desc: "Strict compliance with 3-tier Lu Ban auspicious openings and 8-Mansion Feng Shui alignments, nurturing tranquility, health, and family prosperity.",
        about_pillar3_title: "Transparent Cost & TCXDVN Standards",
        about_pillar3_desc: "Precise 2026 4-tier material breakdowns synchronized with 1/100 vector CAD blueprints, ensuring zero unapproved cost overruns.",

        workflow_tagline: "STANDARDIZED WORKFLOW",
        workflow_title: "4 Steps to Realize Your Dream Living Space",
        workflow_sub: "A transparent, structured methodology providing complete peace of mind from the initial concept to turnkey handover.",
        step1_num: "01",
        step1_title: "Site Survey & Spatial Concept",
        step1_desc: "Understanding family lifestyle, land topography, target investment budget, and initial Feng Shui orientation.",
        step2_num: "02",
        step2_title: "Interactive 3D Walkthrough",
        step2_desc: "Crafting realistic 3D spatial models allowing homeowners to explore every room in 360° before laying the first brick.",
        step3_num: "03",
        step3_title: "Vector CAD & Cost Breakdown",
        step3_desc: "Developing complete structural, MEP, and architectural blueprints alongside transparent 2026 turnkey cost estimations.",
        step4_num: "04",
        step4_title: "Dossier Export & Site Oversight",
        step4_desc: "Handing over certified A4 print dossiers or 1-click PDF brochures, aiding permit filing and providing design oversight.",
        guarantee_badge: "GOLDEN QUALITY COMMITMENT",
        guarantee_1: "100% Guaranteed zero hidden cost surprises",
        guarantee_2: "TCXDVN 2026 standard plans clear for any contractor",
        guarantee_3: "End-to-end architectural oversight until housewarming",

        testimonials_tagline: "CLIENT VOICES & TRUST",
        testimonials_title: "Real Stories of Transformed Homes",
        testimonials_sub: "The lasting joy and satisfaction of over 350+ homeowners is our highest measure of excellence.",
        testi_1_name: "Mr. Nguyen Van Tuan",
        testi_1_loc: "Ecopark Urban Area, Hanoi",
        testi_1_model: "3-Story 5m Townhouse",
        testi_1_comment: "“Thanks to Dream House's interactive 3D and cost engine, we budgeted down to the penny. The actual build matched 99% of the initial concept. Truly peaceful!”",
        testi_2_name: "Mrs. Tran Thi Mai",
        testi_2_loc: "Thu Duc, Ho Chi Minh City",
        testi_2_model: "Japanese Garden Villa",
        testi_2_comment: "“The 8-Mansion Feng Shui and Lu Ban door measurements were incredibly thorough; our elder relatives loved it. The 1-click PDF brochure printed out razor-sharp for our builder.”",
        testi_3_name: "Mr. Le Hoang Nam",
        testi_3_loc: "Cam Le, Da Nang City",
        testi_3_model: "Modern Hip Roof Bungalow",
        testi_3_comment: "“Building in my hometown felt stressful until we got Arch. Vo Quoc Viet's crystal-clear CAD plans. Remote guidance was superb; the house is breezy and beautiful.”"
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

