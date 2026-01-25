-- FEATURE: TARGETED NOTIFICATIONS
-- Enables sending messages to specific users via Admin Panel

-- 1. Update Table Structure
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    target_user_id uuid REFERENCES public.profiles(id) -- New Column
);

-- Add column if table already exists but column doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_messages' AND column_name = 'target_user_id') THEN
        ALTER TABLE public.admin_messages ADD COLUMN target_user_id uuid REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Create/Update Notification Trigger Logic
CREATE OR REPLACE FUNCTION public.handle_new_admin_message()
RETURNS trigger AS $$
BEGIN
    IF NEW.target_user_id IS NOT NULL THEN
        -- Targeted Message: Send ONLY to specific user
        INSERT INTO public.user_notifications (user_id, message, type)
        VALUES (NEW.target_user_id, NEW.message, 'info');
    ELSE
        -- Global Message: Send to ALL users
        INSERT INTO public.user_notifications (user_id, message, type)
        SELECT id, NEW.message, 'info'
        FROM public.profiles;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger (Drop first to ensure clean state)
DROP TRIGGER IF EXISTS on_admin_message_created ON public.admin_messages;

CREATE TRIGGER on_admin_message_created
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_message();

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_admin_messages_target ON public.admin_messages(target_user_id);
