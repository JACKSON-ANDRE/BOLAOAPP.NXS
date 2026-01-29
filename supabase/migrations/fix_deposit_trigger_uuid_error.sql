-- FIX DEPOSIT TRIGGER TYPE MISMATCH
-- The previous trigger tried to compare UUID reference_id with text ID.

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
        -- FIX: Removed ::text cast from NEW.id because reference_id is UUID
        SELECT EXISTS (SELECT 1 FROM public.transactions WHERE reference_id = NEW.id AND type = 'deposit') INTO v_already_processed;
        
        IF v_already_processed THEN
            SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
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
