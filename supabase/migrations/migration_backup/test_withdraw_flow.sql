
-- TEST WITHDRAW FLOW (Automated Verification)
-- Run this script to verify if the Withdraw Flow is working correctly.
-- It uses a transaction with ROLLBACK, so it won't dirty your database.

BEGIN;

DO $$
DECLARE
    v_user_id uuid;
    v_admin_id uuid;
    v_withdraw_id uuid;
    v_balance_before numeric;
    v_balance_after numeric;
    v_withdraw_id_reject uuid;
BEGIN
    RAISE NOTICE '🚀 STARTING WITHDRAW TESTS...';

    ----------------------------------------------------------------
    -- 1. SETUP: Create Mock User & Admin
    ----------------------------------------------------------------
    -- Get an existing admin (or create temp one if needed, but we used existing logic)
    -- Ideally we fetch a real admin to pass the check, or we mock the check.
    -- For this test, we assume the RPC check works. Let's pick the first admin found or create a mock.
    SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin found to test. Please create an admin user first.';
    END IF;

    -- Create Test User
    INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test_withdraw_user@test.com') RETURNING id INTO v_user_id;
    INSERT INTO profiles (id, full_name, role, balance, withdrawable_balance) 
    VALUES (v_user_id, 'Test User Withdraw', 'user', 1000, 1000);

    RAISE NOTICE '✅ Mock User Created (Balance: 1000)';

    ----------------------------------------------------------------
    -- 2. TEST CASE: APPROVED WITHDRAWAL
    ----------------------------------------------------------------
    -- Create Request
    INSERT INTO withdraw_requests (user_id, amount, pix_key) 
    VALUES (v_user_id, 200, 'TEST-PIX-KEY') 
    RETURNING id INTO v_withdraw_id;

    -- Execute RPC (Approve)
    PERFORM public.process_withdraw_request(v_withdraw_id, v_admin_id, 'approve');

    -- Verify Status
    PERFORM 1 FROM withdraw_requests WHERE id = v_withdraw_id AND status = 'approved';
    IF NOT FOUND THEN RAISE EXCEPTION '❌ Failed: Status not updated to approved'; END IF;

    -- Verify Balance Deduction
    SELECT withdrawable_balance INTO v_balance_after FROM profiles WHERE id = v_user_id;
    IF v_balance_after != 800 THEN 
        RAISE EXCEPTION '❌ Failed: Balance not deducted. Expected 800, got %', v_balance_after; 
    END IF;
    
    -- Verify Notification
    PERFORM 1 FROM user_notifications WHERE user_id = v_user_id AND message LIKE '%aprovado%';
    IF NOT FOUND THEN RAISE EXCEPTION '❌ Failed: Approval notification not sent'; END IF;

    RAISE NOTICE '✅ SUCCESS: Approval Flow Passed (Balance deducted correctly)';

    ----------------------------------------------------------------
    -- 3. TEST CASE: REJECTED WITHDRAWAL
    ----------------------------------------------------------------
    -- Reset Balance partially logic is handled by new flow? No, user has 800 now.
    -- Create Request
    INSERT INTO withdraw_requests (user_id, amount, pix_key) 
    VALUES (v_user_id, 300, 'TEST-PIX-KEY-2') 
    RETURNING id INTO v_withdraw_id_reject;

    -- Execute RPC (Reject)
    PERFORM public.process_withdraw_request(v_withdraw_id_reject, v_admin_id, 'reject', 'Invalid Key');

    -- Verify Status
    PERFORM 1 FROM withdraw_requests WHERE id = v_withdraw_id_reject AND status = 'rejected';
    IF NOT FOUND THEN RAISE EXCEPTION '❌ Failed: Status not updated to rejected'; END IF;

    -- Verify Balance UNCHANGED
    SELECT withdrawable_balance INTO v_balance_after FROM profiles WHERE id = v_user_id;
    IF v_balance_after != 800 THEN 
        RAISE EXCEPTION '❌ Failed: Balance changed on rejection! Expected 800, got %', v_balance_after; 
    END IF;

    -- Verify Notification
    PERFORM 1 FROM user_notifications WHERE user_id = v_user_id AND message LIKE '%rejeitada%';
    IF NOT FOUND THEN RAISE EXCEPTION '❌ Failed: Rejection notification not sent'; END IF;

    RAISE NOTICE '✅ SUCCESS: Rejection Flow Passed';
    
    RAISE NOTICE '🎉 ALL WITHDRAW TESTS PASSED SUCCESSFULLY! 🎉';

END $$;

ROLLBACK; -- Always rollback to verify without side effects
