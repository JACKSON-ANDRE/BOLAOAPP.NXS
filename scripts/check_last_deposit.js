
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

async function checkDepositDetails() {
    console.log('--- VERIFICANDO DETALHES DO ÚLTIMO DEPÓSITO ---');

    const { data: deposits, error } = await supabase
        .from('deposits')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (deposits && deposits.length > 0) {
        const d = deposits[0];
        console.log(`ID: ${d.id}`);
        console.log(`Status: ${d.status}`);
        console.log(`Valor: R$ ${d.amount}`);
        console.log(`Saldo Anterior (balance_before): ${d.balance_before}`);
        console.log(`Saldo Novo (balance_after): ${d.balance_after}`);

        if (d.balance_before !== null && d.balance_after !== null) {
            console.log('✅ SUCESSO! As colunas de histórico de saldo foram preenchidas.');
        } else {
            console.log('⚠️ AVISO: As colunas de saldo estão NULAS. O usuário pode não ter rodado a migração final ainda.');
        }
    }
}

checkDepositDetails();
