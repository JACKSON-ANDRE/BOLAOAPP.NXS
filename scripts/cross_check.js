
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

async function crossCheck() {
    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) return;

    console.log(`--- CROSS-CHECK DEPÓSITOS VS TRANSAÇÕES: ${frankie.full_name} ---`);

    const { data: deposits } = await supabase.from('deposits')
        .select('*')
        .eq('user_id', frankie.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

    const { data: txns } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', frankie.id)
        .eq('type', 'deposit')
        .order('created_at', { ascending: true });

    console.log('\nDepósitos Aprovados:');
    deposits.forEach(d => console.log(`- ID: ${d.id.slice(0, 8)} | Valor: ${d.amount} | Em: ${d.created_at}`));

    console.log('\nTransações de Depósito:');
    txns.forEach(t => console.log(`- Ref: ${(t.reference_id || 'NULL').slice(0, 8)} | Valor: ${t.amount} | Em: ${t.created_at}`));

    const depTotal = deposits.reduce((s, d) => s + d.amount, 0);
    const txnTotal = txns.reduce((s, t) => s + t.amount, 0);

    console.log(`\nSoma Depósitos: ${depTotal.toFixed(2)}`);
    console.log(`Soma Transações: ${txnTotal.toFixed(2)}`);
}

crossCheck();
