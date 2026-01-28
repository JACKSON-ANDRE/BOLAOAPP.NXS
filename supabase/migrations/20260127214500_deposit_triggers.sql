-- Gatilho para crédito automático de saldo
CREATE OR REPLACE FUNCTION public.process_deposit_credit()
RETURNS TRIGGER AS $$
BEGIN
    -- Só processa se o status mudar de 'pending' para 'approved'
    IF (OLD.status = 'pending' AND NEW.status = 'approved') THEN
        -- 1. Incrementa o saldo do usuário no perfil
        UPDATE public.profiles
        SET 
            balance = balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.user_id;

        -- 2. Notificação interna para o usuário (Opcional, já que temos o sistema de notificações)
        INSERT INTO public.internal_notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            '💰 Depósito Confirmado',
            'Seu depósito de R$ ' || NEW.amount || ' foi creditado com sucesso!',
            'success'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplica o gatilho na tabela deposits
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
CREATE TRIGGER on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_credit();
