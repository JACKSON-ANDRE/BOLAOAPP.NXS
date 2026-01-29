-- 🚨 GATILHO DEFINITIVO DE DEPÓSITOS 🚨

-- 1. Garantir que a função de processamento esteja correta e segura
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    -- Log para debug interno (vai aparecer nos logs do Supabase)
    RAISE NOTICE 'Trigger process_deposit_notification disparado para ID % (Status OLD: %, Status NEW: %)', 
                 NEW.id, COALESCE(OLD.status, 'N/A'), NEW.status;

    -- Dispara apenas quando o status MUDA para 'approved'
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- A. Adiciona ao SALDO JOGO (balance)
        UPDATE public.profiles
        SET balance = COALESCE(balance, 0) + COALESCE(NEW.amount, 0)
        WHERE id = NEW.user_id;

        -- B. Registra a transação no extrato
        INSERT INTO public.transactions (
            user_id, 
            amount, 
            type, 
            status, 
            reference_id, 
            created_by, 
            balance_type, 
            description
        )
        VALUES (
            NEW.user_id, 
            NEW.amount, 
            'deposit', 
            'approved', 
            NEW.id, 
            NEW.user_id, 
            'balance', 
            'Depósito via PIX Automático (Confirmado)'
        );

        -- C. Notifica o Usuário
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.user_id, '✅ Seu depósito de R$ ' || NEW.amount::text || ' via PIX foi confirmado!', 'success');

        -- D. Push para Admins
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Confirmado!',
            p_body := 'O usuário ' || COALESCE(v_user_name, 'Usuário') || ' depositou R$ ' || NEW.amount::text || ' via PIX Automático.',
            p_target := 'admins', 
            p_url := '/admin'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que o Gatilho esteja anexado
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();

-- 3. REPROVAR E RE-APROVAR os depósitos que ficaram "presos" no teste
-- Isso força o gatilho a rodar agora.
DO $$
DECLARE
    r record;
BEGIN
    -- Busca depósitos aprovados hoje que não geraram transação
    FOR r IN 
        SELECT d.id, d.user_id, d.amount 
        FROM public.deposits d
        LEFT JOIN public.transactions t ON t.reference_id = d.id
        WHERE d.status = 'approved' 
          AND t.id IS NULL
          AND d.created_at > now() - interval '1 hour'
    LOOP
        -- "Reseta" para pending e volta para approved para disparar o trigger
        UPDATE public.deposits SET status = 'pending' WHERE id = r.id;
        UPDATE public.deposits SET status = 'approved' WHERE id = r.id;
        RAISE NOTICE 'Depósito % re-processado com sucesso.', r.id;
    END LOOP;
END $$;
