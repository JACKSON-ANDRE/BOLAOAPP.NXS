-- Inspect Profile Balances and verify against Transactions
SELECT 
    p.id, 
    p.full_name, 
    p.email, 
    p.role, 
    p.balance AS game_balance, 
    p.withdrawable_balance AS prize_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.user_id = p.id AND t.status = 'approved' AND (t.type = 'deposit' OR t.type = 'winning' OR t.type = 'bet_credit')) 
    - 
    (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.user_id = p.id AND t.status = 'approved' AND (t.type = 'bet' OR t.type = 'bet_debit' OR t.type = 'withdrawal')) 
    AS calculated_net_total
FROM public.profiles p;

-- Also show last 5 transactions for context
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
