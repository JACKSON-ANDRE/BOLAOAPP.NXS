
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

async function fullReconciliation() {
    console.log('--- RECONCILIAÇÃO COMPLETA: FRANKIE ---');

    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) return console.error('Frankie not found');

    console.log(`Perfil: ${frankie.full_name} | Saldo Atual: ${frankie.balance} | B. Saque: ${frankie.withdrawable_balance}`);

    const { data: deposits } = await supabase.from('deposits')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: true });

    console.log('\n--- HISTÓRICO DE DEPÓSITOS ---');
    let sumApproved = 0;
    deposits.forEach(d => {
        console.log(`[${d.created_at}] R$ ${d.amount} | Status: ${d.status} | ID: ${d.id}`);
        if (d.status === 'approved') sumApproved += d.amount;
    });
    console.log(`Total Aprovado em Deposits: R$ ${sumApproved.toFixed(2)}`);

    const { data: txns } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: true });

    console.log('\n--- HISTÓRICO DE TRANSAÇÕES ---');
    let txnBalance = 0;
    txns.forEach(t => {
        console.log(`[${t.created_at}] R$ ${t.amount} | Tipo: ${t.type} | Status: ${t.status} | Desc: ${t.description}`);
        if (t.status === 'approved') {
            if (t.type === 'deposit') txnBalance += t.amount;
            else txnBalance -= t.amount;
        }
    });
    console.log(`Saldo Calculado via Transações: R$ ${txnBalance.toFixed(2)}`);
}

fullReconciliation();
