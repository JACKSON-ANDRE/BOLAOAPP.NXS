-- ADD TYPE TO NOTIFICATIONS
-- Purpose: Add 'type' column to user_notifications table to support notification types (success, info, warning, etc).

ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';

-- Update existing notifications
UPDATE public.user_notifications 
SET type = 'info' 
WHERE type IS NULL;
