
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

async function deepAudit() {
    console.log('--- AUDITORIA DETALHADA: FRANKIE ---');

    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) return console.error('Frankie not found');

    const { data: deposits } = await supabase.from('deposits')
        .select('id, amount, status, created_at, mp_id, external_reference')
        .eq('user_id', frankie.id)
        .order('created_at', { ascending: false });

    console.log('\nDepósitos no Banco:');
    deposits.forEach(d => {
        console.log(`- R$ ${d.amount} | Status: ${d.status} | ID: ${d.id} | MP: ${d.mp_id} | Ref: ${d.external_reference}`);
    });

    const totalApproved = deposits.filter(d => d.status === 'approved').reduce((acc, d) => acc + d.amount, 0);
    console.log(`\nSoma dos Aprovados: R$ ${totalApproved.toFixed(2)}`);

    console.log('\nNotificações no Banco:');
    const { data: notifs } = await supabase.from('user_notifications')
        .select('message, created_at, user_id')
        .ilike('message', '%Frankie%')
        .order('created_at', { ascending: false });

    notifs.forEach(n => {
        console.log(`- [${n.created_at}] To: ${n.user_id === frankie.id ? 'Frankie' : 'Admin'} | Msg: ${n.message}`);
    });
}

deepAudit();
