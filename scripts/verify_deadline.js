
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDeadlineLogic() {
    console.log('--- DEADLINE LOGIC VERIFICATION ---');

    // 1. Create a test pool with a PAST deadline
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 10); // 10 minutes ago

    // Create pool as admin/service role
    // Using a random user as creator (frankie or similar if exists, or just create one)
    // For simplicity, we create a pool directly via DB insert (simulating backend check)
    // Actually, let's use the 'pools' table insert.

    const { data: creator } = await supabase.from('profiles').select('id').limit(1).single();
    if (!creator) {
        console.error('No user found to be creator.');
        return;
    }

    const { data: pool, error: poolError } = await supabase
        .from('pools')
        .insert({
            title: 'TEST DEADLINE POOL',
            modality: 'Futebol',
            scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            bets_deadline: pastDate.toISOString(), // ENDED 10 mins ago
            entry_fee: 1,
            options: ['A', 'B'],
            creator_id: creator.id,
            status: 'open'
        })
        .select()
        .single();

    if (poolError) {
        console.error('Failed to create test pool:', poolError);
        return;
    }

    console.log(`Test Pool Created: ${pool.id}`);
    console.log(`Deadline was: ${pool.bets_deadline}`);
    console.log(`Current Time: ${new Date().toISOString()}`);

    // 2. Attempt to call place_bet RPC
    console.log('Attempting to place bet via RPC...');

    const { data: betResult, error: betError } = await supabase.rpc('place_bet', {
        p_pool_id: pool.id,
        p_user_id: creator.id,
        p_selected_option: 'A'
    });

    if (betError) {
        console.log('✅ SUCCESS: Bet was REJECTED as expected.');
        console.log('Error Message:', betError.message);
    } else {
        console.error('❌ FAILURE: Bet was ACCEPTED! This is a bug.');
        console.log('Result:', betResult);
    }

    // Double check: Try to UPDATE a bet?
    // First we need a bet. But we can't place one in this pool.
    // So let's create a pool that is OPEN, place a bet, then CLOSE it (expire deadline), and try to update.

    // Cleanup
    await supabase.from('pools').delete().eq('id', pool.id);
}

verifyDeadlineLogic();
