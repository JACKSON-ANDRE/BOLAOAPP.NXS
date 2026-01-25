-- Restore admin role for all users (Development Fix)
UPDATE public.profiles
SET role = 'admin'
WHERE role != 'admin';

-- Ensure future inserts might be handled (optional, but this fixes current state)
