
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

async function simulate() {
    console.log('--- SIMULAÇÃO DE DEPÓSITO LOCAL: FRANKIE ---');

    // 1. Localizar Frankie
    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) {
        console.error('Frankie não encontrado.');
        return;
    }
    console.log(`Usuário: ${frankie.full_name} (${frankie.id})`);

    // 2. Criar um novo depósito pendente
    const amount = 1.00 + Math.random();
    const external_ref = `SIM-${Date.now()}`;

    console.log(`Criando depósito de R$ ${amount.toFixed(2)} (Ref: ${external_ref})...`);
    const { data: newDep, error: createErr } = await supabase.from('deposits').insert({
        user_id: frankie.id,
        amount: amount,
        status: 'pending',
        external_reference: external_ref,
        mp_id: `MP-${Date.now()}`
    }).select().single();

    if (createErr) {
        console.error('Erro ao criar depósito:', createErr);
        return;
    }
    console.log(`Depósito criado (ID: ${newDep.id})`);

    // 3. Aprovar o depósito (Gatilho deve disparar)
    console.log('Aprovando depósito...');
    const { error: updateErr } = await supabase.from('deposits').update({
        status: 'approved'
    }).eq('id', newDep.id);

    if (updateErr) {
        console.error('Erro ao aprovar depósito:', updateErr);
        return;
    }
    console.log('Depósito aprovado.');

    // 4. Aguardar um pouco para o processamento assíncrono do trigger
    console.log('Aguardando 2 segundos para o Trigger processar...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Verificar Notificações
    console.log('\n--- VERIFICANDO RESULTADOS ---');

    // Notificação do Usuário
    const { data: userNotifs } = await supabase.from('user_notifications')
        .select('*')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (userNotifs && userNotifs.length > 0) {
        console.log(`✅ Notificação do Usuário encontrada: "${userNotifs[0].message}"`);
    } else {
        console.log('❌ Notificação do USUÁRIO não encontrada.');
    }

    // Notificação dos Admins
    const { data: admins } = await supabase.from('profiles').select('id, full_name').eq('role', 'admin');
    console.log(`Admins encontrados: ${admins.length}`);

    for (const admin of admins) {
        const { data: adminNotifs } = await supabase.from('user_notifications')
            .select('*')
            .eq('user_id', admin.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (adminNotifs && adminNotifs.length > 0 && adminNotifs[0].message.includes('Depósito Confirmado')) {
            console.log(`✅ Notificação do Admin (${admin.full_name}) encontrada: "${adminNotifs[0].message}"`);
        } else {
            console.log(`❌ Notificação do ADMIN (${admin.full_name}) não encontrada.`);
        }
    }

    // Verificar Transação
    const { data: txn } = await supabase.from('transactions').select('*').eq('reference_id', newDep.id).maybeSingle();
    if (txn) {
        console.log(`✅ Transação registrada (ID: ${txn.id})`);
    } else {
        console.log('❌ Transação NÃO registrada.');
    }
}

simulate();
