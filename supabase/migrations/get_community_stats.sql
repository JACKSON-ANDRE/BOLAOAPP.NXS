-- RPC to get Community Stats efficiently (Aligned with Admin Panel Logic)
-- Returns: total_pools, total_paid
CREATE OR REPLACE FUNCTION public.get_community_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_pools int;
    v_total_paid numeric;
BEGIN
    -- 1. Total Pools Created (All time)
    SELECT COUNT(*) INTO v_total_pools FROM public.pools;

    -- 2. Total Paid Prizes (Sum of net_prize from FINISHED pools)
    -- Using the stored net_prize ensured consistency with the finish_pool logic.
    SELECT COALESCE(SUM(net_prize), 0) INTO v_total_paid 
    FROM public.pools 
    WHERE status = 'finished';

    RETURN json_build_object(
        'total_pools', v_total_pools,
        'total_paid', v_total_paid
    );
END;
$$;
