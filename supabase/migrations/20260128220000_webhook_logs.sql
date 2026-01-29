-- Create table for debugging webhooks
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source text,
    payload jsonb,
    headers jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow all for debugging (Temporary)
CREATE POLICY "Enable all for everyone" ON public.webhook_logs FOR ALL USING (true) WITH CHECK (true);
