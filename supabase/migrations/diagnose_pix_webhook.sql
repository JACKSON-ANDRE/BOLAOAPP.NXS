-- DIAGNOSTIC QUERY: Check webhook logs and deposits status
-- DO NOT MODIFY ANY DATA - JUST CHECKING STATUS

-- 1. Check all webhook logs from today (last 2 hours)
SELECT 
    id,
    created_at,
    source,
    payload->'body'->>'action' as action,
    payload->'body'->'data'->>'id' as payment_id
FROM webhook_logs 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check deposits from today
SELECT 
    id,
    user_id,
    amount,
    status,
    external_reference,
    mp_payment_id,
    created_at
FROM deposits
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check your specific user's current balance (DO NOT MODIFY)
SELECT 
    id,
    full_name,
    balance,
    withdrawable_balance
FROM profiles
WHERE id = '1e53d3ea-b75a-42ff-b4fa-a06324f131e3';
