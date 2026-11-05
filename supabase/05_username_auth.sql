-- ==============================================================================
-- 05_username_auth.sql: Hỗ trợ Đăng ký & Đăng nhập bằng Tên tài khoản (Username)
-- Chạy script này trong Supabase SQL Editor để kích hoạt và sửa lỗi 500 khi đăng nhập.
-- ==============================================================================

-- BƯỚC 0: SỬA CHỮA NGAY CÁC TÀI KHOẢN ĐÃ TẠO (NHƯ 'vietvq') BỊ NULL CỘT TOKEN TRONG AUTH.USERS
-- (Khắc phục triệt để lỗi 500: "Database error querying schema" của Supabase GoTrue v2)
UPDATE auth.users
SET
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    is_sso_user = COALESCE(is_sso_user, false),
    is_anonymous = COALESCE(is_anonymous, false),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb)
WHERE
    confirmation_token IS NULL
    OR recovery_token IS NULL
    OR email_change_token_new IS NULL
    OR email_change IS NULL
    OR email_change_token_current IS NULL
    OR email_change_confirm_status IS NULL
    OR phone_change IS NULL
    OR phone_change_token IS NULL
    OR reauthentication_token IS NULL
    OR is_sso_user IS NULL
    OR is_anonymous IS NULL;

-- Bổ sung bản ghi định danh vào auth.identities cho các tài khoản đã tạo nhưng chưa có identity
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    u.id::text,
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
    ),
    'email',
    now(),
    COALESCE(u.created_at, now()),
    COALESCE(u.updated_at, now())
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- 1. Bổ sung cột username vào bảng profiles nếu chưa có
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(LOWER(username));

-- Đồng bộ username cho các profile đã tạo trước đó
UPDATE public.profiles p
SET username = COALESCE(
    p.username,
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id AND p.username IS NULL;

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

-- 3. HÀM RPC ĐĂNG KÝ USERNAME TRỰC TIẾP VÀO AUTH.USERS & AUTH.IDENTITIES CHUẨN GOTRUE V2
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

    -- Sinh UUID và mã hóa mật khẩu theo chuẩn bcrypt (cost 10) của Supabase GoTrue
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

    -- Chèn đầy đủ các cột non-null mà GoTrue v2 yêu cầu khi scan bảng auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        email_change_confirm_status,
        phone_change,
        phone_change_token,
        reauthentication_token,
        raw_app_meta_data,
        raw_user_meta_data,
        is_sso_user,
        is_anonymous,
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
        now(),
        '',
        '',
        '',
        '',
        '',
        0,
        '',
        '',
        '',
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_email,
            'username', p_username,
            'full_name', v_display_name,
            'email_verified', true,
            'phone_verified', false
        ),
        false,
        false,
        now(),
        now()
    );

    -- Chèn bản ghi định danh vào auth.identities (bắt buộc cho GoTrue v2 khi đăng nhập)
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        jsonb_build_object(
            'sub', v_user_id::text,
            'email', v_email,
            'email_verified', true,
            'phone_verified', false
        ),
        'email',
        now(),
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
