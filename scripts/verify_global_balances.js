
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using Service Role to bypass RLS and see everyone

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars (need SUPABASE_SERVICE_ROLE_KEY for this check)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBalances() {
    console.log('Checking all user balances (Admin View)...');

    // Select total count and a sample of users with balance > 0
    const { data: allUsers, error: countError } = await supabase
        .from('profiles')
        .select('id, full_name, balance, role')
        .gt('balance', 0)
        .limit(10);

    const { count, error: totalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (countError || totalError) {
        console.error('Error fetching profiles:', countError || totalError);
        return;
    }

    console.log(`Total users in DB: ${count}`);
    console.log(`Checking for users with POSITIVE balance...`);

    if (allUsers && allUsers.length > 0) {
        console.log(`Found users with money! displaying top ${allUsers.length}:`);
        allUsers.forEach(u => {
            console.log(`- ${u.full_name} (${u.role}): R$ ${u.balance}`);
        });
        console.log('\nCONCLUSION: Data is INTEGRO. Balances exist in the database.');
    } else {
        console.log('WARNING: No users with balance > 0 found in the sample. This requires deeper investigation.');

        // Let's check if there are ANY users
        const { data: anyUser } = await supabase.from('profiles').select('id, full_name, balance').limit(5);
        console.log('Sample of ANY users:', anyUser);
    }
}

checkBalances();
