-- Create a singleton table for App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id int PRIMARY KEY DEFAULT 1,
  pix_key text,
  pix_qrcode_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT single_row CHECK (id = 1)
);

-- RLS for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to READ settings (needed for Wallet page)
CREATE POLICY "Public read app_settings" ON public.app_settings
  FOR SELECT USING (true);

-- Allow ONLY ADMINS to UPDATE settings
CREATE POLICY "Admins can update app_settings" ON public.app_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow ONLY ADMINS to INSERT (essentially just the initial row)
CREATE POLICY "Admins can insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Initialize the row if it doesn't verify
INSERT INTO public.app_settings (id, pix_key, pix_qrcode_url)
VALUES (1, 'CHAVE-PIX-PADRAO', 'https://placeholder.com/qr.png')
ON CONFLICT (id) DO NOTHING;

-- STORAGE: Create a public bucket for app assets (like QR code)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app_assets', 'app_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Read Assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'app_assets');

CREATE POLICY "Admins Upload Assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'app_assets' 
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins Update Assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'app_assets' 
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
