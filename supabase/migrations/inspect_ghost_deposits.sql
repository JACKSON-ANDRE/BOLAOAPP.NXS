-- FIND GHOST APPROVALS
-- Deposits marked as 'approved' but without a corresponding 'deposit' transaction for that request.

SELECT 
    d.id,
    d.user_id,
    p.full_name,
    d.amount,
    d.created_at,
    d.updated_at
FROM public.deposit_requests d
JOIN public.profiles p ON p.id = d.user_id
WHERE d.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.reference_id = d.id 
    AND t.type = 'deposit'
);
