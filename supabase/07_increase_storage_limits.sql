-- ==============================================================================
-- 07_increase_storage_limits.sql: Nâng giới hạn dung lượng Storage Buckets cho Supabase
-- Hỗ trợ upload file 3D SketchUp (.skp), GLB/GLTF, OBJ lên đến 100MB
-- và ảnh render kiến trúc chất lượng cao lên đến 25MB
-- ==============================================================================

-- 1. Cập nhật giới hạn dung lượng cho bucket 'template-models'
-- file_size_limit: 104857600 bytes = 100MB
-- allowed_mime_types = NULL: gỡ bỏ ràng buộc MIME để chấp nhận cả file .skp, .glb, .gltf, .obj, .zip,...
UPDATE storage.buckets
SET 
    file_size_limit = 104857600,
    allowed_mime_types = NULL
WHERE id = 'template-models';

-- Nếu bucket chưa tồn tại thì tạo mới
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('template-models', 'template-models', true, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 104857600,
    allowed_mime_types = NULL;

-- 2. Cập nhật giới hạn dung lượng cho bucket 'template-images'
-- file_size_limit: 26214400 bytes = 25MB
UPDATE storage.buckets
SET 
    file_size_limit = 26214400,
    allowed_mime_types = NULL
WHERE id = 'template-images';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('template-images', 'template-images', true, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 26214400,
    allowed_mime_types = NULL;

-- 3. Kiểm tra kết quả
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('template-models', 'template-images');

