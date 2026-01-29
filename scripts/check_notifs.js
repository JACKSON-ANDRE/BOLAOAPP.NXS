
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

async function checkNotifs() {
    console.log('--- VERIFICANDO TODAS AS NOTIFICAÇÕES RECENTES ---');
    const { data: notifs } = await supabase.from('user_notifications').select('user_id, message, created_at').order('created_at', { ascending: false }).limit(20);

    if (notifs) {
        notifs.forEach(n => {
            console.log(`[${n.created_at}] User: ${n.user_id} | Msg: ${n.message}`);
        });
    }

    console.log('\n--- VERIFICANDO PERFIL DO ADMIN ---');
    const { data: admin } = await supabase.from('profiles').select('*').eq('id', '1e53d3ea-b75a-42ff-b4fa-a06324f131e3').single();
    if (admin) {
        console.log(`Admin ID: ${admin.id}, Name: ${admin.full_name}, Role: ${admin.role}`);
    } else {
        console.log('Admin não encontrado com esse ID.');
    }
}

checkNotifs();
