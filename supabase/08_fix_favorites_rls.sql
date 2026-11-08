-- ==============================================================================
-- 08_FIX_FAVORITES_RLS.SQL
-- KHẮC PHỤC TRIỆT ĐỂ LỖI 403 (FORBIDDEN) KHI POST /rest/v1/favorites
-- ==============================================================================

-- 1. Bổ sung Policy UPDATE cho authenticated user (Bắt buộc cho lệnh PostgREST Upsert / ON CONFLICT)
DROP POLICY IF EXISTS "Users can update their own favorites" ON public.favorites;
CREATE POLICY "Users can update their own favorites"
ON public.favorites
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Đảm bảo toàn bộ quyền truy vấn trên bảng favorites cho authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;

-- 3. Bổ sung ghi chú kiểm tra
COMMENT ON TABLE public.favorites IS 'Danh sách mẫu nhà yêu thích của người dùng với đầy đủ RLS (SELECT, INSERT, UPDATE, DELETE)';

