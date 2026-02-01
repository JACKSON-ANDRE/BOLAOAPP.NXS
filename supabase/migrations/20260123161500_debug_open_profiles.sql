-- DEBUG: Permissive Read Policy for Profiles
-- If this fixes the issue, we know the previous auth.uid() check was failing.

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Debug Public Read Profiles" 
ON public.profiles FOR SELECT 
USING (true);

-- Ensure grants are correct
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
