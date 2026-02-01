-- Find the specific user and their data
DO $$
DECLARE
    v_user_id uuid;
    v_balance numeric;
    v_withdrawable numeric;
    v_role text;
    v_calc_balance numeric;
BEGIN
    -- Get User ID by email
    SELECT id, balance, withdrawable_balance, role 
    INTO v_user_id, v_balance, v_withdrawable, v_role
    FROM profiles 
    WHERE email = 'upmarketingassessoria@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found in public.profiles!';
    ELSE
        -- Calculate what the balance SHOULD be from transactions
        SELECT 
            COALESCE(SUM(amount), 0) - (
                SELECT COALESCE(SUM(amount), 0) 
                FROM transactions t2 
                WHERE t2.user_id = v_user_id AND t2.status = 'approved' AND (t2.type = 'bet' OR t2.type = 'bet_debit' OR t2.type = 'withdrawal')
            )
        INTO v_calc_balance
        FROM transactions t
        WHERE t.user_id = v_user_id AND t.status = 'approved' AND (t.type = 'deposit' OR t.type = 'winning' OR t.type = 'bet_credit');

        RAISE NOTICE 'TARGET USER FOUND: ID=%, Role=%, CurrentBalance=%, CurrentWithdrawable=%, CalculatedFromHistory=%', 
            v_user_id, v_role, v_balance, v_withdrawable, v_calc_balance;
            
        -- List recent transactions to verify
        FOR v_role IN SELECT type || ' - ' || amount FROM transactions WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 10 LOOP
            RAISE NOTICE 'Tx: %', v_role;
        END LOOP;
    END IF;
END $$;
