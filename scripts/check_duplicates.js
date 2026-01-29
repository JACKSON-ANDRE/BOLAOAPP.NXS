
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envLines = envConfig.split('\n');

let VITE_SUPABASE_URL = '';
let VITE_SUPABASE_SERVICE_ROLE_KEY = '';

envLines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key === 'VITE_SUPABASE_URL') VITE_SUPABASE_URL = value;
        if (key === 'VITE_SUPABASE_SERVICE_ROLE_KEY') VITE_SUPABASE_SERVICE_ROLE_KEY = value;
    }
});

console.log('Loaded URL:', VITE_SUPABASE_URL ? VITE_SUPABASE_URL.substring(0, 10) + '...' : 'EMPTY');
console.log('Loaded KEY:', VITE_SUPABASE_SERVICE_ROLE_KEY ? VITE_SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 'EMPTY');

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase Credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkDuplicates() {
    console.log('Searching for recent transactions for Jackson André...');

    const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, balance')
        .ilike('full_name', '%Jackson André%')
        .limit(1);

    if (!users || users.length === 0) { console.log('User not found'); return; }
    const user = users[0];
    console.log(`User: ${user.full_name}, Balance: ${user.balance}`);

    const { data: txs, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) console.error(error);

    console.log('\n--- RECENT TRANSACTIONS ---');
    if (txs) {
        txs.forEach(t => {
            console.log(`[${new Date(t.created_at).toLocaleTimeString()}] ${t.type.toUpperCase()} | R$ ${t.amount} | Ref: ${t.reference_id} | Status: ${t.status}`);
        });
    }
}

checkDuplicates();
