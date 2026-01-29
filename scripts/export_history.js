
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

async function exportFullHistory() {
    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) return;

    console.log(`--- HISTÓRICO FINANCEIRO COMPLETO: ${frankie.full_name} ---`);

    const { data: txns } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: true });

    let runningBalance = 0;
    txns.forEach(t => {
        const change = (t.type === 'deposit' || t.type === 'win') ? t.amount : -t.amount;
        runningBalance += change;
        console.log(`[${t.created_at}] ${t.type.padEnd(8)} | Valor: ${t.amount.toFixed(2).padStart(6)} | Acumulado: ${runningBalance.toFixed(2).padStart(6)} | Desc: ${t.description || '-'}`);
    });

    console.log(`\nSaldo Final Reconciliado: R$ ${runningBalance.toFixed(2)}`);
    console.log(`Saldo Real no Perfil: R$ ${frankie.balance.toFixed(2)}`);
}

exportFullHistory();
