-- NUCLEAR OPTION: Disable RLS on profiles completely
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Grant access just in case
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
