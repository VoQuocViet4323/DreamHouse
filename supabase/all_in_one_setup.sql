-- ==============================================================================
-- 01_schema.sql: Khởi tạo bảng dữ liệu và Trigger đồng bộ Profile người dùng
-- Chạy script này đầu tiên trong Supabase SQL Editor.
-- ==============================================================================

-- 1. BẢNG PROFILES (Mở rộng từ auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bổ sung cột phone nếu bảng đã tồn tại từ trước
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Bật Row Level Security cho profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. HÀM & TRIGGER TỰ ĐỘNG TẠO PROFILE KHI CÓ USER MỚI (Email hoặc Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            ''
        ),
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. BẢNG TEMPLATES (Mẫu thiết kế nhà)
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('nha-pho', 'biet-thu', 'nha-cap-4')),
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_vi TEXT DEFAULT '',
    description_en TEXT DEFAULT '',
    style_vi TEXT DEFAULT '',
    style_en TEXT DEFAULT '',
    width_m NUMERIC(5,2) NOT NULL DEFAULT 5.0,
    depth_m NUMERIC(5,2) NOT NULL DEFAULT 15.0,
    floors INTEGER NOT NULL DEFAULT 1 CHECK (floors >= 1),
    roof TEXT NOT NULL DEFAULT 'flat' CHECK (roof IN ('flat', 'hip', 'gable')),
    has_balcony BOOLEAN NOT NULL DEFAULT false,
    rooms_vi TEXT DEFAULT '',
    rooms_en TEXT DEFAULT '',
    gfa_m2 NUMERIC(7,2) NOT NULL DEFAULT 75.0,
    cost_estimate_vnd BIGINT NOT NULL DEFAULT 0,
    photo_path TEXT DEFAULT '',
    model_path TEXT DEFAULT '', -- Đường dẫn file .glb trong bucket template-models (cho phép rỗng)
    published BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_templates_published ON public.templates(published);
CREATE INDEX IF NOT EXISTS idx_templates_sort_order ON public.templates(sort_order ASC, created_at DESC);

-- 4. BẢNG TEMPLATE_IMAGES (Thư viện ảnh chi tiết của mẫu nhà)
CREATE TABLE IF NOT EXISTS public.template_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL, -- Đường dẫn file trong bucket template-images
    caption_vi TEXT DEFAULT '',
    caption_en TEXT DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.template_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_template_images_template_id ON public.template_images(template_id);

-- 5. BẢNG FAVORITES (Danh sách mẫu yêu thích của từng khách/thành viên)
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, template_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 6. BẢNG INQUIRIES (Yêu cầu tư vấn & báo giá)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(150) NOT NULL, -- SĐT hoặc Email
    message VARCHAR(2000) NOT NULL,
    lang VARCHAR(5) NOT NULL DEFAULT 'vi' CHECK (lang IN ('vi', 'en')),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- ==============================================================================
-- 02_security.sql: Thiết lập Hàm kiểm tra Admin và Chính sách bảo mật (RLS Policies)
-- Chạy script này sau khi đã chạy 01_schema.sql
-- ==============================================================================

-- 1. HÀM KIỂM TRA ADMIN (SECURITY DEFINER ĐỂ TRÁNH ĐỆ QUY KHI QUERY PROFILES)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Cấp quyền thực thi hàm cho authenticated và anon
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- 2. POLICIES CHO BẢNG PROFILES
DROP POLICY IF EXISTS "Profiles are readable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles are readable by owner or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    -- Ngăn chặn người dùng tự thăng chức admin nếu không phải là admin sẵn
    AND (role = 'user' OR public.is_admin())
);


-- 3. POLICIES CHO BẢNG TEMPLATES
DROP POLICY IF EXISTS "Public can view published templates" ON public.templates;
CREATE POLICY "Public can view published templates"
ON public.templates
FOR SELECT
TO anon, authenticated
USING (
    published = true OR public.is_admin()
);

DROP POLICY IF EXISTS "Only admin can insert templates" ON public.templates;
CREATE POLICY "Only admin can insert templates"
ON public.templates
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can update templates" ON public.templates;
CREATE POLICY "Only admin can update templates"
ON public.templates
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can delete templates" ON public.templates;
CREATE POLICY "Only admin can delete templates"
ON public.templates
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 4. POLICIES CHO BẢNG TEMPLATE_IMAGES
DROP POLICY IF EXISTS "Public can view template images" ON public.template_images;
CREATE POLICY "Public can view template images"
ON public.template_images
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.templates t 
        WHERE t.id = template_images.template_id 
          AND (t.published = true OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Only admin can insert template images" ON public.template_images;
CREATE POLICY "Only admin can insert template images"
ON public.template_images
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can update template images" ON public.template_images;
CREATE POLICY "Only admin can update template images"
ON public.template_images
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can delete template images" ON public.template_images;
CREATE POLICY "Only admin can delete template images"
ON public.template_images
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 5. POLICIES CHO BẢNG FAVORITES
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
CREATE POLICY "Users can insert their own favorites"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- 6. POLICIES CHO BẢNG INQUIRIES
-- Ai cũng có thể gửi liên hệ tư vấn (kể cả khách vãng lai anon)
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON public.inquiries;
CREATE POLICY "Anyone can insert inquiries"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
    char_length(name) >= 2 AND char_length(name) <= 100
    AND char_length(contact) >= 5 AND char_length(contact) <= 150
    AND char_length(message) >= 5 AND char_length(message) <= 2000
);

-- Chỉ admin mới có quyền xem danh sách yêu cầu tư vấn
DROP POLICY IF EXISTS "Only admin can view inquiries" ON public.inquiries;
CREATE POLICY "Only admin can view inquiries"
ON public.inquiries
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Chỉ admin mới có quyền đổi trạng thái status ('new' -> 'handled')
DROP POLICY IF EXISTS "Only admin can update inquiries" ON public.inquiries;
CREATE POLICY "Only admin can update inquiries"
ON public.inquiries
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can delete inquiries" ON public.inquiries;
CREATE POLICY "Only admin can delete inquiries"
ON public.inquiries
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 03_storage.sql: Cấu hình Storage Buckets và Policies cho Supabase Storage
-- Chạy script này sau 02_security.sql
-- ==============================================================================

-- 1. TẠO CÁC BUCKET (template-images & template-models)
-- Cho phép đọc công khai (public = true)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
    'template-images', 
    'template-images', 
    true, 
    3145728, -- 3 MB (3 * 1024 * 1024)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
),
(
    'template-models', 
    'template-models', 
    true, 
    10485760, -- 10 MB (10 * 1024 * 1024)
    ARRAY['model/gltf-binary', 'application/octet-stream', 'model/gltf+json']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


-- 2. POLICIES CHO STORAGE.OBJECTS (BẢO VỆ TẬP TIN)

-- A. Cho phép mọi người (anon & authenticated) tải/xem ảnh và mô hình 3D
DROP POLICY IF EXISTS "Public can view template-images" ON storage.objects;
CREATE POLICY "Public can view template-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'template-images');

DROP POLICY IF EXISTS "Public can view template-models" ON storage.objects;
CREATE POLICY "Public can view template-models"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'template-models');

-- B. Chỉ Admin mới có quyền Upload (INSERT) file vào 2 bucket này
DROP POLICY IF EXISTS "Admin can upload template-images" ON storage.objects;
CREATE POLICY "Admin can upload template-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'template-images' AND public.is_admin()
);

DROP POLICY IF EXISTS "Admin can upload template-models" ON storage.objects;
CREATE POLICY "Admin can upload template-models"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'template-models' AND public.is_admin()
);

-- C. Chỉ Admin mới có quyền Sửa/Ghi đè (UPDATE)
DROP POLICY IF EXISTS "Admin can update template-images" ON storage.objects;
CREATE POLICY "Admin can update template-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'template-images' AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'template-images' AND public.is_admin()
);

DROP POLICY IF EXISTS "Admin can update template-models" ON storage.objects;
CREATE POLICY "Admin can update template-models"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'template-models' AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'template-models' AND public.is_admin()
);

-- D. Chỉ Admin mới có quyền Xoá (DELETE)
DROP POLICY IF EXISTS "Admin can delete template-images" ON storage.objects;
CREATE POLICY "Admin can delete template-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'template-images' AND public.is_admin()
);

DROP POLICY IF EXISTS "Admin can delete template-models" ON storage.objects;
CREATE POLICY "Admin can delete template-models"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'template-models' AND public.is_admin()
);

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

