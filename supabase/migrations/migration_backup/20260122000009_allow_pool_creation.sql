-- FIX POOLS RLS
-- Purpose: Allow any authenticated user to CREATE a pool.

-- 1. Enable RLS
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Public pools are viewable by everyone" ON public.pools;
DROP POLICY IF EXISTS "Users can create their own pools" ON public.pools;
DROP POLICY IF EXISTS "Creators can update their own pools" ON public.pools;
DROP POLICY IF EXISTS "Admins can update any pool" ON public.pools;

-- 3. Create Policies

-- SELECT: Everyone can see pools
CREATE POLICY "Public pools are viewable by everyone" 
ON public.pools FOR SELECT 
USING (true);

-- INSERT: Authenticated users can create pools (Must be their own creator_id)
CREATE POLICY "Users can create their own pools" 
ON public.pools FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = creator_id);

-- UPDATE: Creator OR Admin
CREATE POLICY "Creators and Admins can update pools" 
ON public.pools FOR UPDATE 
USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DELETE: Creator OR Admin
CREATE POLICY "Creators and Admins can delete pools" 
ON public.pools FOR DELETE 
USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
