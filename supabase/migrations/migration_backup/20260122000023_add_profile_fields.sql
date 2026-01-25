-- ADD CITY AND STATE TO PROFILES
-- Purpose: Support new profile completion requirements.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;

-- Optional: Add check constraint for length if desired, but text is fine.
-- Whatsapp is already there (phone or whatsapp column? Let's assume user meant 'phone' or add 'whatsapp' if needed)
-- Standardizing on 'whatsapp' if 'phone' is ambiguous, but usually 'phone' is used.
-- Let's check if 'whatsapp' exists or we use 'phone'.
-- Previous context implies 'whatsapp' requirement. Let's add it if missing or map to phone.
-- Safest: Add 'whatsapp' column explicitly if not exists.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
