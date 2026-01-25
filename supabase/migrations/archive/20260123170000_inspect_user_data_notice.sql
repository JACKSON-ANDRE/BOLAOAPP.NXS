DO $$
DECLARE
    v_user record;
    v_profile record;
BEGIN
    -- Get Auth Data
    SELECT id, email, raw_user_meta_data, created_at INTO v_user 
    FROM auth.users 
    WHERE email = 'upmarketingassessoria@gmail.com';

    -- Get Profile Data
    SELECT id, full_name, role, balance, withdrawable_balance INTO v_profile 
    FROM public.profiles 
    WHERE email = 'upmarketingassessoria@gmail.com';

    IF v_user.id IS NULL THEN
        RAISE NOTICE '❌ AUTH USER NOT FOUND for upmarketingassessoria@gmail.com';
    ELSE
        RAISE NOTICE '✅ AUTH FOUND: ID=%, Email=%, CreatedAt=%', v_user.id, v_user.email, v_user.created_at;
    END IF;

    IF v_profile.id IS NULL THEN
        RAISE NOTICE '❌ PROFILE NOT FOUND for email %', 'upmarketingassessoria@gmail.com';
    ELSE
        RAISE NOTICE '✅ PROFILE FOUND: ID=%, Name=%, Role=%, Balance=%, Withdrawable=%', 
            v_profile.id, v_profile.full_name, v_profile.role, v_profile.balance, v_profile.withdrawable_balance;
            
        IF v_user.id != v_profile.id THEN
            RAISE NOTICE '!!! MISMATCH !!! Auth ID (%) != Profile ID (%)', v_user.id, v_profile.id;
        ELSE
            RAISE NOTICE '✅ ID MATCH CONFIRMED';
        END IF;
    END IF;

END $$;
