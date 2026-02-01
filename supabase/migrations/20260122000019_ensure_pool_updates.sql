-- ENSURE POOL UPDATE POLICIES
-- Purpose: Guarantee that Creators and Admins can update their pools.

-- Drop existing update policy to avoid conflicts (or use CREATE OR REPLACE logic if possible, but DROP+CREATE is safer for policies)
DROP POLICY IF EXISTS "Enable update for creators" ON public.pools;
DROP POLICY IF EXISTS "Enable update for admins" ON public.pools;

-- Policy for Creators
CREATE POLICY "Enable update for creators" 
ON public.pools 
FOR UPDATE 
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Policy for Admins
CREATE POLICY "Enable update for admins" 
ON public.pools 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);
