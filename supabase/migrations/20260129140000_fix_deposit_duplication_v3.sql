-- 1. LIMPEZA TOTAL (Remove gatilhos velhos que duplicam)
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_update ON public.deposits;
DROP TRIGGER IF EXISTS deposits_check_update ON public.deposits;
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS deposit_notification_trigger ON public.deposits;

-- Mata as funções velhas também para garantir
DROP FUNCTION IF EXISTS public.handle_deposit_update();
DROP FUNCTION IF EXISTS public.process_deposit_credit();
DROP FUNCTION IF EXISTS public.process_deposit_notification();

-- 2. CRIA A TRAVA DE SEGURANÇA (Unique Index)
-- Isso impede fisicamente que dois depósitos com o mesmo reference_id do Mercado Pago existam como 'deposit'
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_ref_deposit 
ON public.transactions (reference_id) 
WHERE type = 'deposit';

-- 3. CRIA AS COLUNAS DE HISTÓRICO (Se não existirem)
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS balance_before numeric;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS balance_after numeric;

-- 4. FUNÇÃO "CÉREBRO" (Gatilho Único e Inteligente)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
    v_old_balance numeric;
    v_new_balance numeric;
    v_already_processed boolean;
BEGIN
    -- Evita recursão infinita
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    -- Só age quando muda de qualquer coisa para 'approved'
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- CHECAGEM SUPREMA: Já existe transação para esse ID?
        SELECT EXISTS (SELECT 1 FROM public.transactions WHERE reference_id = NEW.id::text AND type = 'deposit') INTO v_already_processed;
        
        IF v_already_processed THEN
            SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
            -- Opcional: Notificar admin sobre tentativa de duplicidade bloqueada
            -- PERFORM public.notify_all_admins('🛡️ BLINDAGEM: Duplicidade bloqueada para ' || COALESCE(v_user_name, 'Unknown'), 'warning');
            RETURN NEW; -- Se já existe, MORRE AQUI. Não faz nada.
        END IF;

        -- Se chegou aqui, é a primeira e única vez. Processa!
        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = NEW.user_id;
        v_new_balance := v_old_balance + NEW.amount;

        -- Atualiza saldo
        UPDATE public.profiles SET balance = v_new_balance WHERE id = NEW.user_id;

        -- Atualiza histórico no depósito (Para o Admin ver o Antes/Depois)
        UPDATE public.deposits SET balance_before = v_old_balance, balance_after = v_new_balance WHERE id = NEW.id;

        -- Cria transação
        INSERT INTO public.transactions (user_id, amount, type, status, reference_id, created_by, balance_type, description)
        VALUES (NEW.user_id, NEW.amount, 'deposit', 'approved', NEW.id, NEW.user_id, 'balance', 
        'Depósito Confirmado (R$ ' || v_old_balance || ' -> R$ ' || v_new_balance || ')');

        -- Notifica Usuário
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.user_id, '✅ Depósito de R$ ' || NEW.amount || ' confirmado!', 'success');
        
        -- Notifica Admin
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.notify_all_admins('💰 Depósito de ' || COALESCE(v_user_name, 'Usuário') || ' Aprovado!', 'success');

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. LIGA O NOVO GATILHO
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();
