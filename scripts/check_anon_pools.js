
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPools() {
    console.log('Checking pools visibility as ANONYMOUS user...');
    const { data, error } = await supabase.from('pools').select('id, title, status');
    if (error) {
        console.error('Error fetching pools:', error.message);
    } else {
        console.log(`Pools found (Anonymous): ${data.length}`);
        if (data.length > 0) {
            console.log('Sample pool:', data[0]);
        } else {
            console.log('No pools found. Checking if they exist logically...');
            // Try with service role if we had it, but here we just want to verify ANON access.
        }
    }
}

checkPools();
