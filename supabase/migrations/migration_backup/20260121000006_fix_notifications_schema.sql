
-- FIX NOTIFICATIONS SCHEMA
-- The error "column message of relation user_notifications does not exist" prevents system notifications.
-- We also need to ensure 'admin_message_id' is nullable so we can send messages without a global admin message.

DO $$
BEGIN
    -- 1. Add 'message' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'message') THEN
        ALTER TABLE user_notifications ADD COLUMN message text;
    END IF;

    -- 2. Make 'admin_message_id' nullable (it might be NOT NULL currently)
    -- This is required because our new notifications don't link to 'admin_messages' table
    ALTER TABLE user_notifications ALTER COLUMN admin_message_id DROP NOT NULL;

END $$;
