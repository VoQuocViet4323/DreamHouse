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

