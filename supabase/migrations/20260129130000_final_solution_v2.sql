
-- 🛡️ BLINDAGEM SUPREMA & ADMIN RICO v2 🛡️
-- Data: 29/01/2026

-- 1. LIMPEZA TOTAL DE GATILHOS (Remove tudo que pode causar duplicidade)
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_update ON public.deposits;
DROP TRIGGER IF EXISTS deposits_trigger ON public.deposits;
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS deposit_notification_trigger ON public.deposits;
DROP FUNCTION IF EXISTS public.process_deposit_credit(); 

-- 2. MELHORIA NO SCHEMA (Para o Painel Admin mostrar antes/depois)
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS balance_before numeric;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS balance_after numeric;

-- 3. TRAVA FÍSICA (Database Constraint) - Impossível duplicar ID de transação
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_ref_deposit 
ON public.transactions (reference_id) 
WHERE type = 'deposit';

-- 4. INTELIGÊNCIA CENTRAL (Trigger Definitivo)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
    v_old_balance numeric;
    v_new_balance numeric;
    v_already_processed boolean;
BEGIN
    -- [CRÍTICO] Evita recursão infinita pois vamos atualizar a própria tabela deposits
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    -- Só executa quando status muda para 'approved'
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- A. TRAVAR DUPLICIDADE LÓGICA
        SELECT EXISTS (SELECT 1 FROM public.transactions WHERE reference_id = NEW.id AND type = 'deposit') INTO v_already_processed;
        IF v_already_processed THEN
             -- Apenas avisa Admin (silencioso para usuário na segunda vez)
            SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
            PERFORM public.notify_all_admins('🛡️ BLINDAGEM: Depósito duplicado bloqueado para ' || COALESCE(v_user_name, 'Unknown'), 'warning');
            RETURN NEW; 
        END IF;

        -- B. SNAPSHOT DO SALDO ANTERIOR
        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = NEW.user_id;
        
        -- C. NOVO SALDO
        v_new_balance := v_old_balance + NEW.amount;

        -- D. ATUALIZA PERFIL (Credita o Dinheiro)
        UPDATE public.profiles SET balance = v_new_balance WHERE id = NEW.user_id;

        -- E. ATUALIZA METADADOS DO DEPÓSITO (Para o Admin ver)
        -- Aqui atualizamos o próprio registro que disparou o trigger.
        -- Como usamos pg_trigger_depth(), isso não vai loopar infinitamente.
        UPDATE public.deposits 
        SET balance_before = v_old_balance, 
            balance_after = v_new_balance 
        WHERE id = NEW.id;

        -- F. REGISTRA TRANSAÇÃO DETALHADA
        INSERT INTO public.transactions (
            user_id, amount, type, status, reference_id, created_by, balance_type, description
        ) VALUES (
            NEW.user_id, NEW.amount, 'deposit', 'approved', NEW.id, NEW.user_id, 'balance', 
            'Depósito Confirmado. (Saldo: R$ ' || v_old_balance::text || ' -> R$ ' || v_new_balance::text || ')'
        );

        -- G. NOTIFICAÇÕES (Sininho)
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (
            NEW.user_id, 
            '✅ Depósito de R$ ' || NEW.amount::text || ' confirmado! Seu saldo foi atualizado de R$ ' || v_old_balance::text || ' para R$ ' || v_new_balance::text || '.', 
            'success'
        );

        -- H. NOTIFICAÇÃO ADMIN
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.notify_all_admins(
            '💰 Depósito: ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || '. (R$ ' || v_old_balance::text || ' -> R$ ' || v_new_balance::text || ')',
            'success'
        );
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Aprovado!',
            p_body := COALESCE(v_user_name, 'Usuário') || ': + R$ ' || NEW.amount::text,
            p_target := 'admins',
            p_url := '/admin'
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. APLICA O GATILHO
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();
