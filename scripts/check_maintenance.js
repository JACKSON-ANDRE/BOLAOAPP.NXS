
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSettings() {
    console.log('--- Checking App Settings ---');
    const { data: settings, error } = await supabase.from('app_settings').select('*').single();

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('Settings Found:');
    console.log(`Maintenance Mode: ${settings.maintenance_mode}`);
    console.log(`Allow Bets: ${settings.allow_bets}`);

    if (settings.maintenance_mode) {
        console.log('⚠️  MAINTENANCE MODE IS ON! You might want to turn it off.');
    } else {
        console.log('✅  Maintenance Mode is OFF (Production Ready).');
    }
}

checkSettings();
