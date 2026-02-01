-- COMPREHENSIVE RLS REPAIR
-- The goal is to ensure Authenticated Users can ALWAYS see their own data.

-- 1. PROFILES (Re-verify)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- 2. TRANSACTIONS (Critical for Wallet)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- 3. USER NOTIFICATIONS (Critical for Header)
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);

-- 4. BETS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own bets" ON public.bets;
CREATE POLICY "Users can view own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);

-- 5. DEPOSIT REQUESTS
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposit_requests;
CREATE POLICY "Users can view own deposits" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);

-- 6. WITHDRAW REQUESTS
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own withdraws" ON public.withdraw_requests;
CREATE POLICY "Users can view own withdraws" ON public.withdraw_requests FOR SELECT USING (auth.uid() = user_id);

-- 7. POOLS (Public read for active pools)
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view pools" ON public.pools;
CREATE POLICY "Public can view pools" ON public.pools FOR SELECT USING (true);
