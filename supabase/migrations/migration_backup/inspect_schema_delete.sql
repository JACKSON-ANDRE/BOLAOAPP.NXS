-- Check if notifications table exists
SELECT * FROM information_schema.tables WHERE table_name = 'notifications';

-- Check transaction_type enum values
SELECT enum_range(NULL::transaction_type);
