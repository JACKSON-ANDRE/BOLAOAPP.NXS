-- FUNCTION: get_system_health_report
-- Purpose: Runs a diagnostic check on the database integrity and operational health.
-- Returns: JSON object with 'status', 'issues', and 'summary'.

CREATE OR REPLACE FUNCTION get_system_health_report()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_orphan_bets_count INT;
    v_orphan_pools_count INT;
    v_negative_balances_count INT;
    v_stuck_deposits_count INT;
    v_stuck_withdraws_count INT;
    v_issues json[] := ARRAY[]::json[];
    v_overall_status text := 'healthy';
BEGIN
    -- 1. Check for Orphan Bets (bets with users that don't exist in profiles)
    -- Note: With the recent FK fix, this should be 0, but good to check legacy data.
    SELECT COUNT(*) INTO v_orphan_bets_count
    FROM bets b
    LEFT JOIN profiles p ON b.user_id = p.id
    WHERE p.id IS NULL;

    IF v_orphan_bets_count > 0 THEN
        v_overall_status := 'critical';
        v_issues := array_append(v_issues, json_build_object(
            'type', 'integrity',
            'severity', 'high',
            'message', format('%s apostas órfãs encontradas (usuário inexistente).', v_orphan_bets_count),
            'table', 'bets',
            'fix_hint', 'DELETE FROM bets WHERE user_id NOT IN (SELECT id FROM profiles);'
        ));
    END IF;

    -- 2. Check for Orphan Pools
    SELECT COUNT(*) INTO v_orphan_pools_count
    FROM pools p
    LEFT JOIN profiles u ON p.creator_id = u.id
    WHERE u.id IS NULL;

    IF v_orphan_pools_count > 0 THEN
        v_overall_status := 'critical';
        v_issues := array_append(v_issues, json_build_object(
            'type', 'integrity',
            'severity', 'high',
            'message', format('%s bolões órfãos encontrados (criador inexistente).', v_orphan_pools_count),
            'table', 'pools',
            'fix_hint', 'UPDATE pools SET creator_id = (SELECT id FROM profiles WHERE role = ''admin'' LIMIT 1) WHERE creator_id IS NULL;'
        ));
    END IF;

    -- 3. Check for Negative Balances
    SELECT COUNT(*) INTO v_negative_balances_count
    FROM profiles
    WHERE balance < 0 OR withdrawable_balance < 0;

    IF v_negative_balances_count > 0 THEN
        v_overall_status := 'critical';
        v_issues := array_append(v_issues, json_build_object(
            'type', 'financial',
            'severity', 'critical',
            'message', format('%s usuários com saldo negativo.', v_negative_balances_count),
            'table', 'profiles',
            'fix_hint', 'Investigate transactions for users with negative balance.'
        ));
    END IF;

    -- 4. Check for Stuck Pending Deposits (> 24 hours)
    SELECT COUNT(*) INTO v_stuck_deposits_count
    FROM deposit_requests
    WHERE status = 'pending' AND created_at < now() - interval '24 hours';

    IF v_stuck_deposits_count > 0 THEN
        v_overall_status := CASE WHEN v_overall_status = 'healthy' THEN 'warning' ELSE v_overall_status END;
        v_issues := array_append(v_issues, json_build_object(
            'type', 'operational',
            'severity', 'medium',
            'message', format('%s depósitos pendentes há mais de 24h.', v_stuck_deposits_count),
            'table', 'deposit_requests',
            'fix_hint', 'Review and archive old pending deposits.'
        ));
    END IF;

    -- 5. Return Complete Report
    RETURN json_build_object(
        'status', v_overall_status, -- 'healthy', 'warning', 'critical'
        'checked_at', now(),
        'issues', v_issues,
        'metrics', json_build_object(
            'orphan_bets', v_orphan_bets_count,
            'orphan_pools', v_orphan_pools_count,
            'negative_balances', v_negative_balances_count,
            'stuck_deposits', v_stuck_deposits_count
        )
    );
END;
$$;
