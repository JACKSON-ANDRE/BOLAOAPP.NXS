-- 🏥 FULL SYSTEM HEALTH CHECK RPC
-- Executa uma varredura completa por inconsistências financeiras e de dados.

CREATE OR REPLACE FUNCTION public.get_system_health_report()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_issues text[] := ARRAY[]::text[];
    v_total_loss numeric := 0;
    
    -- Contadores
    v_neg_balances int;
    v_orphan_bets int;
    v_orphan_txs int;
    v_stuck_deposits int;
    v_stuck_withdraws int;
    v_duplicate_pix int;
    
    v_status text := 'healthy';
BEGIN
    -- 1. Verificar Saldos Negativos (Crítico)
    SELECT count(*) INTO v_neg_balances 
    FROM profiles 
    WHERE balance < -0.01 OR withdrawable_balance < -0.01;

    IF v_neg_balances > 0 THEN
        v_issues := array_append(v_issues, format('❌ CRÍTICO: %s usuários com saldo negativo detectados.', v_neg_balances));
        v_status := 'critical';
    END IF;

    -- 2. Verificar Apostas Órfãs (Corrupção de Dados)
    SELECT count(*) INTO v_orphan_bets 
    FROM bets 
    WHERE pool_id IS NULL OR user_id IS NULL;

    IF v_orphan_bets > 0 THEN
        v_issues := array_append(v_issues, format('⚠️ ALERTA: %s apostas órfãs (sem bolão ou usuário).', v_orphan_bets));
        IF v_status = 'healthy' THEN v_status := 'warning'; END IF;
    END IF;

    -- 3. Verificar Transações Sem Dono
    SELECT count(*) INTO v_orphan_txs 
    FROM transactions 
    WHERE user_id IS NULL;

    IF v_orphan_txs > 0 THEN
        v_issues := array_append(v_issues, format('⚠️ ALERTA: %s transações financeiras sem usuário associado.', v_orphan_txs));
        IF v_status = 'healthy' THEN v_status := 'warning'; END IF;
    END IF;

    -- 4. Depósitos Travados (> 24h)
    SELECT count(*) INTO v_stuck_deposits 
    FROM deposits 
    WHERE status = 'pending' AND created_at < (now() - interval '24 hours');

    IF v_stuck_deposits > 0 THEN
        v_issues := array_append(v_issues, format('ℹ️ INFO: %s depósitos pendentes há mais de 24h (podem ser lixo).', v_stuck_deposits));
    END IF;

    -- 5. Saques Travados (> 48h)
    SELECT count(*) INTO v_stuck_withdraws 
    FROM withdraw_requests 
    WHERE status = 'pending' AND created_at < (now() - interval '48 hours');

    IF v_stuck_withdraws > 0 THEN
        v_issues := array_append(v_issues, format('⚠️ ATENÇÃO: %s saques pendentes há mais de 48h. Verifique!', v_stuck_withdraws));
        IF v_status = 'healthy' THEN v_status := 'warning'; END IF;
    END IF;

    -- 6. Duplicidade de PIX (Mesmo ID de transação usado 2x)
    SELECT count(*) INTO v_duplicate_pix
    FROM (
        SELECT reference_id, count(*) 
        FROM transactions 
        WHERE type = 'deposit' AND reference_id IS NOT NULL 
        GROUP BY reference_id 
        HAVING count(*) > 1
    ) sub;

    IF v_duplicate_pix > 0 THEN
         v_issues := array_append(v_issues, format('❌ CRÍTICO: %s depósitos processados em duplicidade!', v_duplicate_pix));
         v_status := 'critical';
    END IF;

    -- Retorno JSON estruturado
    RETURN json_build_object(
        'status', v_status,
        'checked_at', now(),
        'issues', v_issues,
        'metrics', json_build_object(
            'negative_balances', v_neg_balances,
            'orphan_bets', v_orphan_bets,
            'stuck_deposits', v_stuck_deposits,
            'stuck_withdraws', v_stuck_withdraws,
            'duplicate_deposits', v_duplicate_pix
        )
    );
END;
$$;
