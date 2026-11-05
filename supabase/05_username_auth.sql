-- ==============================================================================
-- 05_username_auth.sql: Hỗ trợ Đăng ký & Đăng nhập bằng Tên tài khoản (Username)
-- Chạy script này trong Supabase SQL Editor để kích hoạt tính năng tài khoản không cần Email.
-- ==============================================================================

-- 1. Bổ sung cột username vào bảng profiles nếu chưa có
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(LOWER(username));

-- 2. Cập nhật Trigger tự động nạp username vào profile khi tạo user
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

-- 3. HÀM RPC ĐĂNG KÝ USERNAME TRỰC TIẾP VÀO AUTH.USERS (BỎ QUA GỬI EMAIL, KHÔNG DÍNH RATE LIMIT)
CREATE OR REPLACE FUNCTION public.register_user_by_username(
    p_username TEXT,
    p_password TEXT,
    p_full_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_encrypted_pw TEXT;
    v_display_name TEXT;
BEGIN
    -- Chuẩn hóa tên đăng nhập
    p_username := trim(lower(p_username));
    
    -- Kiểm tra độ dài username
    IF length(p_username) < 3 OR length(p_username) > 30 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản phải từ 3 đến 30 ký tự.');
    END IF;

    -- Kiểm tra ký tự hợp lệ (chữ cái không dấu, số, gạch dưới, gạch ngang hoặc dấu chấm)
    IF p_username !~ '^[a-z0-9_.-]+$' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản chỉ được chứa chữ cái, số, dấu gạch dưới hoặc chấm.');
    END IF;

    -- Kiểm tra độ dài mật khẩu
    IF length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Mật khẩu phải từ 6 ký tự trở lên.');
    END IF;

    v_email := p_username || '@dreamhouse.internal';
    v_display_name := COALESCE(NULLIF(trim(p_full_name), ''), p_username);

    -- Kiểm tra xem đã tồn tại user với email nội bộ này chưa
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tên tài khoản này đã được sử dụng. Vui lòng chọn tên khác!');
    END IF;

    -- Sinh UUID và mã hóa mật khẩu theo chuẩn bcrypt của Supabase
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Chèn trực tiếp tài khoản vào auth.users với email_confirmed_at = now()
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        v_encrypted_pw,
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object(
            'username', p_username,
            'full_name', v_display_name
        ),
        now(),
        now()
    );

    -- Tạo hoặc cập nhật thông tin trong bảng public.profiles
    INSERT INTO public.profiles (id, full_name, username, avatar_url, role)
    VALUES (
        v_user_id,
        v_display_name,
        p_username,
        '',
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true, 
        'user_id', v_user_id, 
        'username', p_username, 
        'email', v_email,
        'message', 'Đăng ký tài khoản thành công!'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Cấp quyền gọi hàm cho cả khách vãng lai (anon) và người dùng đã xác thực (authenticated)
GRANT EXECUTE ON FUNCTION public.register_user_by_username(TEXT, TEXT, TEXT) TO anon, authenticated;
