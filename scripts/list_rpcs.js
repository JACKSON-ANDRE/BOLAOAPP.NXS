
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

async function listRPCs() {
    console.log('--- LISTING AVAILABLE RPCs ---');
    // We can try to query pg_proc via a generic query if we have an RPC that allows it, 
    // or try common names.
    const commonRpcs = ['exec_sql', 'run_sql', 'execute_sql', 'admin_exec', 'get_system_health_report'];

    for (const rpc of commonRpcs) {
        const { error } = await supabase.rpc(rpc, {});
        if (error && error.message.includes('Could not find')) {
            console.log(`- ${rpc}: NOT FOUND`);
        } else {
            console.log(`- ${rpc}: FOUND (or error: ${error ? error.message : 'NONE'})`);
        }
    }
}

listRPCs();
