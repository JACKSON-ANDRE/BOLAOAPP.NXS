-- FIX DUPLICATE NOTIFICATIONS
-- 1. Drop ALL potential triggers on admin_messages (aggressive cleanup)
DROP TRIGGER IF EXISTS on_admin_message_created ON public.admin_messages;
DROP TRIGGER IF EXISTS trigger_admin_notification ON public.admin_messages;
DROP TRIGGER IF EXISTS admin_msg_trigger ON public.admin_messages;
DROP TRIGGER IF EXISTS send_notifications_trigger ON public.admin_messages;

-- 2. Redefine the function to be stricter and cleaner
CREATE OR REPLACE FUNCTION public.handle_new_admin_message()
RETURNS trigger AS $$
BEGIN
    IF NEW.target_user_id IS NOT NULL THEN
        -- Targeted: Only for the specific user
        -- (Safe: Even if that user is Admin, they get it because you targeted them specifically)
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.target_user_id, NEW.message, 'info');
    ELSE
        -- Global: Send to all "USER" roles (Exclude Admins if requested, or send to all)
        -- User said: "adm ta chegando 1 mensagem, não pode chegar para o adm"
        -- So we filter by role != 'admin' OR just assume all except self?
        -- Usually Global means EVERYONE. But if Admin doesn't want to see their own spam:
        
        INSERT INTO public.user_notifications (user_id, message, type)
        SELECT id, NEW.message, 'info'
        FROM public.profiles
        WHERE role <> 'admin'; -- EXCLUDE ADMINS from Global Broadcast
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the SINGLE correct trigger
CREATE TRIGGER on_admin_message_created
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_message();
