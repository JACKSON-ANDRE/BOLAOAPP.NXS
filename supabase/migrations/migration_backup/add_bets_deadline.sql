-- Add bets_deadline column to pools table
-- This allows specifying exact date and time when bets close.

ALTER TABLE public.pools 
ADD COLUMN IF NOT EXISTS bets_deadline timestamp with time zone;

-- Optional: set a default to scheduled_at if null, but better to leave null if optional or enforce if required.
-- User wants it in creation, so we will enforce it in frontend.
