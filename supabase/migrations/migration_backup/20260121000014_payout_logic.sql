-- RPC: Distribute Pool Prizes
-- Calculates winnings and credits strictly to withdrawable_balance via 'winning' transaction type.

CREATE OR REPLACE FUNCTION public.distribute_pool_prizes(
  p_pool_id uuid,
  p_result text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool record;
  v_total_pool_amount numeric;
  v_winner_count integer;
  v_prize_per_winner numeric;
  v_winner record;
BEGIN
  -- 1. Check Admin Permission
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores.';
  END IF;

  -- 2. Fetch Pool
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bolão não encontrado.';
  END IF;

  IF v_pool.status = 'finished' THEN
    RAISE EXCEPTION 'Este bolão já foi finalizado.';
  END IF;

  -- 3. Calculate Prize Pool (Total Bets)
  -- Assuming prize is sum of all bets (or fixed entry fee * participants)
  -- Let's use actual bets table to be safe
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pool_amount
  FROM bets
  WHERE pool_id = p_pool_id;

  IF v_total_pool_amount = 0 THEN
    -- No bets, just close the pool
    UPDATE pools SET status = 'finished', result = p_result WHERE id = p_pool_id;
    RETURN;
  END IF;

  -- 4. Find Winners
  SELECT COUNT(*) INTO v_winner_count
  FROM bets
  WHERE pool_id = p_pool_id AND selected_option = p_result;

  -- 5. Distribute Prizes
  IF v_winner_count > 0 THEN
    v_prize_per_winner := TRUNC(v_total_pool_amount / v_winner_count, 2); -- Rounds down to 2 decimals to avoid floating point issues

    FOR v_winner IN
      SELECT user_id, id as bet_id FROM bets WHERE pool_id = p_pool_id AND selected_option = p_result
    LOOP
      -- Create Winning Transaction
      -- The Trigger handle_new_transaction will catch type='winning' and add to withdrawable_balance
      INSERT INTO transactions (user_id, amount, type, status, reference_id, created_at, created_by, balance_type)
      VALUES (
        v_winner.user_id,
        v_prize_per_winner,
        'winning',
        'approved',
        p_pool_id, -- Reference to pool
        now(),
        p_admin_id,
        'withdrawable' -- Metadata explicit
      );

      -- Notify Winner
      INSERT INTO user_notifications (user_id, message, created_at)
      VALUES (
        v_winner.user_id, 
        'Parabéns! Você venceu o bolão "' || v_pool.title || '". Prêmio de R$ ' || v_prize_per_winner || ' creditado no saldo de saque.', 
        now()
      );

      -- Update Bet Status
      UPDATE bets SET status = 'won' WHERE id = v_winner.bet_id;
    END LOOP;
  ELSE
    -- No winners (House keeps? Or Refund? Assuming House keeps for now or accumulator)
    NULL; 
  END IF;

  -- 6. Update Losers
  UPDATE bets 
  SET status = 'lost' 
  WHERE pool_id = p_pool_id AND selected_option != p_result;

  -- 7. Finish Pool
  UPDATE pools 
  SET status = 'finished', 
      result = p_result 
  WHERE id = p_pool_id;

END;
$$;
