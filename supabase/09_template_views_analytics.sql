-- ==============================================================================
-- 09_TEMPLATE_VIEWS_ANALYTICS.SQL
-- THEO DÕI LƯỢT XEM MẪU NHÀ THỜI GIAN THỰC & PHÂN TÍCH TỶ LỆ QUAN TÂM / YÊU THÍCH
-- ==============================================================================

-- 1. Bổ sung cột view_count vào bảng templates để lưu tổng số lượt xem chi tiết
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- 2. Đánh chỉ mục (Index) tăng tốc độ truy vấn và sắp xếp bảng xếp hạng xem nhiều nhất
CREATE INDEX IF NOT EXISTS idx_templates_view_count ON public.templates(view_count DESC);

-- 3. Tạo hàm RPC increment_template_view
-- Chạy với đặc quyền SECURITY DEFINER để cả khách vãng lai (anon) và người dùng đã đăng nhập (authenticated)
-- đều có thể tăng lượt xem an toàn khi mở xem chi tiết mẫu nhà mà không vi phạm RLS.
CREATE OR REPLACE FUNCTION public.increment_template_view(t_id UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    UPDATE public.templates 
    SET view_count = COALESCE(view_count, 0) + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = t_id;
END;
$$;

-- 4. Cấp quyền thực thi hàm RPC cho cả anon và authenticated
GRANT EXECUTE ON FUNCTION public.increment_template_view(UUID) TO anon, authenticated;

-- 5. Cho phép Quản trị viên (Admin) xem toàn bộ bảng favorites để tính tổng lượt yêu thích cho từng mẫu nhà
DROP POLICY IF EXISTS "Admins can view all favorites for analytics" ON public.favorites;
CREATE POLICY "Admins can view all favorites for analytics"
ON public.favorites
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 6. Ghi chú tài liệu hệ thống
COMMENT ON COLUMN public.templates.view_count IS 'Tổng số lượt khách hàng mở xem chi tiết và mô hình 3D thời gian thực';
COMMENT ON FUNCTION public.increment_template_view(UUID) IS 'Tăng bộ đếm lượt xem cho mẫu nhà tương ứng một cách nguyên tử (atomic)';
