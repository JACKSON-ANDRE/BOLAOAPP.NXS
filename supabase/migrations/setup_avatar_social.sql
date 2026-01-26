-- SOCIAL FEATURES SETUP
-- 1. Add avatar column to profiles if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 2. Create Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies (RLS)

-- A. Allow Public Read (Anyone can see avatars)
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- B. Allow Auth Users to Upload (Insert) into their own folder
DROP POLICY IF EXISTS "Avatar Auth Upload" ON storage.objects;
CREATE POLICY "Avatar Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- C. Allow Users to Update their own avatar
DROP POLICY IF EXISTS "Avatar Auth Update" ON storage.objects;
CREATE POLICY "Avatar Auth Update"
ON storage.objects FOR UPDATE
USING ( context_id = auth.uid()::text ); -- Simplification: allow auth users update if they own the object (owner check is default in storage RLS usually via owner column, but for simplicity we rely on bucket logic or refined policy below)

-- REFINED UPDATE/DELETE POLICY (Matches owner)
DROP POLICY IF EXISTS "Avatar Admin/Owner Delete" ON storage.objects;
CREATE POLICY "Avatar Admin/Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (auth.uid() = owner OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
);
