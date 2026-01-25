-- 🚨 FINAL FIX FOR DUPLICATE NOTIFICATIONS 🚨
-- Found the culprit: "trigger_distribute_admin_message"

-- 1. DROP THE GHOST TRIGGER (The one causing duplicates)
DROP TRIGGER IF EXISTS trigger_distribute_admin_message ON public.admin_messages;

-- 2. DROP THE CURRENT TRIGGER (To re-create it perfectly)
DROP TRIGGER IF EXISTS on_admin_message_created ON public.admin_messages;

-- 3. REDEFINE FUNCTION (With Admin Exclusion for Global Messages)
CREATE OR REPLACE FUNCTION public.handle_new_admin_message()
RETURNS trigger AS $$
BEGIN
    IF NEW.target_user_id IS NOT NULL THEN
        -- Targeted: Send ONLY to the specific user (even if they are admin)
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.target_user_id, NEW.message, 'info');
    ELSE
        -- Global: Send to ALL users EXCEPT users with role 'admin'
        -- This prevents the sender (Admin) from receiving their own blast.
        INSERT INTO public.user_notifications (user_id, message, type)
        SELECT id, NEW.message, 'info'
        FROM public.profiles
        WHERE role IS DISTINCT FROM 'admin'; 
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-ATTACH ONLY THE CORRECT TRIGGER
CREATE TRIGGER on_admin_message_created
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_message();
