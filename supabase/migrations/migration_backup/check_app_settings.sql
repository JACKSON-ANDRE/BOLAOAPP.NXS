SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
  AND table_name = 'app_settings';

SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'app_settings';
