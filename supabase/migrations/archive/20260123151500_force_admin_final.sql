-- FORCE RESTORE ADMIN ROLE (AGAIN)
-- Since the frontend was resetting it, we need to apply this one last time.
UPDATE public.profiles
SET role = 'admin';
