
-- 🛡️ BLINDAGEM DE SALDO & COMPROVANTE DETALHADO 🛡️
-- Data: 29/01/2026

-- 1. LIMPEZA TOTAL (Deep Clean)
-- Removemos todas as possíveis variações de gatilhos que causaram a duplicidade.
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_update ON public.deposits;
DROP TRIGGER IF EXISTS deposits_trigger ON public.deposits;
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS deposit_notification_trigger ON public.deposits;

-- Opcional: Remover função antiga se tiver nome diferente (mas vamos sobrescrever a principal abaixo)
DROP FUNCTION IF EXISTS public.process_deposit_credit(); 

-- 2. TRAVA FÍSICA (Database Constraint)
-- Isso impede fisicamente que o banco aceite o mesmo ID de depósito duas vezes na tabela de transações.
-- Se o gatilho tentar inserir de novo, o banco vai dar erro e bloquear a operação.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_ref_deposit 
ON public.transactions (reference_id) 
WHERE type = 'deposit';

-- 3. LÓGICA INTELIGENTE (Snapshot de Saldo & Notificação Rica)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
    v_old_balance numeric;
    v_new_balance numeric;
    v_already_processed boolean;
BEGIN
    -- Apenas se status mudar para 'approved'
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- A. VERIFICAÇÃO DE SEGURANÇA (Idempotência)
        -- Checa se já existe transação para este depósito
        SELECT EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE reference_id = NEW.id AND type = 'deposit'
        ) INTO v_already_processed;

        IF v_already_processed THEN
            -- Se já existe, notifica ADMIN do bloqueio e PARA TUDO.
            -- Não atualiza saldo, não insere transação nova.
            
            SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
            
            INSERT INTO public.user_notifications (user_id, message, type)
            VALUES (NEW.user_id, 'ℹ️ O sistema detectou uma atualização duplicada no seu depósito e bloqueou para sua segurança. Seu saldo está correto.', 'info');

            PERFORM public.notify_all_admins(
                '🛡️ BLINDAGEM ATIVADA: Tentativa de processar depósito ID ' || NEW.id || ' duplicado foi bloqueada com sucesso.',
                'warning'
            );
            
            RETURN NEW; 
        END IF;

        -- B. CAPTURA DO SALDO (Snapshot)
        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = NEW.user_id;
        
        -- C. CÁLCULO DO NOVO SALDO
        v_new_balance := v_old_balance + NEW.amount;

        -- D. ATUALIZAÇÃO DO SALDO
        UPDATE public.profiles
        SET balance = v_new_balance
        WHERE id = NEW.user_id;

        -- E. OPERAÇÃO DE CRÉDITO (TRANSAÇÃO)
        -- Descrição detalhada: "Depósito PIX. (Saldo Anterior: R$ 100 -> R$ 110)"
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
            'Depósito PIX Confirmado. (Saldo Anterior: R$ ' || v_old_balance::text || ' + R$ ' || NEW.amount::text || ' = R$ ' || v_new_balance::text || ')'
        );

        -- F. NOTIFICAÇÃO DO USUÁRIO (Sininho)
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (
            NEW.user_id, 
            '✅ Depósito de R$ ' || NEW.amount::text || ' confirmado! Seu saldo foi de R$ ' || v_old_balance::text || ' para R$ ' || v_new_balance::text || '.', 
            'success'
        );

        -- G. NOTIFICAÇÃO DOS ADMINS
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.notify_all_admins(
            '💰 Depósito: ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || '. Saldo atualizado: R$ ' || v_new_balance::text,
            'success'
        );
        
        -- H. PUSH NOTIFICATION (PWA)
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Confirmado!',
            p_body := 'Usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || '.',
            p_target := 'admins',
            p_url := '/admin'
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REINSTALAÇÃO DO GATILHO ÚNICO
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();
