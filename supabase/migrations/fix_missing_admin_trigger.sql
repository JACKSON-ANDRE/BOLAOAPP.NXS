-- FIX CRÍTICO: Anexar o Trigger de Mensagens Globais
-- O script anterior definia a funcao mas esqueceu de dar o CREATE TRIGGER

DROP TRIGGER IF EXISTS tr_dispatch_admin_message ON public.admin_messages;

CREATE TRIGGER tr_dispatch_admin_message
    AFTER INSERT ON public.admin_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_admin_message();

-- Garantir que a função handle existe (reforço)
CREATE OR REPLACE FUNCTION public.handle_new_admin_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.target_user_id IS NOT NULL THEN
        -- Mensagem Direta
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.target_user_id, NEW.message, 'info');
    ELSE
        -- Mensagem Global: Manda pra TODOS
        INSERT INTO public.user_notifications (user_id, message, type)
        SELECT id, NEW.message, 'info'
        FROM public.profiles; 
    END IF;
    
    RETURN NEW;
END;
$$;
