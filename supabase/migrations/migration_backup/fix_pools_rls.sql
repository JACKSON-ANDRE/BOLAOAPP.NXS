-- FIX POOLS RLS
-- Ensure admins can manage pools and users can view them.

-- 1. Enable RLS
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Public can view pools" ON pools;
DROP POLICY IF EXISTS "Admins can manage pools" ON pools;

-- 3. Create Policies
-- Everyone can view pools
CREATE POLICY "Public can view pools" ON pools
FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage pools" ON pools
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
