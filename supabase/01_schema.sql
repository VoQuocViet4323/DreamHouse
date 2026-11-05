-- ==============================================================================
-- 01_schema.sql: Khởi tạo bảng dữ liệu và Trigger đồng bộ Profile người dùng
-- Chạy script này đầu tiên trong Supabase SQL Editor.
-- ==============================================================================

-- 1. BẢNG PROFILES (Mở rộng từ auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    username TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bổ sung cột phone và username nếu bảng đã tồn tại từ trước
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(LOWER(username));

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
    INSERT INTO public.profiles (id, full_name, username, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'username',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'username',
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
        username = COALESCE(EXCLUDED.username, public.profiles.username),
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

