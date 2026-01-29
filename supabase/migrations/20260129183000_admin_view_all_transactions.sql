-- LIBERAR VISÃO TOTAL PARA ADMIN (GOD MODE)
-- Garante que o usuário com role 'admin' possa ver todas as transações de todo mundo.

DROP POLICY IF EXISTS "Admin View All Transactions" ON public.transactions;

CREATE POLICY "Admin View All Transactions" 
ON public.transactions 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Garantir que usuários comuns vejam APENAS as suas (já deve existir, mas reforçando)
DROP POLICY IF EXISTS "User View Own Transactions" ON public.transactions;

CREATE POLICY "User View Own Transactions" 
ON public.transactions 
FOR SELECT 
USING (
  auth.uid() = user_id
);
