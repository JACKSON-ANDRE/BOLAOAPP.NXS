-- INVESTIGAÇÃO DE TIPOS "ILEGAIS"
-- Vamos descobrir qual tipo de transação está no banco que não estava na nossa lista.
-- Assim podemos adicioná-lo na lista permitida e ativar a segurança corretamente.

SELECT type, COUNT(*) as quantidade
FROM public.transactions
GROUP BY type;
