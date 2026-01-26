-- Adicionar restrição de unicidade para o upsert funcionar
ALTER TABLE public.user_push_subscriptions 
ADD CONSTRAINT user_push_subscriptions_user_id_key UNIQUE (user_id);
