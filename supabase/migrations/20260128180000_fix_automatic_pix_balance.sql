-- 🚨 FIX AUTOMATIC PIX BALANCE UPDATE 🚨
-- This migration updates the trigger function to ensure that when a PIX deposit is 'approved'
-- via webhook, the user's balance is updated and a transaction is recorded.

CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
BEGIN
    -- Only trigger when status changes to 'approved'
    -- We use COALESCE(OLD.status, 'pending') in case of insertion with approved status (rare but possible)
    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- 1. Update User Balance (The missing step!)
        UPDATE public.profiles
        SET balance = balance + NEW.amount
        WHERE id = NEW.user_id;

        -- 2. Register Transaction (For user statement)
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
            NEW.user_id, -- System/Self
            'balance',
            'Depósito via PIX Automático'
        );

        -- 3. Notify User (Internal notification table)
        INSERT INTO public.user_notifications (user_id, message)
        VALUES (
            NEW.user_id,
            '✅ Seu depósito de R$ ' || NEW.amount::text || ' via PIX foi confirmado!'
        );

        -- 4. Notify Administrators (Push Notification)
        -- Fetch user name for the admin alert
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;

        PERFORM public.trigger_pwa_push(
            p_title := '💰 Depósito Confirmado!',
            p_body := 'O usuário ' || COALESCE(v_user_name, 'Alguém') || ' acabou de depositar R$ ' || NEW.amount::text || ' via PIX Automático.',
            p_target := 'admins',
            p_url := '/admin'
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();
