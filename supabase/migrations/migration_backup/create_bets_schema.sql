-- 1. Create 'bets' table
CREATE TABLE IF NOT EXISTS public.bets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    selected_option text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending', -- 'pending', 'won', 'lost'
    created_at timestamp with time zone DEFAULT now(),
    update_count int DEFAULT 0 -- Governance: Max 1 update allowed
);

-- RLS for bets
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all bets" ON public.bets FOR SELECT USING (true);

CREATE POLICY "Users can insert their own bets" ON public.bets 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets" ON public.bets 
FOR UPDATE USING (auth.uid() = user_id);

-- 2. Update 'pools' table with Fee System columns
ALTER TABLE public.pools 
ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_prize numeric DEFAULT 0, -- This is what users see
ADD COLUMN IF NOT EXISTS winning_option text,
ADD COLUMN IF NOT EXISTS is_distributed boolean DEFAULT false;

-- 3. Trigger to calculate totals on new bet (Internal Logic)
-- When a bet is inserted, we update the pool's gross_amount. 
-- The Fee Logic will be handled at the Application/RPC level for flexibility, 
-- or we can do it here. For now, let's keep totals updated.

CREATE OR REPLACE FUNCTION update_pool_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.pools
    SET gross_amount = gross_amount + NEW.amount
    WHERE id = NEW.pool_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_bet_placed ON public.bets;
CREATE TRIGGER on_bet_placed
AFTER INSERT ON public.bets
FOR EACH ROW
EXECUTE FUNCTION update_pool_totals();
