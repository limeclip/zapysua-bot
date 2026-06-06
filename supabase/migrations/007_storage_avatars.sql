-- Bucket для аватарів клієнтів (Етап 5.3)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
