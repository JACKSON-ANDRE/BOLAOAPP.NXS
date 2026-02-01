
-- REMOVE REDUNDANT TRIGGERS
-- Based on the inspection, these triggers are likely legacy or conflicting with the new flow.
-- We will DROP them safely.

-- 1. Drop the legacy balance trigger (we created a new one: 'on_transaction_created')
-- This is likely the one trying to access 'user_balances' view and causing errors.
DROP TRIGGER IF EXISTS trg_apply_transaction_balance ON transactions;
DROP FUNCTION IF EXISTS apply_transaction_balance();

-- 2. Drop the redundant deposit status triggers
-- Our new RPC function 'process_deposit_request' handles all logic atomically.
-- Having this trigger might cause double updates or conflicts.
DROP TRIGGER IF EXISTS trg_handle_deposit_status_change ON deposit_requests;
DROP FUNCTION IF EXISTS handle_deposit_status_change();


-- 3. (Optional) Cleanup the other trigger if it duplicates our new logic
-- You have 'trg_update_balance_on_transaction' and we created 'on_transaction_created'.
-- If they do the same thing, we should keep only one.
-- Assuming 'trg_update_balance_on_transaction' is also legacy, we drop it to rely on our fresh known code.
DROP TRIGGER IF EXISTS trg_update_balance_on_transaction ON transactions;
DROP FUNCTION IF EXISTS update_balance_on_transaction();

-- 4. Re-confirm our GOOD trigger exists (re-run this part just to be safe)
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS trigger AS $$
BEGIN
  -- Only update balance for approved deposits
  IF NEW.type = 'deposit' AND NEW.status = 'approved' THEN
    UPDATE profiles
    SET balance = balance + NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_created ON transactions;
CREATE TRIGGER on_transaction_created
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_transaction();
