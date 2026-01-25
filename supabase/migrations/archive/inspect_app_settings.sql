-- Check table existence and columns
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'app_settings';

-- Check if there is data
SELECT * FROM public.app_settings;

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'app_settings';
