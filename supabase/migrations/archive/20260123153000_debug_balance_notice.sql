DO $$
DECLARE
    r record;
    v_calc numeric;
BEGIN
    FOR r IN SELECT * FROM profiles LOOP
        -- Calculate what it SHOULD be
        SELECT 
            COALESCE(SUM(amount), 0) - (
                SELECT COALESCE(SUM(amount), 0) 
                FROM transactions t2 
                WHERE t2.user_id = r.id AND t2.status = 'approved' AND (t2.type = 'bet' OR t2.type = 'bet_debit' OR t2.type = 'withdrawal')
            )
        INTO v_calc
        FROM transactions t
        WHERE t.user_id = r.id AND t.status = 'approved' AND (t.type = 'deposit' OR t.type = 'winning' OR t.type = 'bet_credit');

        RAISE NOTICE 'User: %, Role: %, Balance: %, Withdrawable: %, Calculated: %', 
            r.full_name, r.role, r.balance, r.withdrawable_balance, v_calc;
    END LOOP;
END $$;
