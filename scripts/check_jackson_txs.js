
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials for immediate execution
const supabaseUrl = 'https://vucvouxutompqoqhxzmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3ZvdXh1dG9tcHFvcWh4em1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Nzk1NTIsImV4cCI6MjA4MzU1NTU1Mn0.zHtRJNb3Km-758fkNlZDvq9FivthiWvG4ZpS8NcqbRo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJackson() {
    console.log("🔍 Checking Jackson André...");

    const { data: user } = await supabase
        .from('profiles')
        .select('id, full_name, balance')
        .ilike('full_name', '%Jackson André%')
        .single();

    if (!user) { console.log('User not found'); return; }

    console.log(`👤 ${user.full_name} | Balance: R$ ${user.balance}`);

    const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n--- LAST 5 TRANSACTIONS ---');
    txs.forEach(t => {
        console.log(`[${new Date(t.created_at).toLocaleTimeString()}] ${t.type} | R$ ${t.amount} | Ref: ${t.reference_id} | Status: ${t.status}`);
    });
}

checkJackson();
