-- FIX: SYNC DELETE ADMIN MESSAGES
-- When an admin drops a message, remove the corresponding user notifications.

CREATE OR REPLACE FUNCTION handle_admin_message_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Se era mensagem direta
    IF OLD.target_user_id IS NOT NULL THEN
        DELETE FROM user_notifications 
        WHERE user_id = OLD.target_user_id 
        AND message = OLD.message;
    
    -- 2. Se era mensagem global (para todos)
    ELSE
        DELETE FROM user_notifications 
        WHERE message = OLD.message;
    END IF;

    RETURN OLD;
END;
$$;

-- Criar o Gatilho de Exclusão
DROP TRIGGER IF EXISTS on_admin_message_deleted ON admin_messages;

CREATE TRIGGER on_admin_message_deleted
AFTER DELETE ON admin_messages
FOR EACH ROW
EXECUTE FUNCTION handle_admin_message_delete();
