-- Create bucket for App Assets if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app_assets', 'app_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'app_assets' );

-- Policy to allow Admin upload (using authenticated for now, ideally admin-only)
CREATE POLICY "Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'app_assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE
USING ( bucket_id = 'app_assets' AND auth.role() = 'authenticated' );
