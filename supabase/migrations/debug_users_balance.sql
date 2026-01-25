-- INSPECT SPECIFIC USERS (DEBUG ZERO BALANCE)
SELECT 
    p.id, 
    p.full_name, 
    p.email, 
    p.balance, 
    p.withdrawable_balance
FROM public.profiles p
WHERE p.email IN ('jacksportfotos@gmail.com', 'nexusdisplays.edit@gmail.com');

-- CHECK DEPOSITS FOR THESE USERS
SELECT 
    d.id, 
    d.user_id, 
    d.amount, 
    d.status, 
    d.created_at
FROM public.deposit_requests d
JOIN public.profiles p ON p.id = d.user_id
WHERE p.email IN ('jacksportfotos@gmail.com', 'nexusdisplays.edit@gmail.com');

-- CHECK TRANSACTIONS FOR THESE USERS
SELECT 
    t.id, 
    t.user_id, 
    t.amount, 
    t.type, 
    t.status, 
    t.balance_type, 
    t.created_at
FROM public.transactions t
JOIN public.profiles p ON p.id = t.user_id
WHERE p.email IN ('jacksportfotos@gmail.com', 'nexusdisplays.edit@gmail.com');
