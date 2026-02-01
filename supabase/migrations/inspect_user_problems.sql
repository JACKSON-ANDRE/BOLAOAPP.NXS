-- 🔍 DIAGNÓSTICO DE PERFIL E PERMISSÕES

-- 1. Verifica se o usuário existe na tabela auth.users (Substitua o email se souber, ou deixe genérico)
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verifica se existe perfil para esses usuários
SELECT p.id, p.full_name, p.balance, p.whatsapp, u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 3. Verifica as Políticas de Segurança (RLS) ativas na tabela profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Tenta simular um acesso (apenas informativo)
-- Se esta query retornar vazia, o RLS está bloqueando ou o dado não existe.
SELECT count(*) as total_profiles_visiveis_anonimo FROM public.profiles;
