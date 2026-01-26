-- Adicionar política de SELECT para o usuário conseguir ver que já está inscrito
CREATE POLICY "Users can select their own subscriptions"
  ON public.user_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
