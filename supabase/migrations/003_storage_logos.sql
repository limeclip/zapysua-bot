-- Bucket для логотипів майстрів (виконати в Supabase SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Публічне читання логотипів
CREATE POLICY "logos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Завантаження лише через service_role (API на бекенді)
-- service_role обходить RLS автоматично
