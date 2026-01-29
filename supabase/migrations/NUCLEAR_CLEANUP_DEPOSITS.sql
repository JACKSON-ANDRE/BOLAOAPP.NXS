-- 🚨 NUCLEAR CLEANUP: GHOST BUSTER v2 🚨
-- This script dynamically finds and kills EVERY trigger on relevant tables.
-- It ensures that we start from a truly clean state.

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. KILL ALL TRIGGERS ON public.deposits
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'deposits' AND trigger_schema = 'public') 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.deposits'; 
    END LOOP; 

    -- 2. KILL ALL TRIGGERS ON public.transactions
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'transactions' AND trigger_schema = 'public') 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.transactions'; 
    END LOOP; 

    -- 3. KILL ALL TRIGGERS ON public.profiles
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'profiles' AND trigger_schema = 'public') 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.profiles'; 
    END LOOP;
    
    -- 4. KILL ALL TRIGGERS ON public.deposit_requests
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'deposit_requests' AND trigger_schema = 'public') 
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.deposit_requests'; 
    END LOOP;
END $$;

-- ==============================================================================
-- 2. PURGE OLD FUNCTIONS
-- ==============================================================================
DROP FUNCTION IF EXISTS public.process_deposit_notification();
DROP FUNCTION IF EXISTS public.process_deposit_credit();
DROP FUNCTION IF EXISTS public.handle_deposit_update();
DROP FUNCTION IF EXISTS public.on_deposit_approved();
DROP FUNCTION IF EXISTS public.on_deposit_update();
DROP FUNCTION IF EXISTS public.deposits_trigger();

-- ==============================================================================
-- 3. THE ONE TRUE TRIGGER (Blindado, Idempotente, Correto)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
    v_old_balance numeric;
    v_new_balance numeric;
    v_already_processed boolean;
BEGIN
    -- [🛡️] Proteção Extra contra Recursão
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    -- [🎯] Só executa quando status muda para 'approved'
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- [🚫] ANTI-DUPLICIDADE FÍSICA NO NÍVEL DE TRANSAÇÃO
        SELECT EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE reference_id = NEW.id AND type = 'deposit'
        ) INTO v_already_processed;
        
        IF v_already_processed THEN
            PERFORM public.notify_all_admins('🛡️ BLOQUEIO: Tentativa de crédito duplicado evitada para o depósito ID ' || NEW.id::text, 'warning');
            RETURN NEW; 
        END IF;

        -- [💾] SNAPSHOT DO SALDO
        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = NEW.user_id;
        v_new_balance := v_old_balance + NEW.amount;

        -- [💰] PASSO 1: Atualiza Perfil (Crédito Real)
        UPDATE public.profiles SET balance = v_new_balance WHERE id = NEW.user_id;

        -- [🚜] PASSO 2: Registra Transação (Histórico do Usuário)
        INSERT INTO public.transactions (
            user_id, amount, type, status, reference_id, created_by, balance_type, description
        ) VALUES (
            NEW.user_id, 
            NEW.amount, 
            'deposit', 
            'approved', 
            NEW.id, 
            NEW.user_id, 
            'balance', 
            'Depósito PIX Confirmado (Saldo: R$ ' || v_old_balance || ' -> R$ ' || v_new_balance || ')'
        );

        -- [📜] PASSO 3: Atualiza Histórico no Registro de Depósito (Para o Admin ver)
        UPDATE public.deposits 
        SET balance_before = v_old_balance, 
            balance_after = v_new_balance 
        WHERE id = NEW.id;

        -- [🔔] PASSO 4: ÚNICA NOTIFICAÇÃO DO USUÁRIO (Sininho)
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.user_id, '✅ Depósito de R$ ' || NEW.amount || ' confirmado! Saldo atualizado.', 'success');

        -- [👮] PASSO 5: NOTIFICAÇÃO DO ADMINISTRADOR
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.notify_all_admins('💰 Depósito de ' || COALESCE(v_user_name, 'Usuário') || ' (R$ ' || NEW.amount || ') Aprovado!', 'success');

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [⚡] INSTALAÇÃO DO GATILHO ÚNICO
CREATE TRIGGER tr_final_deposit_trigger
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();
