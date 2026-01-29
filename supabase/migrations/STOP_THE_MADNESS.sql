-- 🛑 STOP THE MADNESS: CLEANUP SCRIPT 🛑
-- This script removes ALL duplicate triggers/functions and leaves ONLY the correct one.

-- 1. Drop Legacy Triggers (Kill them with fire)
DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_update ON public.deposits;
DROP TRIGGER IF EXISTS deposits_check_update ON public.deposits;
DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits;
DROP TRIGGER IF EXISTS deposit_notification_trigger ON public.deposits;

-- 2. Drop Legacy Functions
DROP FUNCTION IF EXISTS public.process_deposit_credit(); 
DROP FUNCTION IF EXISTS public.handle_deposit_update();

-- 3. Re-Create the Single Correct Trigger (Just to be safe)
CREATE OR REPLACE FUNCTION public.process_deposit_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
    v_old_balance numeric;
    v_new_balance numeric;
    v_already_processed boolean;
BEGIN
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

    IF (COALESCE(OLD.status, 'pending') != 'approved' AND NEW.status = 'approved') THEN
        
        -- Anti-Duplication Check
        SELECT EXISTS (SELECT 1 FROM public.transactions WHERE reference_id = NEW.id AND type = 'deposit') INTO v_already_processed;
        
        IF v_already_processed THEN
            RETURN NEW; 
        END IF;

        SELECT COALESCE(balance, 0) INTO v_old_balance FROM public.profiles WHERE id = NEW.user_id;
        v_new_balance := v_old_balance + NEW.amount;

        UPDATE public.profiles SET balance = v_new_balance WHERE id = NEW.user_id;
        UPDATE public.deposits SET balance_before = v_old_balance, balance_after = v_new_balance WHERE id = NEW.id;

        INSERT INTO public.transactions (user_id, amount, type, status, reference_id, created_by, balance_type, description)
        VALUES (NEW.user_id, NEW.amount, 'deposit', 'approved', NEW.id, NEW.user_id, 'balance', 
        'Depósito Confirmado (R$ ' || v_old_balance || ' -> R$ ' || v_new_balance || ')');

        -- Single Notification
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.user_id, '✅ Depósito de R$ ' || NEW.amount || ' confirmado!', 'success');
        
        SELECT full_name INTO v_user_name FROM public.profiles WHERE id = NEW.user_id;
        PERFORM public.notify_all_admins('💰 Depósito de ' || COALESCE(v_user_name, 'Usuário') || ' Aprovado!', 'success');

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the One Ring (Trigger)
CREATE TRIGGER tr_notify_on_deposit_approved
    AFTER UPDATE ON public.deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.process_deposit_notification();
