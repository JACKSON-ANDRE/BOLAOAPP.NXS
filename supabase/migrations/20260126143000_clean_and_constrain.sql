-- 1. Primeiro, vamos limpar as duplicatas mantendo apenas a mais recente
DELETE FROM public.user_push_subscriptions
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (partition BY user_id ORDER BY created_at DESC) as rnum
        FROM public.user_push_subscriptions
    ) t
    WHERE t.rnum > 1
);

-- 2. Agora sim, podemos adicionar a restrição de segurança sem erro
ALTER TABLE public.user_push_subscriptions 
ADD CONSTRAINT user_push_subscriptions_user_id_key UNIQUE (user_id);
