

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv can be finicky with paths in some setups
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envLines = envConfig.split('\n');

let VITE_SUPABASE_URL = '';
let VITE_SUPABASE_SERVICE_ROLE_KEY = '';

envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        if (key.trim() === 'VITE_SUPABASE_URL') VITE_SUPABASE_URL = value.trim();
        if (key.trim() === 'VITE_SUPABASE_SERVICE_ROLE_KEY') VITE_SUPABASE_SERVICE_ROLE_KEY = value.trim();
    }
});

const supabaseUrl = VITE_SUPABASE_URL;
const supabaseKey = VITE_SUPABASE_SERVICE_ROLE_KEY;


if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBalance() {
    console.log('Fetching balance for Jackson André...');

    // Try to find by name since that's what we have in the screenshot
    // Or simply list the most recent deposit user

    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, balance, withdrawable_balance')
        .ilike('full_name', '%Jackson André%')
        .limit(1);

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (users && users.length > 0) {
        const user = users[0];
        console.log('------------------------------------------------');
        console.log(`User: ${user.full_name} (${user.email})`);
        console.log(`Current Balance (DB): R$ ${user.balance}`);
        console.log(`Withdrawable: R$ ${user.withdrawable_balance}`);
        console.log('------------------------------------------------');

        // Also fetch the last deposit to compare
        const { data: lastDeposit } = await supabase
            .from('deposits')
            .select('amount, balance_before, balance_after, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (lastDeposit && lastDeposit.length > 0) {
            const dep = lastDeposit[0];
            console.log(`Last Deposit: R$ ${dep.amount} at ${new Date(dep.created_at).toLocaleString()}`);
            console.log(`History Saved: R$ ${dep.balance_before} -> R$ ${dep.balance_after}`);

            const isMatch = Number(user.balance) === Number(dep.balance_after);
            console.log(`MATCH? ${isMatch ? '✅ YES' : '❌ NO'}`);
        }

    } else {
        console.log('User not found.');
    }
}

checkBalance();
