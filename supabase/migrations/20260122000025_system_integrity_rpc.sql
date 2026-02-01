-- ENHANCED SYSTEM INTEGRITY CHECK WITH AUTO-DIAGNOSIS
-- Purpose: Scan for financial anomalies and generate fix prompts for the AI.

CREATE OR REPLACE FUNCTION public.check_system_integrity()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_issues text[] := ARRAY[]::text[];
    v_status text := 'healthy';
    v_fix_prompt text := '';
    
    -- Anomaly Variables
    v_double_payments record;
    v_double_deductions record;
    v_negative_balances record;
    v_pool_mismatches record;
    
    v_details text;
BEGIN
    -- 1. CHECK FOR DOUBLE PAYMENTS (Same User, Same Pool, Multiple Winning Transactions)
    FOR v_double_payments IN 
        SELECT user_id, reference_id, COUNT(*) as cnt 
        FROM transactions 
        WHERE type = 'winning' AND status = 'approved' 
        GROUP BY user_id, reference_id 
        HAVING COUNT(*) > 1
    LOOP
        v_status := 'critical';
        v_details := format('Double Payout detected: User %s received %s payments for Pool %s', v_double_payments.user_id, v_double_payments.cnt, v_double_payments.reference_id);
        v_issues := array_append(v_issues, v_details);
        v_fix_prompt := v_fix_prompt || format('User %s has duplicate WINNING transactions for Pool %s. Delete duplicates keeping only one. ', v_double_payments.user_id, v_double_payments.reference_id);
    END LOOP;

    -- 2. CHECK FOR DOUBLE DEDUCTIONS (Same User, Same Pool, Multiple Bet Debits)
    FOR v_double_deductions IN 
        SELECT user_id, reference_id, COUNT(*) as cnt 
        FROM transactions 
        WHERE type = 'bet_debit' AND status = 'approved' 
        GROUP BY user_id, reference_id 
        HAVING COUNT(*) > 1
    LOOP
        v_status := 'critical';
        v_details := format('Double Bet Deduction detected: User %s paid %s times for Pool %s', v_double_deductions.user_id, v_double_deductions.cnt, v_double_deductions.reference_id);
        v_issues := array_append(v_issues, v_details);
        v_fix_prompt := v_fix_prompt || format('User %s has duplicate BET_DEBIT transactions for Pool %s. Refund duplicates. ', v_double_deductions.user_id, v_double_deductions.reference_id);
    END LOOP;

    -- 3. CHECK FOR NEGATIVE BALANCES
    FOR v_negative_balances IN 
        SELECT id, full_name, balance, withdrawable_balance 
        FROM profiles 
        WHERE balance < 0 OR withdrawable_balance < 0
    LOOP
        v_status := 'critical';
        v_details := format('Negative Balance: User %s has Balance: %s, Withdrawable: %s', v_negative_balances.full_name, v_negative_balances.balance, v_negative_balances.withdrawable_balance);
        v_issues := array_append(v_issues, v_details);
        v_fix_prompt := v_fix_prompt || format('User %s has negative balance. Investigate transactions to correct. ', v_negative_balances.id);
    END LOOP;

    -- 4. CONSTRUCT FINAL RESPONSE
    IF v_status = 'critical' THEN
        v_fix_prompt := 'CRITICAL ISSUES FOUND. PLEASE RUN THIS SQL TO FIX OR INVESTIGATE: ' || v_fix_prompt;
    ELSE
        v_fix_prompt := 'System is healthy. No actions needed.';
    END IF;

    RETURN json_build_object(
        'status', v_status,
        'issues', v_issues,
        'fix_prompt', v_fix_prompt,
        'checked_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_system_integrity TO authenticated;
