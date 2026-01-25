-- ADD TITLE TO NOTIFICATIONS
-- Purpose: Add 'title' column to user_notifications table to support rich notifications.

ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS title text;

-- Optional: Update existing notifications with a default title if needed
UPDATE public.user_notifications 
SET title = 'Notificação' 
WHERE title IS NULL;
