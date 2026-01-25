
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load env manually since we are running a script
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    // try .env.local
    const envLocal = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) {
        dotenv.config({ path: envLocal });
    }
}

// Manually recreate client if environment loading fails (or just use what we loaded)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Não consegui ler VITE_SUPABASE_URL do .env ou .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log("🔍 Buscando dados de playzone473@gmail.com...");

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

    console.log("\n📊 --- RESULTADO DO DIAGNÓSTICO AUTOMÁTICO ---");
    console.log(`👤 Usuário: ${profile.full_name}`);
    console.log(`📧 Email: ${profile.email}`);
    console.log(`💰 Saldo de Jogo: R$ ${profile.balance}`);
    console.log(`🏦 Saldo de Saque: R$ ${profile.withdrawable_balance}`);
    console.log("----------------------------------------------\n");
}

checkUser();
