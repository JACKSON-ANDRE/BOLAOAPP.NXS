
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing (Robust Version)
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

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Credentials');
    process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY);

async function auditFrankie() {
    console.log('--- AUDITING FRANKIE DONAGHY ---');

    // 1. Find User
    const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', '%frankieipo@hotmail.com%')
        .limit(1);

    if (!users || users.length === 0) { console.log('Frankie not found'); return; }
    const frankie = users[0];
    console.log(`User Found: ${frankie.full_name} (${frankie.id})`);

    // 2. Find the 1.06 Deposit
    // We search for roughly this amount or just the last few deposits
    const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\nLast 5 Deposits:`);

    if (deposits) {
        deposits.forEach(d => {
            console.log(`ID: ${d.id}`);
            console.log(`Amount: R$ ${d.amount}`);
            console.log(`Created At: ${new Date(d.created_at).toLocaleString()}`);
            console.log(`MP ID: ${d.mp_id}`);
            console.log(`Status: ${d.status}`);
            console.log('------------------------------------------------');
        });
    }

    // 3. Find Transactions
    const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('\nLast 10 Transactions:');
    if (txs) {
        txs.forEach(t => {
            console.log(`[${new Date(t.created_at).toLocaleString()}] ${t.type} | R$ ${t.amount} | Ref: ${t.reference_id} | Status: ${t.status}`);
        });
    }
}

auditFrankie();
