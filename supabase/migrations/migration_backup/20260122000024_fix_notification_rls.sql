-- FIX NOTIFICATIONS ACCESS
-- Purpose: Allow users to see their own notifications.

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;

CREATE POLICY "Users can view own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Explicitly allow inserts from service functions if needed, 
-- but usually functions with SECURITY DEFINER bypass RLS. 
-- So just enabling SELECT for user is enough for the frontend.
