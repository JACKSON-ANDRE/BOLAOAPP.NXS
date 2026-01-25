-- Restore Admin Role for Jackson
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'upmarketingassessoria@gmail.com'
);

-- Ensure the change is committed
COMMIT;
