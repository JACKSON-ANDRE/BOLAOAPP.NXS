-- INSPECT DATA FOR DEBUGGING
-- 1. Get the specific notification(s) created recently
-- 2. Check who received them.

WITH last_withdraw_requests AS (
    SELECT id, user_id, amount, status, created_at, reviewed_at
    FROM withdraw_requests
    ORDER BY reviewed_at DESC NULLS LAST
    LIMIT 3
)
SELECT 
    'WITHDRAW_REQUEST' as type,
    w.id::text as id,
    w.user_id,
    p.email as user_email,
    w.amount::text,
    w.status,
    w.reviewed_at::text
FROM last_withdraw_requests w
JOIN profiles p ON w.user_id = p.id

UNION ALL

-- Check notifications created in the last 10 minutes
SELECT 
    'NOTIFICATION' as type,
    n.id::text,
    n.user_id,
    p.email as user_email,
    n.message,
    '---' as status,
    n.created_at::text
FROM user_notifications n
JOIN profiles p ON n.user_id = p.id
ORDER BY id DESC
LIMIT 10;
