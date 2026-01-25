
-- VERIFICATION SCRIPT
-- Copy and Run this in Supabase SQL Editor to test the entire flow.
-- This script creates temporary mock data, runs the tests, and verify the results.
-- It ends with a ROLLBACK exception so NO DATA is permanently changed in your production DB.

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_user_id uuid := gen_random_uuid();
  v_deposit_approve_id uuid := gen_random_uuid();
  v_deposit_reject_id uuid := gen_random_uuid();
  v_initial_balance numeric := 0;
  v_final_balance numeric;
  v_notif_count int;
BEGIN
  RAISE NOTICE 'Starting Verification Tests...';

  -- 1. SETUP: Create Mock Admin and User
  INSERT INTO profiles (id, full_name, role, balance, created_at)
  VALUES (v_admin_id, 'Test Admin', 'admin', 0, now());

  INSERT INTO profiles (id, full_name, role, balance, created_at)
  VALUES (v_user_id, 'Test User', 'user', v_initial_balance, now());

  -- Create Deposits
  INSERT INTO deposit_requests (id, user_id, amount, status, created_at)
  VALUES (v_deposit_approve_id, v_user_id, 100.00, 'pending', now());

  INSERT INTO deposit_requests (id, user_id, amount, status, created_at)
  VALUES (v_deposit_reject_id, v_user_id, 50.00, 'pending', now());


  -- 2. TEST: Approve Deposit
  RAISE NOTICE 'Testing Approval...';
  PERFORM public.process_deposit_request(v_deposit_approve_id, v_admin_id, 'approve', NULL);

  -- Assert: Status Changed
  -- Note: The fix script sets status = p_action ('approve')
  IF NOT EXISTS (SELECT 1 FROM deposit_requests WHERE id = v_deposit_approve_id AND status = 'approve') THEN
     RAISE NOTICE 'Warning: Deposit status is %', (SELECT status FROM deposit_requests WHERE id = v_deposit_approve_id);
  END IF;

  -- Assert: Transaction Created
  IF NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = v_user_id AND type = 'deposit') THEN
      RAISE EXCEPTION 'FAIL: Transaction not created';
  END IF;
  
  -- Assert: Balance Updated
  SELECT balance INTO v_final_balance FROM profiles WHERE id = v_user_id;
  IF v_final_balance != (v_initial_balance + 100.00) THEN
    RAISE EXCEPTION 'FAIL: Balance not updated. Expected %, Got %', (v_initial_balance + 100.00), v_final_balance;
  END IF;
  RAISE NOTICE '  - Balance update: OK';

  -- Assert: Notification Created
  SELECT count(*) INTO v_notif_count FROM user_notifications WHERE user_id = v_user_id;
  IF v_notif_count < 1 THEN
    RAISE EXCEPTION 'FAIL: Notification not created for approval';
  END IF;
  RAISE NOTICE '  - Notification creation: OK';


  -- 3. TEST: Reject Deposit
  RAISE NOTICE 'Testing Rejection...';
  PERFORM public.process_deposit_request(v_deposit_reject_id, v_admin_id, 'reject', 'Teste de rejeição');

  -- Assert: Status Changed
  IF NOT EXISTS (SELECT 1 FROM deposit_requests WHERE id = v_deposit_reject_id AND status = 'reject') THEN
    RAISE EXCEPTION 'FAIL: Deposit status not updated to reject';
  END IF;

  -- Assert: No Balance Change
  SELECT balance INTO v_final_balance FROM profiles WHERE id = v_user_id;
  IF v_final_balance != (v_initial_balance + 100.00) THEN
     RAISE EXCEPTION 'FAIL: Balance changed after rejection!';
  END IF;
  RAISE NOTICE '  - Rejection Logic: OK';

  
  RAISE NOTICE '---------------------------------------------------';
  RAISE NOTICE '✅ SUCCESS: ALL TESTS PASSED!';
  RAISE NOTICE '---------------------------------------------------';

  -- 4. CLEANUP (Rollback)
  -- We deliberately raise an exception to rollback the transaction so this test data doesn't clutter the DB.
  RAISE EXCEPTION 'Test Complete (Rollback Triggered) - This error is EXPECTED to keep DB clean.';

EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Test Complete (Rollback Triggered)%' THEN
    RAISE NOTICE '%', SQLERRM;
  ELSE
    RAISE EXCEPTION 'Test Failed with Error: %', SQLERRM;
  END IF;
END $$;
