-- 1. VERIFICAR QUEM É ADMIN ATUALMENTE
SELECT id, email, role, full_name 
FROM profiles 
WHERE role = 'admin';

-- 2. SE SEU EMAIL NÃO ESTIVER NA LISTA ACIMA, EXECUTE O COMANDO ABAIXO
-- (Substitua 'seu_email@exemplo.com' pelo seu email real)

-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'seu_email@exemplo.com';

-- 3. DEPOIS DE VALIDAR, VERIFIQUE SE DEU CERTO:
-- SELECT role FROM profiles WHERE email = 'seu_email@exemplo.com';
