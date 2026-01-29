INSERT INTO public.pools (
    title, 
    modality, 
    description, 
    entry_fee, 
    options, 
    creator_id, 
    scheduled_at, 
    bets_deadline, 
    status
) VALUES (
    'BOLÃO TESTE - VERIFICAÇÃO FINAL 🚀', 
    'Futebol', 
    'Teste de fluxo real para validar segurança financeira.', 
    1.00, 
    ARRAY['A', 'B'], 
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1), 
    NOW() + interval '2 hours', 
    NOW() + interval '1 hour', 
    'open'
);
