
import { createClient } from '@supabase/supabase-js';

// Credentials extracted from .env.local (Temporary Script)
const supabaseUrl = 'https://vucvouxutompqoqhxzmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3ZvdXh1dG9tcHFvcWh4em1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Nzk1NTIsImV4cCI6MjA4MzU1NTU1Mn0.zHtRJNb3Km-758fkNlZDvq9FivthiWvG4ZpS8NcqbRo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log("🔍 Buscando dados de playzone473@gmail.com (Via Script)...");

    // Fetch Profile
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, balance, withdrawable_balance')
        .eq('email', 'playzone473@gmail.com')
        .single();

    if (error) {
        console.error("❌ Erro ao buscar perfil:", error.message);
        return;
    }

    if (!profile) {
        console.error("❌ Usuário não encontrado.");
        return;
    }

    // Fetch Transactions Summary
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, status')
        .eq('user_id', profile.id);

    if (txError) {
        console.error("❌ Erro ao buscar transações:", txError.message);
        return;
    }

    // Calculate Totals locally
    let totalDeposits = 0;
    let totalBets = 0;
    let totalWinnings = 0;
    let totalWithdrawals = 0;

    transactions.forEach(t => {
        if (t.status !== 'approved') return;
        if (t.type === 'deposit') totalDeposits += t.amount;
        if (t.type === 'bet_debit') totalBets += t.amount;
        if (t.type === 'winning') totalWinnings += t.amount;
        if (t.typeIsLikeWithdraw) totalWithdrawals += t.amount; // Simplify type check logic below
        if (t.type.includes('withdraw')) totalWithdrawals += t.amount;
    });

    console.log("\n📊 --- RESULTADO DO DIAGNÓSTICO (SCRIPT LOCAL) ---");
    console.log(`👤 Usuário: ${profile.full_name}`);
    console.log(`📧 Email: ${profile.email}`);
    console.log(`💰 Saldo de Jogo (DB): R$ ${profile.balance}`);
    console.log(`🏦 Saldo de Saque (DB): R$ ${profile.withdrawable_balance}`);

    console.log("\n--- HISTÓRICO ---");
    console.log(`📥 Total Depósitos: R$ ${totalDeposits.toFixed(2)}`);
    console.log(`💸 Total Apostas:   R$ ${totalBets.toFixed(2)}`);
    console.log(`🏆 Total Prêmios:   R$ ${totalWinnings.toFixed(2)}`);
    console.log(`🏧 Total Saques:    R$ ${totalWithdrawals.toFixed(2)}`);

    console.log("\n--- PROVA REAL (Cálculo) ---");
    const calcGame = totalDeposits - totalBets;
    const calcWith = totalWinnings - totalWithdrawals;

    console.log(`🧮 Jogo Calculado:  R$ ${calcGame.toFixed(2)} ${Math.abs(calcGame - profile.balance) < 0.01 ? '✅ OK' : '❌ ERRO'}`);
    console.log(`🧮 Saque Calculado: R$ ${calcWith.toFixed(2)} (${calcWith < 0 ? 'Negativo ajusado p/ 0' : ''}) ${Math.abs(Math.max(0, calcWith) - profile.withdrawable_balance) < 0.01 ? '✅ OK' : '❌ ERRO'}`);
    console.log("----------------------------------------------\n");
}

checkUser();
