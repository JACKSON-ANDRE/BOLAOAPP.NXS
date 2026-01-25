-- 📦 BOLÃO APP - RELEASE 1.0 SCHEMA (SQUASHED)
-- Data: 24/01/2026
-- Contém: Estrutura Completa, Funções RPC, Triggers e RLS.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- -----------------------------------------------------------------------------
-- 1. TABLES & ENUMS
-- -----------------------------------------------------------------------------

-- Settings Global
CREATE TABLE IF NOT EXISTS public.app_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    maintenance_mode boolean DEFAULT false,
    allow_bets boolean DEFAULT true,
    min_deposit numeric DEFAULT 10.00,
    min_withdraw numeric DEFAULT 20.00,
    updated_at timestamp with time zone DEFAULT now()
);

-- Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    avatar_url text,
    role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    
    -- Financial Cache
    balance numeric DEFAULT 0.00, -- Saldo JOGAVEL (Depósitos + Ganhos)
    withdrawable_balance numeric DEFAULT 0.00, -- Saldo SAQUÁVEL (Ganhos)
    
    -- Personal Info
    cpf text,
    pix_key text,
    whatsapp text,
    city text,
    state text,
    
    -- Gamification Stats
    total_won numeric DEFAULT 0.00,
    win_count integer DEFAULT 0,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

-- Pools (Bolões)
CREATE TABLE IF NOT EXISTS public.pools (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id uuid REFERENCES public.profiles(id),
    title text NOT NULL,
    modality text NOT NULL, -- 'Futebol', 'Vale Tudo', etc.
    description text,
    
    -- Dates
    scheduled_at timestamp with time zone NOT NULL, -- Data do Evento
    bets_deadline timestamp with time zone NOT NULL, -- Data limite aposta
    
    -- Money
    entry_fee numeric NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
    
    -- Config
    min_participants integer DEFAULT 2,
    max_participants integer DEFAULT 100,
    options text[] NOT NULL DEFAULT '{}', -- ['Time A', 'Time B']
    
    -- Status
    status text DEFAULT 'open' CHECK (status IN ('open', 'finished', 'canceled', 'paused')),
    winning_option text,
    
    -- Financial Result
    gross_amount numeric DEFAULT 0,
    service_fee numeric DEFAULT 0,
    net_prize numeric DEFAULT 0,
    is_distributed boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT now()
);

-- Bets (Apostas)
CREATE TABLE IF NOT EXISTS public.bets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pool_id uuid REFERENCES public.pools(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id),
    
    amount numeric NOT NULL CHECK (amount > 0),
    selected_option text NOT NULL,
    
    status text DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'refunded')),
    
    created_at timestamp with time zone DEFAULT now()
);

-- Transactions (Extrato Financeiro)
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    
    amount numeric NOT NULL, -- Pode ser negativo para débitos? Não, usar types.
    type text NOT NULL CHECK (type IN ('deposit', 'withdraw', 'withdrawal', 'bet', 'winning', 'refund', 'bonus', 'adjustment')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'rejected', 'failed')),
    
    balance_type text DEFAULT 'balance', -- 'balance' or 'withdrawable'
    reference_id uuid, -- Link para Pool ou Request
    
    description text,
    created_by uuid REFERENCES public.profiles(id), -- Quem gerou (Admin ou System)
    created_at timestamp with time zone DEFAULT now()
);

-- Deposit Requests (Depósitos Manuais/Pix)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    amount numeric NOT NULL CHECK (amount > 0),
    proof_url text, -- URL da imagem do comprovante
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

-- Withdraw Requests (Solicitações de Saque)
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    amount numeric NOT NULL CHECK (amount > 0),
    pix_key text NOT NULL,
    pix_type text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

-- User Notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    message text NOT NULL,
    type text DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);

-- -----------------------------------------------------------------------------
-- 2. FUNCTIONS & RPCs
-- -----------------------------------------------------------------------------

-- Notification Trigger Function
CREATE OR REPLACE FUNCTION public.notify_pool_creation()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, message, created_at)
  VALUES (NEW.creator_id, '🏆 Bolão criado com sucesso! Compartilhe: ' || NEW.title, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finish Pool Logic (Settle Bets)
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

    -- Calc values
    SELECT COALESCE(SUM(amount), 0) INTO v_gross FROM public.bets WHERE pool_id = p_pool_id;
    
    IF v_gross > 0 THEN v_fee := CEIL(v_gross / 50.0) * 5.0; END IF;
    v_net := v_gross - v_fee;
    IF v_net < 0 THEN v_net := 0; END IF;

    -- Winners
    SELECT COUNT(*) INTO v_winners_count FROM public.bets 
    WHERE pool_id = p_pool_id AND selected_option = p_winning_option;

    IF v_winners_count > 0 THEN
        v_prize_share := TRUNC(v_net / v_winners_count, 2);
        
        FOR v_bet IN SELECT * FROM public.bets WHERE pool_id = p_pool_id AND selected_option = p_winning_option LOOP
            -- Update Winner
            UPDATE public.profiles SET 
                balance = balance + v_prize_share,
                total_won = COALESCE(total_won,0) + v_prize_share,
                win_count = COALESCE(win_count,0) + 1
            WHERE id = v_bet.user_id;

            -- Transaçao
            INSERT INTO public.transactions (user_id, amount, type, status, reference_id, created_by)
            VALUES (v_bet.user_id, v_prize_share, 'winning', 'approved', p_pool_id, p_admin_id);
            
            UPDATE public.bets SET status = 'won' WHERE id = v_bet.id;

            -- Notify
            INSERT INTO public.user_notifications (user_id, message, created_at)
            VALUES (v_bet.user_id, '🎉 PARABÉNS! Você ganhou R$ ' || v_prize_share || ' no bolão "' || v_pool.title || '"!', now());
        END LOOP;
        
        -- Losers
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
        
        INSERT INTO public.user_notifications (user_id, message, created_at)
        SELECT user_id, '❌ O bolão "' || v_pool.title || '" encerrou. Resultado: ' || p_winning_option, now()
        FROM public.bets WHERE pool_id = p_pool_id AND selected_option <> p_winning_option;
    ELSE
        -- Reimburse or House keeps? Usually house keeps if no winners, or refund. 
        -- For simplicity here: House keeps (status finished), users lose.
        UPDATE public.bets SET status = 'lost' WHERE pool_id = p_pool_id;
    END IF;

    UPDATE public.pools SET 
        status = 'finished', winning_option = p_winning_option, 
        gross_amount = v_gross, service_fee = v_fee, net_prize = v_net, is_distributed = true 
    WHERE id = p_pool_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. TRIGGERS
-- -----------------------------------------------------------------------------

-- Auto-Notify Pool Creation
DROP TRIGGER IF EXISTS on_pool_created ON public.pools;
CREATE TRIGGER on_pool_created
  AFTER INSERT ON public.pools
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pool_creation();

-- New User Handler (Sync Auth -> Profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New Auth User
-- (Note: Needs specific permission in Supabase Dashboard usually, but defining here for completeness)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. RLS POLICIES (Secure Access)
-- -----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Public Read (Minimal), Self Update
CREATE POLICY "Public Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Self Update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Pools: Public Read, Auth Create (if allowed), Admin Manage
CREATE POLICY "Public Pools" ON pools FOR SELECT USING (true);
CREATE POLICY "Auth Create Pool" ON pools FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin Manage Pools" ON pools FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bets: Self Read, Self Create
CREATE POLICY "My Bets" ON bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Place Bet" ON bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- App Settings: Admin Write, Public Read
CREATE POLICY "Public Settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admin Settings" ON app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
