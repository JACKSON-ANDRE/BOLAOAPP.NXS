
-- FIX DEPOSIT REQUESTS SCHEMA
-- The error "column updated_at of relation deposit_requests does not exist" indicates this table is also missing audit columns.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deposit_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposit_requests' AND column_name = 'updated_at') THEN
            ALTER TABLE deposit_requests ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        END IF;
    END IF;
END $$;
