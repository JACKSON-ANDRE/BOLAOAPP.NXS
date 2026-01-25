-- Restore admin role for the user
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'upmarketingassessoria@gmail.com';
