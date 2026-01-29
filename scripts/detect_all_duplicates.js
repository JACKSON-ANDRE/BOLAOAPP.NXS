
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

async function detectDuplicates() {
    console.log('--- SCANNING FOR DUPLICATE DEPOSITS (ALL USERS) ---');

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, user_id, amount, reference_id, created_at, profiles(full_name)')
        .eq('type', 'deposit')
        .not('reference_id', 'is', null);

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    const map = new Map();
    const duplicates = [];

    transactions.forEach(tx => {
        if (!tx.reference_id) return;

        if (map.has(tx.reference_id)) {
            duplicates.push({
                original: map.get(tx.reference_id),
                duplicate: tx
            });
        } else {
            map.set(tx.reference_id, tx);
        }
    });

    if (duplicates.length === 0) {
        console.log('✅ ZERO DUPLICATES FOUND! The issue seems isolated or already cleaned.');
    } else {
        console.log(`⚠️ FOUND ${duplicates.length} DUPLICATE DEPOSIT GROUPS:`);
        duplicates.forEach((item, index) => {
            console.log(`\n--- Set #${index + 1} ---`);
            console.log(`User: ${item.original.profiles?.full_name || 'Unknown'} (${item.original.user_id})`);
            console.log(`Amount: R$ ${item.original.amount}`);
            console.log(`Deposit ID (Reference): ${item.original.reference_id}`);
            console.log(`Time 1: ${new Date(item.original.created_at).toLocaleString()}`);
            console.log(`Time 2: ${new Date(item.duplicate.created_at).toLocaleString()}`);
        });
    }
}

detectDuplicates();
