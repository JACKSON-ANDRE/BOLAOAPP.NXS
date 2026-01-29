import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://vucvouxutompqoqhxzmi.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSettings() {
    const { data, error } = await supabase.from('app_settings').select('*').limit(1);
    if (error) console.error('Error:', error);
    else console.log('App Settings:', JSON.stringify(data, null, 2));
}

checkSettings();
