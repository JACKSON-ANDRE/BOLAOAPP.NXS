
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DEPOSIT_ID = '4fa323e3-8932-4e37-b782-e48bef0ad615';
const MOCK_MP_ID = 'TEST_PAY_' + Date.now(); // Unique ID each run

async function run() {
    console.log(`🔄 Attempting to approve deposit ${DEPOSIT_ID} with MP_ID: ${MOCK_MP_ID}`);

    // 1. Approve
    const { data, error } = await supabase
        .from('deposits')
        .update({
            status: 'approved',
            mp_id: MOCK_MP_ID
        })
        .eq('id', DEPOSIT_ID)
        .select();

    if (error) {
        console.error('❌ Error approving:', error);
    } else {
        console.log('✅ Approved!', data);
    }

    // 2. Wait a bit for Trigger
    await new Promise(r => setTimeout(r, 2000));

    // 3. Check Transaction
    const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_id', MOCK_MP_ID);

    if (tx && tx.length > 0) {
        console.log(`✅ Transaction created: ID ${tx[0].id}, Amount: ${tx[0].amount}`);
    } else {
        console.log('❌ Transaction NOT found! Trigger might have failed.');
    }

    // 4. Test Duplication (Try to use same MP_ID on another deposit? Or same deposit?)
    // Let's try to approve the SAME deposit again (should stick)
    // Or create a NEW fake deposit and try to use SAME MP_ID (this is the real test)

    console.log('🛡️ Testing Anti-Duplication...');

    // Create a fake pending deposit
    const { data: fakeDep } = await supabase.from('deposits').insert({
        user_id: 'b1a75faa-590d-4de6-b23a-daa26ac4bec6',
        amount: 500.00,
        status: 'pending',
        is_auto: true
    }).select().single();

    if (!fakeDep) {
        console.log('❌ Failed to create fake test deposit.');
        return;
    }

    const { error: dupError } = await supabase
        .from('deposits')
        .update({
            status: 'approved',
            mp_id: MOCK_MP_ID // REUSING SAME ID
        })
        .eq('id', fakeDep.id);

    if (dupError) {
        console.log('✅ Anti-Duplication WORKED! Error caught:', dupError.message);
    } else {
        console.log('⚠️ Warning: Application allowed duplicate logic, checking DB constraint...');
        // Check if the update actually happened?
        const { data: checkFake } = await supabase.from('deposits').select('status').eq('id', fakeDep.id).single();
        if (checkFake.status === 'pending') {
            console.log('✅ Although no error threw (maybe RLS?), the status remained PENDING. Update rejected.');
        } else {
            console.log('❌ CRITICAL: DUPLICATE PROCESSED. STATUS CHANGED TO APPROVED.');
        }
    }

    // Clean up fake
    await supabase.from('deposits').delete().eq('id', fakeDep.id);
}

run();
