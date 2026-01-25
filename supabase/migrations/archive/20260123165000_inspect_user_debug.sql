-- FIND USER BY EMAIL AND SHOW ALL DATA
SELECT 
    id, 
    email, 
    raw_user_meta_data 
FROM auth.users 
WHERE email = 'upmarketingassessoria@gmail.com';

SELECT 
    * 
FROM public.profiles 
WHERE email = 'upmarketingassessoria@gmail.com';

-- Check if ID matches
SELECT 
    a.id as auth_id,
    p.id as profile_id,
    p.full_name,
    p.role,
    p.balance
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE a.email = 'upmarketingassessoria@gmail.com';
