import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE DEPÓSITOS ---');

    // 1. Check last 10 deposits
    const { data: deposits, error: depError } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (depError) console.error('Erro ao buscar deposits:', depError);
    else {
        console.log('Últimos 10 depósitos:');
        deposits.forEach(d => {
            console.log(`- ID: ${d.id} | Ref: ${d.external_reference} | Status: ${d.status} | Valor: ${d.amount} | Criado: ${d.created_at}`);
        });
    }

    // 2. Check last 10 transactions
    const { data: txns, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (txnError) console.error('Erro ao buscar transactions:', txnError);
    else {
        console.log('\nÚltimas 10 transações:');
        txns.forEach(t => {
            console.log(`- ID: ${t.id} | Tipo: ${t.type} | Valor: ${t.amount} | Ref: ${t.reference_id} | Tipo Saldo: ${t.balance_type}`);
        });
    }

    // 3. Check for "ghost" deposits (approved but no transaction)
    if (deposits) {
        const approvedWithoutTxn = deposits.filter(d => d.status === 'approved' && !txns?.some(t => t.reference_id === d.id));
        if (approvedWithoutTxn.length > 0) {
            console.log('\n🚨 ALERTA: Depósitos aprovados sem transação correspondente (Trigger falhou?):');
            approvedWithoutTxn.forEach(d => console.log(`- ${d.id} (${d.external_reference})`));
        } else {
            console.log('\n✅ Nenhum depósito aprovado órfão encontrado nos últimos 10.');
        }
    }
}

diagnose();
