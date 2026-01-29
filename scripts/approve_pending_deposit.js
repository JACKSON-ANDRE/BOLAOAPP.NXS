
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

async function approveLatest() {
    console.log('--- BUSCANDO DEPÓSITO PENDENTE ---');

    // 1. Find latest pending deposit
    const { data: deposits, error } = await supabase
        .from('deposits')
        .select('*, profiles(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Erro ao buscar:', error);
        return;
    }

    if (!deposits || deposits.length === 0) {
        console.log('❌ Nenhum depósito pendente encontrado. Crie um novo QR Code no app primeiro!');
        return;
    }

    const deposit = deposits[0];
    console.log(`✅ Depósito Encontrado:`);
    console.log(`   ID: ${deposit.id}`);
    console.log(`   Valor: R$ ${deposit.amount}`);
    console.log(`   Usuário: ${deposit.profiles?.full_name}`);
    console.log(`   Criado em: ${new Date(deposit.created_at).toLocaleString()}`);

    // 2. Approve it
    console.log('\n🔄 Simulando confirmação do Mercado Pago...');

    const { error: updateError } = await supabase
        .from('deposits')
        .update({
            status: 'approved',
            updated_at: new Date().toISOString()
        })
        .eq('id', deposit.id);

    if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError);
    } else {
        console.log('🚀 SUCESSO! Status atualizado para APPROVED.');
        console.log('👀 Verifique o painel do usuário e do admin agora. Deve haver APENAS UMA notificação e transação.');
    }
}

approveLatest();
