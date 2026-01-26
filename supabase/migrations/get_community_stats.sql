-- RPC to get Community Stats efficiently (Robust Calculation)
-- Returns: total_pools, total_paid
CREATE OR REPLACE FUNCTION public.get_community_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_pools int := 0;
    v_total_paid numeric := 0;
BEGIN
    -- 1. Total Pools Created (All time)
    SELECT COUNT(*) INTO v_total_pools FROM public.pools;

    -- 2. Total Paid Prizes
    -- We calculate dynamically to ensure accuracy even if net_prize column is empty.
    -- Logic: Entry Fee * Participant Count * 0.90 (10% House Fee)
    SELECT COALESCE(SUM(
        (p.entry_fee) * 
        (SELECT COUNT(*) FROM public.bets b WHERE b.pool_id = p.id) * 
        0.90
    ), 0)
    INTO v_total_paid 
    FROM public.pools p
    WHERE p.status = 'finished';

    RETURN json_build_object(
        'total_pools', v_total_pools,
        'total_paid', v_total_paid
    );
END;
$$;

-- Grant permissions to ensure it works for everyone
GRANT EXECUTE ON FUNCTION public.get_community_stats TO anon, authenticated, service_role;
