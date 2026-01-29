
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials for immediate execution (Bypass env issues)
const supabaseUrl = 'https://vucvouxutompqoqhxzmi.supabase.co';
// WARNING: This key might be the ANON key from verify_user_direct.ts. 
// If it fails with 401/403, we need the SERVICE_ROLE key.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3ZvdXh1dG9tcHFvcWh4em1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Nzk1NTIsImV4cCI6MjA4MzU1NTU1Mn0.zHtRJNb3Km-758fkNlZDvq9FivthiWvG4ZpS8NcqbRo';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credentials missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAutoFix() {
    console.log('🤖 ROBÔ FAXINEIRO INICIADO (v3 - Hardcoded)');
    console.log(`📡 Conectado em: ${supabaseUrl}`);

    // A. Fetch approved deposits
    const { data: deposits, error } = await supabase
        .from('deposits')
        .select('id, user_id, amount, mp_id, created_at, status')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (error) { console.error('Erro ao buscar depósitos:', error); return; }

    console.log(`🔎 Analisando ${deposits.length} depósitos aprovados...`);

    // B. Group by Reference ID (from transactions)
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'deposit')
        .order('created_at', { ascending: true }); // Oldest first to identify original

    const refMap = {};

    transactions.forEach(tx => {
        if (!tx.reference_id) return;
        if (!refMap[tx.reference_id]) refMap[tx.reference_id] = [];
        refMap[tx.reference_id].push(tx);
    });

    let duplicateCount = 0;
    let fixedTotal = 0;

    for (const [refId, txs] of Object.entries(refMap)) {
        if (txs.length > 1) {
            // DUPLICATE FOUND
            const original = txs[0];
            const duplicates = txs.slice(1);

            const userId = original.user_id;
            const amount = original.amount;

            console.log(`\n⚠️  DUPLICIDADE ENCONTRADA! Ref: ${refId} (User: ${userId})`);
            console.log(`   - Manter Original: ${original.id} (${new Date(original.created_at).toLocaleTimeString()})`);

            for (const dupe of duplicates) {
                console.log(`   - Removendo Duplicata: ${dupe.id} (${new Date(dupe.created_at).toLocaleTimeString()})`);

                // 1. Debit Balance
                const { data: user } = await supabase.from('profiles').select('balance').eq('id', userId).single();

                if (user) {
                    const newBalance = Number(user.balance) - Number(amount);
                    console.log(`   - 🛠️  Corrigindo Saldo: R$ ${user.balance} -> R$ ${newBalance}`);

                    // 2. Update Profile
                    const { error: updErr } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);

                    if (updErr) {
                        console.error('❌ ERRO ao atualizar saldo:', updErr.message);
                        // Likely RLS blocking us if this is Anon key
                        continue;
                    }

                    // 3. Compensation Transaction
                    await supabase.from('transactions').insert({
                        user_id: userId,
                        amount: amount,
                        type: 'withdraw', // System correction
                        status: 'completed',
                        created_by: userId,
                        description: `Correção de Sistema (Duplicidade Ref: ${refId})`,
                        balance_type: 'balance'
                    });

                    // 4. Delete bad transaction
                    await supabase.from('transactions').delete().eq('id', dupe.id);

                    duplicateCount++;
                    fixedTotal += Number(amount);

                    // Notify
                    await supabase.from('user_notifications').insert({
                        user_id: userId,
                        message: `🔧 Correção automática: Estorno de duplicidade (Ref: ${refId}).`,
                        type: 'info'
                    });
                }
            }
        }
    }

    if (duplicateCount === 0) {
        console.log('\n✅ Nenhuma duplicidade encontrada.');
    } else {
        console.log(`\n🎉 Processo Finalizado! Corrigidos ${duplicateCount} registros.`);
        console.log(`💰 Total Recuperado: R$ ${fixedTotal.toFixed(2)}`);
    }
}

runAutoFix();
