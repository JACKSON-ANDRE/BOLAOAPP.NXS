
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

async function dump() {
    const { data: frankie } = await supabase.from('profiles').select('*').ilike('full_name', '%Frankie%').single();
    if (!frankie) return;

    const { data: deposits } = await supabase.from('deposits').select('*').eq('user_id', frankie.id).order('created_at', { ascending: true });
    const { data: txns } = await supabase.from('transactions').select('*').eq('user_id', frankie.id).order('created_at', { ascending: true });

    let output = `--- INVESTIGAÇÃO FRANKIE ---\n`;
    output += `Saldo: ${frankie.balance}\n\n`;
    output += `--- DEPÓSITOS ---\n`;
    deposits.forEach(d => {
        output += `[${d.created_at}] R$ ${d.amount} | Status: ${d.status} | ID: ${d.id}\n`;
    });
    output += `\n--- TRANSAÇÕES ---\n`;
    txns.forEach(t => {
        output += `[${t.created_at}] R$ ${t.amount} | Type: ${t.type} | Desc: ${t.description}\n`;
    });

    fs.writeFileSync('scripts/investigation_output.txt', output);
}

dump();
