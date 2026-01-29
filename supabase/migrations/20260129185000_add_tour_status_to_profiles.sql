-- Add has_completed_tour to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_tour boolean DEFAULT false;

-- Re-enable RLS check for this column if needed (usually covered by existing profiles policy)
COMMENT ON COLUMN public.profiles.has_completed_tour IS 'Flag to track if user finished the onboarding tour';
