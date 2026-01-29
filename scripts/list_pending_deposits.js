
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No pending deposits found.');
    } else {
        console.log('--- Pending Deposits ---');
        data.forEach(d => {
            console.log(`ID: ${d.id}`);
            console.log(`Amount: ${d.amount}`);
            console.log(`User: ${d.user_id}`);
            console.log(`Created: ${new Date(d.created_at).toLocaleString()}`);
            console.log('-------------------------');
        });
    }
}

run();
