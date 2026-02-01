
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDatabase() {
    console.log('--- Database Audit ---');

    const tables = ['user_notifications', 'transactions', 'profiles', 'deposits', 'deposit_requests', 'withdraw_requests', 'bets', 'pools'];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error counting ${table}:`, error.message);
        } else {
            console.log(`${table}: ${count} rows`);
        }
    }
}

auditDatabase();
