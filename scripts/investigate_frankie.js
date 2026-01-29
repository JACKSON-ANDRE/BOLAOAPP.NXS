
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

async function investigate() {
    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) return console.error('Frankie not found');

    console.log(`--- INVESTIGAÇÃO PARA: ${frankie.full_name} (${frankie.id}) ---`);
    console.log(`Saldo Atual no Perfil: R$ ${frankie.balance}`);

    // 1. All deposits
    const { data: deposits } = await supabase.from('deposits')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: true });

    console.log('\n--- TODOS OS DEPÓSITOS (Tabela deposits) ---');
    deposits.forEach(d => {
        console.log(`[${d.created_at}] Amount: ${d.amount} | Status: ${d.status} | ID: ${d.id} | MP: ${d.mp_id}`);
    });

    // 2. All transactions
    const { data: txns } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: true });

    console.log('\n--- TODAS AS TRANSAÇÕES (Tabela transactions) ---');
    txns.forEach(t => {
        console.log(`[${t.created_at}] Amount: ${t.amount} | Type: ${t.type} | Status: ${t.status} | Ref: ${t.reference_id} | Desc: ${t.description}`);
    });

    // 3. User balance changes (audit log if exists, or just inference)
    console.log('\nConclusão Preliminar Baseada nos Dados acima...');
}

investigate();
