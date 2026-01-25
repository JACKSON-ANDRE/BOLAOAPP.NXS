-- 🌱 SEEDS: Dados Iniciais e Configurações

-- 1. Garante Settings Iniciais
INSERT INTO public.app_settings (maintenance_mode, allow_bets, min_deposit)
VALUES (false, true, 10.00)
ON CONFLICT DO NOTHING;

-- 2. Garante Admin (exemplo - ajuste com o ID real se souber ou deixe dinâmico)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu_email_admin@gmail.com'; 
-- (Comentado para não over-write perigoso, usar script específico para admin)
