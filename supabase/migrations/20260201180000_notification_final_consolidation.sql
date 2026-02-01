-- 🚨 FINAL NOTIFICATION CONSOLIDATION 🚨
-- Purpose: Remove duplicates and ensure 1 user alert + 1 admin alert per approved deposit.

-- 1. DROP CONFLICTING TRIGGERS
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
DROP FUNCTION IF EXISTS public.process_deposit_notification();

-- 2. NEW MASTER TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_deposit_approval_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    -- Only act when status changes from anything (pending/expired) to 'approved'
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        
        -- A. NOTIFY THE USER (Owner of the deposit)
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id, 
            'Pix Aprovado! 🚀', 
            'Seu depósito de R$ ' || NEW.amount::text || ' já está na conta. Boa sorte!', 
            'success'
        );

        -- B. NOTIFY ALL ADMINS (Bell + Push)
        -- Get user name for better context
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        
        PERFORM public.notify_all_admins(
            '💰 Pix Recebido!',
            'O investidor ' || COALESCE(v_user_name, 'Desconhecido') || ' depositou R$ ' || NEW.amount::text || '.',
            'success',
            '/admin' -- URL to redirect admin
        );

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. BIND TRIGGER
CREATE TRIGGER tr_handle_deposit_approval
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_deposit_approval_notifications();
