import { createClient } from '@supabase/supabase-js';

// Use the environment variables directly if available, or placeholders to be replaced
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://vucvouxutompqoqhxzmi.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE DEPÓSITOS (JS) ---');

    try {
        // 1. Check last 10 deposits
        const { data: deposits, error: depError } = await supabase
            .from('deposits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (depError) {
            console.error('Erro ao buscar deposits:', depError);
        } else {
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

        if (txnError) {
            console.error('Erro ao buscar transactions:', txnError);
        } else {
            console.log('\nÚltimas 10 transações:');
            txns.forEach(t => {
                console.log(`- ID: ${t.id} | Tipo: ${t.type} | Valor: ${t.amount} | Ref: ${t.reference_id} | Tipo Saldo: ${t.balance_type} | Criado: ${t.created_at}`);
            });
        }

        // 3. Check for specific issues
        if (deposits && txns) {
            const approvedWithoutTxn = deposits.filter(d => d.status === 'approved' && !txns.some(t => t.reference_id === d.id));
            if (approvedWithoutTxn.length > 0) {
                console.log('\n🚨 ALERTA: Depósitos APROVADOS mas SEM transação (Trigger falhou ou deu rollback):');
                approvedWithoutTxn.forEach(d => console.log(`- ID: ${d.id} | Ref: ${d.external_reference}`));
            }

            const pendingDeposits = deposits.filter(d => d.status === 'pending');
            if (pendingDeposits.length > 0) {
                console.log(`\nℹ️ Existem ${pendingDeposits.length} depósitos PENDENTES. Se o pagamento foi feito, o Webhook não chegou ou falhou.`);
            }
        }

    } catch (e) {
        console.error('Erro fatal no diagnóstico:', e);
    }
}

diagnose();
