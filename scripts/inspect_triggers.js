import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://vucvouxutompqoqhxzmi.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function inspect() {
    console.log('--- INSPEÇÃO TÉCNICA DE GATILHOS ---');

    // 1. Check Triggers on 'deposits'
    const { data: triggers, error: trigError } = await supabase.rpc('get_table_triggers', { t_name: 'deposits' });
    if (trigError) {
        // If RPC doesn't exist, try plain SQL via a query if possible or just log error
        console.log('Nota: RPC get_table_triggers não disponível. Usando consulta direta.');
        const { data: rawTrigs, error: rawError } = await supabase.from('pg_trigger').select('tgname').limit(5); // This won't work easily without custom RPC
    } else {
        console.log('Gatilhos na tabela deposits:', JSON.stringify(triggers, null, 2));
    }

    // 2. Check the SPECIFIC deposit the user updated
    const { data: deposit, error: depError } = await supabase
        .from('deposits')
        .select('*, profiles(full_name, balance, withdrawable_balance)')
        .eq('user_id', 'b1a75faa-590d-4de6-b23a-daa26ac4bec6')
        .order('created_at', { ascending: false })
        .limit(1);

    if (depError) console.error('Erro ao buscar depósito do teste:', depError);
    else if (deposit && deposit[0]) {
        const d = deposit[0];
        console.log('\nDados do Depósito de Teste:');
        console.log(`- ID: ${d.id}`);
        console.log(`- Status Atual: ${d.status}`);
        console.log(`- Ref: ${d.external_reference}`);
        console.log(`- Perfil: ${d.profiles.full_name}`);
        console.log(`- Saldo Jogo Atual: ${d.profiles.balance}`);
    }

    // 3. Check for specific transaction for this deposit
    if (deposit && deposit[0]) {
        const { data: txn, error: txnError } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference_id', deposit[0].id)
            .single();

        if (txn) {
            console.log('\n✅ Transação ENCONTRADA para este depósito ID:', txn.id);
        } else {
            console.log('\n❌ Transação NÃO encontrada para este depósito. O gatilho NÃO funcionou.');
        }
    }
}

inspect();
