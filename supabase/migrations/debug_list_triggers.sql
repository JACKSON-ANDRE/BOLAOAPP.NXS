CREATE OR REPLACE FUNCTION public.list_all_triggers()
RETURNS TABLE (
    trigger_name text,
    event_object_table text,
    action_statement text,
    trigger_schema text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.trigger_name::text, 
        tr.event_object_table::text, 
        tr.action_statement::text,
        tr.trigger_schema::text
    FROM information_schema.triggers tr
    WHERE tr.event_object_table IN ('deposits', 'transactions', 'profiles')
    AND tr.trigger_schema = 'public';
END;
$$;
