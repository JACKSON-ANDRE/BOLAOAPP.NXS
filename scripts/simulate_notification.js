
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
    console.log('--- SIMULATING DEPOSIT NOTIFICATION ---');

    const { data: frankie } = await supabase.from('profiles').select('id, full_name').ilike('full_name', '%Frankie%').single();
    if (!frankie) {
        console.error('Frankie not found');
        return;
    }

    console.log(`Found Frankie: ${frankie.full_name} (${frankie.id})`);

    // Test notify_all_admins function directly if possible, or just insert into user_notifications
    const message = `💰 TESTE: Depósito Confirmado! O usuário ${frankie.full_name} depositou R$ 50.00 via PIX Automático.`;

    console.log('Calling notify_all_admins...');
    const { error: rpcErr } = await supabase.rpc('notify_all_admins', {
        p_message: message,
        p_type: 'success'
    });

    if (rpcErr) {
        console.error('RPC Error:', rpcErr);
    } else {
        console.log('RPC notify_all_admins called successfully.');
    }

    // Check notifications for admins
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    const adminIds = admins.map(a => a.id);

    console.log(`Checking notifications for admins: ${adminIds}`);
    const { data: notifs } = await supabase.from('user_notifications').select('*').in('user_id', adminIds).order('created_at', { ascending: false }).limit(5);

    console.log('Recent admin notifications:');
    notifs.forEach(n => {
        console.log(`[${n.user_id}] ${n.message}`);
    });
}

simulate();
