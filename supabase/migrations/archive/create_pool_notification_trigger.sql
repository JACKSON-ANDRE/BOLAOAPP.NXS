-- 🔔 NOTIFICAÇÃO AUTOMÁTICA DE CRIAÇÃO DE BOLÃO

-- 1. Cria a função que dispara a notificação
CREATE OR REPLACE FUNCTION public.notify_pool_creation()
RETURNS trigger AS $$
BEGIN
  -- Insere notificação para o criador do bolão
  INSERT INTO public.user_notifications (user_id, message, created_at)
  VALUES (
    NEW.creator_id,
    '🏆 Bolão criado com sucesso! Compartilhe com seus amigos: ' || NEW.title,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cria o Trigger que chama a função ao inserir na tabela pools
DROP TRIGGER IF EXISTS on_pool_created ON public.pools;

CREATE TRIGGER on_pool_created
  AFTER INSERT ON public.pools
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pool_creation();
