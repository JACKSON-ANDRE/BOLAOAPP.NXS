-- CREATE POOLS TABLE
-- Required because the table is missing, causing 404 errors on fetch.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.pools (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id uuid REFERENCES auth.users(id),
    title text NOT NULL,
    modality text NOT NULL, -- 'times', 'placar', etc.
    scheduled_at timestamp with time zone NOT NULL,
    entry_fee numeric NOT NULL DEFAULT 0,
    options text[] NOT NULL DEFAULT '{}', -- Array of options e.g. ["Time A", "Empate", "Time B"]
    status text DEFAULT 'open' CHECK (status IN ('open', 'finished', 'canceled')),
    result text, -- The winning option
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
-- Everyone can view pools
CREATE POLICY "Public can view pools" ON pools
FOR SELECT USING (true);

-- Only admins can insert/update
CREATE POLICY "Admins can manage pools" ON pools
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
