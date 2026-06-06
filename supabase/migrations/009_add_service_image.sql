ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url text;

-- Bucket для зображень послуг
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "service_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-images');
