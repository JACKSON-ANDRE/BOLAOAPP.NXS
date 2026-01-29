
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSchema() {
    console.log('--- INSPECTION OF TRANSACTIONS TABLE ---');
    // We can't use DESCRIBE in Supabase easily via JS, but we can try to find an existing entry or check RPC
    const { data: txn } = await supabase.from('transactions').select('*').limit(1);
    console.log('Transaction sample keys:', txn && txn[0] ? Object.keys(txn[0]) : 'No transactions found');

    console.log('\n--- INSPECTION OF TRIGGERS ---');
    // Using a trick: try to find triggers via info schema if we have permission or just assume names
    // Actually, I'll just check if there's a legacy trigger that might be interfering.

    console.log('Testing notify_all_admins with a simple insert check...');
    const { data: admins } = await supabase.from('profiles').select('id, full_name, role').eq('role', 'admin');
    console.log('Admins found:', admins);

    if (admins && admins.length > 0) {
        const testMsg = `TEST_ADMIN_NOTIF_${Date.now()}`;
        console.log(`Inserting manual notification for admin ${admins[0].id}...`);
        const { data, error } = await supabase.from('user_notifications').insert({
            user_id: admins[0].id,
            message: testMsg,
            type: 'info'
        }).select();

        if (error) console.error('Error inserting manual notif:', error);
        else console.log('Manual notification inserted:', data);
    }
}

inspectSchema();
