-- ENHANCED SYSTEM INTEGRITY CHECK WITH FINANCIAL LOSS CALCULATION
-- Purpose: Scan for financial anomalies, calculate total loss, and generate fix prompts.

CREATE OR REPLACE FUNCTION public.check_system_integrity()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_issues text[] := ARRAY[]::text[];
    v_status text := 'healthy';
    v_fix_prompt text := '';
    v_total_loss numeric := 0;
    
    -- Anomaly Variables
    v_double_payments record;
    v_double_deductions record;
    v_negative_balances record;
    v_details text;
    v_duplicate_amount numeric;
BEGIN
    -- 1. CHECK FOR DOUBLE PAYMENTS (System Loss)
    -- User received multiple payouts for the same pool
    FOR v_double_payments IN 
        SELECT 
            t.user_id, 
            t.reference_id, 
            COUNT(*) as cnt,
            SUM(t.amount) as total_paid,
            MAX(t.amount) as single_payment_amount 
        FROM transactions t
        WHERE t.type = 'winning' AND t.status = 'approved' 
        GROUP BY t.user_id, t.reference_id 
        HAVING COUNT(*) > 1
    LOOP
        v_status := 'critical';
        -- The loss is the total paid minus what SHOULD have been paid (1x)
        v_duplicate_amount := v_double_payments.total_paid - v_double_payments.single_payment_amount;
        v_total_loss := v_total_loss + v_duplicate_amount;
        
        v_details := format('PREJUÍZO DETECTADO: Usuário %s recebeu %s pagamentos (Perda: R$ %s)', v_double_payments.user_id, v_double_payments.cnt, v_duplicate_amount);
        v_issues := array_append(v_issues, v_details);
        v_fix_prompt := v_fix_prompt || format('User %s received R$ %s excess. Delete %s duplicate transactions for pool %s. ', v_double_payments.user_id, v_duplicate_amount, (v_double_payments.cnt - 1), v_double_payments.reference_id);
    END LOOP;

    -- 2. CHECK FOR DOUBLE DEDUCTIONS (User Loss - Risk of Complaint)
    -- User paid multiple times for the same bet
    FOR v_double_deductions IN 
        SELECT 
            t.user_id, 
            t.reference_id, 
            COUNT(*) as cnt,
            SUM(t.amount) as total_deducted,
            MAX(t.amount) as single_bet_amount
        FROM transactions t
        WHERE t.type = 'bet_debit' AND t.status = 'approved' 
        GROUP BY t.user_id, t.reference_id 
        HAVING COUNT(*) > 1
    LOOP
        v_status := 'critical';
        v_duplicate_amount := v_double_deductions.total_deducted - v_double_deductions.single_bet_amount;
        -- We don't add to 'v_total_loss' (system loss) because the system GAINED money here, but it's an integrity error.
        -- Maybe we flag it differently? For now, list it as an issue.
        
        v_details := format('COBRANÇA INDEVIDA: Usuário %s pagou %s vezes (Reembolsar: R$ %s)', v_double_deductions.user_id, v_double_deductions.cnt, v_duplicate_amount);
        v_issues := array_append(v_issues, v_details);
        v_fix_prompt := v_fix_prompt || format('Refund User %s R$ %s for duplicate bets on pool %s. ', v_double_deductions.user_id, v_duplicate_amount, v_double_deductions.reference_id);
    END LOOP;

    -- 3. CHECK FOR NEGATIVE BALANCES (Risk)
    FOR v_negative_balances IN 
        SELECT id, full_name, balance, withdrawable_balance 
        FROM profiles 
        WHERE balance < 0 OR withdrawable_balance < 0
    LOOP
        v_status := 'critical';
        v_details := format('SALDO NEGATIVO: %s (Saldo: %s)', v_negative_balances.full_name, v_negative_balances.balance);
        v_issues := array_append(v_issues, v_details);
        v_fix_prompt := v_fix_prompt || format('Fix negative balance for user %s. ', v_negative_balances.id);
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
        'total_loss', v_total_loss,
        'checked_at', now()
    );
END;
$$;
