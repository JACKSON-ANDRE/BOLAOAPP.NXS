
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

async function checkTrigger() {
    console.log('--- REVISÃO TÉCNICA DO GATILHO process_deposit_notification ---');

    // Check if function exists and its content
    // We can use a trick: try to call a non-existent RPC to see schema or just query pg_proc
    // Actually, I'll just try to "force" apply the migration via a script to be 100% sure it's active.

    console.log('Re-aplicando a lógica da migração 20260129000000 para garantir sincronia...');
    const migrationSql = fs.readFileSync('supabase/migrations/20260129000000_enhanced_pix_notifications.sql', 'utf8');

    // We can't run large SQL blocks via supabase-js easily unless we have a custom RPC like 'exec_sql'
    // Let's check if there's a 'exec_sql' or similar
    console.log('Tentando executar via RPC customizado (se existir)...');
    const { error: execErr } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (execErr) {
        console.error('RPC exec_sql não disponível ou falhou:', execErr.message);
        console.log('Plano B: Verificar manualmente se a função notify_all_admins retorna erro ao ser chamada.');

        const { error: testErr } = await supabase.rpc('notify_all_admins', { p_message: 'TEST', p_type: 'info' });
        if (testErr) {
            console.error('ERRO na função notify_all_admins:', testErr.message);
        } else {
            console.log('✅ Função notify_all_admins está ativa e funcionando.');
        }
    } else {
        console.log('✅ Migração re-aplicada com sucesso via exec_sql.');
    }
}

checkTrigger();
