-- ==============================================================================
-- 04_sample_data.sql: 6 Mẫu nhà ban đầu và dữ liệu minh hoạ
-- Chạy script này sau khi hoàn tất tạo bảng và policies.
-- ==============================================================================

-- Xoá dữ liệu mẫu cũ nếu có trùng slug
DELETE FROM public.templates WHERE slug IN (
    'nha-pho-hien-dai-np01',
    'nha-pho-mai-thai-np02',
    'biet-thu-vuon-bt01',
    'biet-thu-tan-co-dien-bt02',
    'nha-cap-4-mai-nhat-nc01',
    'nha-cap-4-chu-l-nc02'
);

INSERT INTO public.templates (
    slug, type, name_vi, name_en, 
    description_vi, description_en, 
    style_vi, style_en, 
    width_m, depth_m, floors, roof, has_balcony, 
    rooms_vi, rooms_en, 
    gfa_m2, cost_estimate_vnd, 
    photo_path, model_path, 
    published, sort_order
) VALUES
(
    'nha-pho-hien-dai-np01',
    'nha-pho',
    'Nhà Phố Hiện Đại 3 Tầng Mặt Tiền 5m',
    '3-Story Modern Townhouse (5m Frontage)',
    'Thiết kế tối ưu ánh sáng tự nhiên với giếng trời trung tâm, ban công kính và lam chắn nắng thông minh.',
    'Optimized for natural daylight with a central skylight, glass railings, and elegant sun louvers.',
    'Hiện đại tối giản',
    'Modern Minimalist',
    5.0, 16.0, 3, 'flat', true,
    '1 PK, 1 Bếp, 3 PN, 3 WC, 1 Phòng thờ, Sân thượng',
    '1 Living, 1 Kitchen, 3 Beds, 3 Baths, 1 Altar room, Terrace',
    220.0, 1850000000,
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    '', -- Để rỗng: Dùng Three.js dựng khối 3D parametric tạm
    true, 1
),
(
    'nha-pho-mai-thai-np02',
    'nha-pho',
    'Nhà Phố Mái Thái Sang Trọng 2 Tầng',
    '2-Story Gable Roof Townhouse',
    'Kiến trúc mái dốc thanh lịch, đối lưu không khí cực tốt, phù hợp khí hậu nhiệt đới nắng mưa nhiều.',
    'Graceful gable roofline providing excellent airflow and thermal comfort in tropical climates.',
    'Mái Thái Á Đông',
    'Asian Gable',
    6.0, 15.0, 2, 'gable', true,
    '1 PK, 1 Bếp, 3 PN, 2 WC, Gara xe',
    '1 Living, 1 Kitchen, 3 Beds, 2 Baths, Car garage',
    170.0, 1450000000,
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    '',
    true, 2
),
(
    'biet-thu-vuon-bt01',
    'biet-thu',
    'Biệt Thự Vườn Nghỉ Dưỡng Mái Nhật',
    'Japanese Hip Roof Garden Villa',
    'Không gian mở chan hoà cùng sân vườn rộng rãi, hồ cá Koi và hiên uống trà thư giãn cuối tuần.',
    'Open-concept layout integrating landscaped gardens, a Koi pond, and serene outdoor veranda.',
    'Biệt thự vườn sinh thái',
    'Eco Garden Villa',
    12.0, 18.0, 2, 'hip', true,
    '1 Đại sảnh, 1 Bếp & Ăn, 4 PN Master, 4 WC, Phòng sinh hoạt chung',
    '1 Great Hall, 1 Kitchen & Dining, 4 Master Suites, 4 Baths, Family Lounge',
    380.0, 3400000000,
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
    '',
    true, 3
),
(
    'biet-thu-tan-co-dien-bt02',
    'biet-thu',
    'Biệt Thự Tân Cổ Điển Châu Âu 3 Tầng',
    '3-Story Neo-Classical European Villa',
    'Đường phào chỉ sắc sảo, vòm cột Corinthian bề thế khẳng định đẳng cấp gia chủ.',
    'Refined moldings and stately classical columns reflecting timeless grandeur and architectural prestige.',
    'Tân cổ điển',
    'Neo-Classical',
    10.0, 16.0, 3, 'hip', true,
    '1 Phòng khách lớn, Bếp đảo, 5 PN, 5 WC, Hầm rượu & Cigar',
    '1 Grand Parlor, Island Kitchen, 5 Beds, 5 Baths, Wine & Cigar Lounge',
    420.0, 4800000000,
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    '',
    true, 4
),
(
    'nha-cap-4-mai-nhat-nc01',
    'nha-cap-4',
    'Nhà Cấp 4 Mái Nhật Tiện Nghi Tiết Kiệm',
    'Modern 1-Story Hip Roof Country House',
    'Mẫu nhà 1 tầng kinh tế, bố trí công năng liên hoàn ấm cúng cho gia đình trẻ hoặc bố mẹ an dưỡng.',
    'Cost-effective single-level home with a continuous warm flow, ideal for countryside retreat.',
    'Ngoại ô hiện đại',
    'Modern Countryside',
    8.5, 14.0, 1, 'hip', false,
    '1 PK kết hợp P.Thờ, 1 Bếp, 3 PN, 2 WC',
    '1 Living + Altar, 1 Kitchen, 3 Beds, 2 Baths',
    115.0, 850000000,
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    '',
    true, 5
),
(
    'nha-cap-4-chu-l-nc02',
    'nha-cap-4',
    'Nhà Cấp 4 Chữ L Mái Thái Truyền Thống',
    'Traditional L-Shaped Country Bungalow',
    'Dáng nhà chữ L quen thuộc tạo khoảng sân trước thoáng đãng đậu xe và tổ chức tiệc BBQ gia đình.',
    'Classic L-shaped layout creating an expansive courtyard for parking and outdoor gatherings.',
    'Mái dốc truyền thống',
    'Traditional Gable',
    9.0, 15.0, 1, 'gable', false,
    '1 PK, 1 Bếp & Ăn, 3 PN, 2 WC, Sân phơi',
    '1 Living, 1 Kitchen & Dining, 3 Beds, 2 Baths, Laundry Yard',
    125.0, 920000000,
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    '',
    true, 6
);

