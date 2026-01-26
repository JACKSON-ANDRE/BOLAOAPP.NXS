-- DIAGNOSE POOLS DATA FOR STATS
SELECT 
    status, 
    COUNT(*) as count, 
    SUM(entry_fee) as total_entry,
    SUM(net_prize) as total_net_prize,
    SUM(gross_amount) as total_gross
FROM public.pools
GROUP BY status;

-- Check specific finished pools
SELECT id, title, status, entry_fee, net_prize, gross_amount, is_distributed 
FROM public.pools 
WHERE status IN ('finished', 'closed') 
LIMIT 10;
