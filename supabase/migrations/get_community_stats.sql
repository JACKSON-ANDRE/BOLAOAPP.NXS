-- RPC to get Community Stats efficiently
-- Returns: total_pools, total_paid, biggest_prize
CREATE OR REPLACE FUNCTION public.get_community_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_pools int;
    v_total_paid numeric;
    v_biggest_prize numeric;
BEGIN
    -- 1. Total Pools Created
    SELECT COUNT(*) INTO v_total_pools FROM public.pools;

    -- 2. Total Paid Prizes (Transactions of type 'winning')
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
    FROM public.transactions 
    WHERE type = 'winning' AND status = 'approved';

    -- 3. Biggest Prize Paid (Single win)
    SELECT COALESCE(MAX(amount), 0) INTO v_biggest_prize 
    FROM public.transactions 
    WHERE type = 'winning' AND status = 'approved';

    RETURN json_build_object(
        'total_pools', v_total_pools,
        'total_paid', v_total_paid,
        'biggest_prize', v_biggest_prize
    );
END;
$$;
