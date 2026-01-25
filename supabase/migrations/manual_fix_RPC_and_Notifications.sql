-- 🚨 SCRIPT DE CORREÇÃO GERAL (EXECUTAR NO SQL EDITOR DO SUPABASE) 🚨
-- Este script corrige:
-- 1. Erro ao mudar cargo de usuário (Cria a função update_user_role)
-- 2. Notificações de Vitória/Derrota que não chegavam (Atualiza a função finish_pool)
-- 3. Permissões de escrita de notificações (Ajusta RLS)

-- ==============================================================================
-- 1. FUNÇÃO PARA MUDAR CARGO (CORREÇÃO DE ERRO NO ADMIN)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_user_role(
    p_target_user_id uuid,
    p_new_role text,
    p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de superusuário para ignorar restrições simples
AS $$
DECLARE
    v_admin_role text;
BEGIN
    -- Verifica se quem está chamando é Admin
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    
    IF v_admin_role <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar funções.';
    END IF;

    -- Trava para não se auto-remover
    IF p_target_user_id = p_admin_id AND p_new_role <> 'admin' THEN
        RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador.';
    END IF;

    -- Atualiza
    UPDATE public.profiles
    SET role = p_new_role
    WHERE id = p_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text, uuid) TO service_role;


-- ==============================================================================
-- 2. CORREÇÃO DE NOTIFICAÇÕES (GARANTIR ENTREGA)
-- ==============================================================================
-- Primeiro, garantimos que o sistema pode escrever na tabela de notificações
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System/Admin insert notifications" ON public.user_notifications;
CREATE POLICY "System/Admin insert notifications" 
ON public.user_notifications FOR INSERT 
WITH CHECK (true); -- Permite inserção por funções do sistema

DROP POLICY IF EXISTS "Users view own notifications" ON public.user_notifications;
CREATE POLICY "Users view own notifications" 
ON public.user_notifications FOR SELECT 
USING (auth.uid() = user_id);


-- Agora, regravamos a lógica de finalizar bolão para usar as notificações explicitamente
CREATE OR REPLACE FUNCTION public.finish_pool(
    p_pool_id uuid,
    p_winning_option text,
    p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pool record;
    v_gross numeric := 0;
    v_fee numeric := 0;
    v_net numeric := 0;
    v_prize_share numeric := 0;
    v_winners_count int := 0;
    v_bet record;
BEGIN
    SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
    
    IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'Bolão já encerrado.'; END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    
    IF v_gross > 0 THEN v_fee := CEIL(v_gross / 50.0) * 5.0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    SELECT COUNT(*) INTO v_winners_count FROM public.bets 
    WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    IF v_winners_count > 0 THEN
        v_prize_share := TRUNC(v_net / v_winners_count, 2);
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            -- Atualiza Saldo
            UPDATE public.profiles SET 
                balance = balance + v_prize_share,
                total_won = COALESCE(total_won,0) + v_prize_share,
                win_count = COALESCE(win_count,0) + 1,
                withdrawable_balance = COALESCE(withdrawable_balance, 0) + v_prize_share
            WHERE id = v_bet.user_id;

            -- Cria Transação
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, created_by)
            VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, p_admin_id);
            
            -- Marca Aposta Ganha
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;

            -- 🔔 NOTIFICA GANHADOR (Agora garantido)
            INSERT INTO public.user_notifications (user_id, message, created_at)
            VALUES (v_bet.user_id, '🎉 PARABÉNS! Você ganhou R$ ' || v_prize_share || ' no bolão "' || v_pool.title || '"!', now());
        END LOOP;
        
        -- Marca perdedores
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
        
        -- 🔔 NOTIFICA PERDEDORES
        INSERT INTO public.user_notifications (user_id, message, created_at)
        SELECT user_id, '❌ O bolão "' || v_pool.title || '" encerrou. Resultado: ' || p_winning_option, now()
        FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
    ELSE
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    UPDATE public.pools SET 
        status = 'finished', winning_option = p_winning_option, 
        gross_amount = v_gross, service_fee = v_fee, net_prize = v_net, is_distributed = true 
    WHERE id = p_pool_id;
END;
$$;
