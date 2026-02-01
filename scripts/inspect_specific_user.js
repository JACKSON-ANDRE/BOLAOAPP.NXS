
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

async function inspectUser(email) {
    console.log(`Searching for user: ${email}...`);

    // 1. Find User ID from Auth System (requires Service Role)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error listing users:', authError);
        return;
    }

    const userAuth = users.find(u => u.email === email);

    if (!userAuth) {
        console.log('❌ User NOT FOUND in Auth system.');
        console.log('Suggestion: The user might have registered with a different email or made a typo.');
        return;
    }

    console.log(`✅ User Found in Auth! ID: ${userAuth.id}`);
    console.log(`   Last Sign In: ${userAuth.last_sign_in_at}`);
    console.log(`   Created: ${userAuth.created_at}`);

    // 2. Fetch Profile from Public Table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userAuth.id)
        .single();

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError.message);
        console.log('This means the user exists in Auth but has NO entry in public.profiles table (Data inconsistency).');
    } else {
        console.log('✅ Profile Found:');
        console.log(`   Name: ${profile.full_name}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Balance (Jogo): R$ ${profile.balance}`);
        console.log(`   Withdrawable (Saque): R$ ${profile.withdrawable_balance}`);
        console.log(`   City/State: ${profile.city}/${profile.state}`);
        console.log(`   WhatsApp: ${profile.whatsapp}`);
    }
}

const targetEmail = 'paulo199052@hotmail.com';
inspectUser(targetEmail);
