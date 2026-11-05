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

