-- Ensure app_settings has the necessary columns for notifications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'supabase_url') THEN
        ALTER TABLE public.app_settings ADD COLUMN supabase_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'service_role_key') THEN
        ALTER TABLE public.app_settings ADD COLUMN service_role_key text;
    END IF;
END $$;

-- Function to notify admins via the send-push Edge Function
CREATE OR REPLACE FUNCTION notify_admins_of_event()
RETURNS trigger AS $$
DECLARE
    payload jsonb;
    event_title text;
    event_body text;
    v_url text;
    v_key text;
BEGIN
    -- Get credentials from app_settings
    SELECT supabase_url, service_role_key INTO v_url, v_key FROM public.app_settings WHERE id = 1;

    -- If credentials are not set, skip notification
    IF v_url IS NULL OR v_key IS NULL OR v_url = '' OR v_url = 'SUPABASE_URL' THEN
        RETURN NEW;
    END IF;

    -- Determine Title and Body based on table
    IF TG_TABLE_NAME = 'profiles' THEN
        event_title := 'Novo Usuário';
        event_body := 'O usuário ' || COALESCE(NEW.full_name, 'Sem Nome') || ' acabou de se cadastrar no app.';
    ELSIF TG_TABLE_NAME = 'withdraw_requests' AND NEW.status = 'pending' THEN
        event_title := 'Solicitação de Saque';
        event_body := 'Um saque de R$ ' || NEW.amount::text || ' foi solicitado.';
    ELSIF TG_TABLE_NAME = 'deposit_requests' AND NEW.status = 'pending' THEN
        event_title := 'Solicitação de Depósito';
        event_body := 'Um depósito de R$ ' || NEW.amount::text || ' aguarda aprovação.';
    ELSE
        RETURN NEW;
    END IF;

    -- Prepare the payload
    payload := jsonb_build_object(
        'title', event_title,
        'body', event_body,
        'target', 'admins',
        'url', '/admin'
    );

    -- Call the Edge Function using net.http_post
    PERFORM
      net.http_post(
        url := v_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := payload
      );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DROP TRIGGER IF EXISTS on_new_user_notify_admin ON profiles;
CREATE TRIGGER on_new_user_notify_admin
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION notify_admins_of_event();

DROP TRIGGER IF EXISTS on_withdraw_request_notify_admin ON withdraw_requests;
CREATE TRIGGER on_withdraw_request_notify_admin
  AFTER INSERT ON withdraw_requests
  FOR EACH ROW EXECUTE FUNCTION notify_admins_of_event();

DROP TRIGGER IF EXISTS on_deposit_request_notify_admin ON deposit_requests;
CREATE TRIGGER on_deposit_request_notify_admin
  AFTER INSERT ON deposit_requests
  FOR EACH ROW EXECUTE FUNCTION notify_admins_of_event();
