-- Check if app_settings exists and has the column
CREATE TABLE IF NOT EXISTS public.app_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT false,
  pix_key TEXT,
  qr_code_url TEXT,
  fake_user_count INTEGER DEFAULT 0, -- New column
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Ensure the single row exists
INSERT INTO public.app_settings (id, maintenance_mode, fake_user_count)
VALUES (1, false, 0)
ON CONFLICT (id) DO NOTHING;

-- Add column if table existed but column didn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'fake_user_count') THEN
        ALTER TABLE public.app_settings ADD COLUMN fake_user_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
DROP POLICY IF EXISTS "Settings Public Read" ON public.app_settings;
CREATE POLICY "Settings Public Read" ON public.app_settings FOR SELECT USING (true);

-- Policy: Only Admin updates
DROP POLICY IF EXISTS "Settings Admin Update" ON public.app_settings;
CREATE POLICY "Settings Admin Update" ON public.app_settings FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
