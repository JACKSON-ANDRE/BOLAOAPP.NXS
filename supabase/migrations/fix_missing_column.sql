-- CORREÇÃO: ADICIONAR COLUNA FALTANTE
-- O código "Robusto" tenta atualizar o contador de participantes, mas a coluna não existia.
-- Vamos criar ela agora e já preencher com os valores certos.

DO $$
BEGIN
    -- 1. Criar a coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pools' AND column_name = 'current_participants') THEN
        ALTER TABLE public.pools ADD COLUMN current_participants INTEGER DEFAULT 0;
    END IF;

    -- 2. Recalcular contagem para bolões existentes (Backfill)
    UPDATE public.pools p
    SET current_participants = (
        SELECT COUNT(*) 
        FROM public.bets b 
        WHERE b.pool_id = p.id
    );

END $$;
