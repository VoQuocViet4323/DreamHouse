-- ==============================================================================
-- 06_set_admin_role.sql: Cấp quyền Quản trị viên (Admin) cho tài khoản
-- Chạy script này trong Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Cập nhật role = 'admin' trong bảng public.profiles
UPDATE public.profiles
SET 
    role = 'admin',
    updated_at = timezone('utc'::text, now())
WHERE 
    id = '6161ca01-621a-4281-9b21-05483d2a3a0e'
    OR LOWER(username) = 'admin'
    OR id IN (
        SELECT id FROM auth.users 
        WHERE email = 'admin@dreamhouse.internal' 
           OR LOWER(raw_user_meta_data->>'username') = 'admin'
    );

-- 2. Đồng bộ app_metadata và user_metadata trong auth.users
UPDATE auth.users
SET 
    raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb,
    raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE 
    id = '6161ca01-621a-4281-9b21-05483d2a3a0e'
    OR email = 'admin@dreamhouse.internal';

-- 3. Kiểm tra xác nhận kết quả phân quyền
SELECT 
    p.id,
    p.full_name,
    p.username,
    p.role,
    u.email,
    public.is_admin() AS current_session_is_admin
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';
