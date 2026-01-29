-- ⚡ ENABLE REALTIME FOR DEPOSITS ⚡
-- This ensures the "SALDO APROVADO!" modal appears instantly in the UI.

-- 1. Add to publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'deposits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
  END IF;
END $$;

-- 2. Ensure Realtime can filter by user_id on updates
ALTER TABLE public.deposits REPLICA IDENTITY FULL;
