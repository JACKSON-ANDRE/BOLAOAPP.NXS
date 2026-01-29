
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
    console.log('--- USERS WITH admin ROLE ---');
    const { data: admins } = await supabase.from('profiles').select('id, full_name, email, role').eq('role', 'admin');
    console.log(admins);

    console.log('\n--- SEARCHING FOR Frankie ---');
    const { data: frankie } = await supabase.from('profiles').select('id, full_name, email').ilike('full_name', '%Frankie%');
    console.log(frankie);

    if (frankie && frankie.length > 0) {
        const frankieId = frankie[0].id;
        console.log(`\n--- RECENT DEPOSITS FOR ${frankie[0].full_name} (${frankieId}) ---`);
        const { data: deposits } = await supabase.from('deposits').select('*').eq('user_id', frankieId).order('created_at', { ascending: false }).limit(3);
        console.log(deposits);
    }

    console.log('\n--- RECENT NOTIFICATIONS ---');
    const { data: notifications } = await supabase.from('user_notifications').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(notifications);
}

debug();
