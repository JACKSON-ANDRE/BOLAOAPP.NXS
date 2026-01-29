import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Creating Production Test Pool ---');

    // Get Admin ID
    const { data: admin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single();
    if (!admin) {
        console.error('Admin user not found.');
        return;
    }

    const payload = {
        title: 'BOLÃO TESTE - VERIFICAÇÃO FINAL 🚀',
        modality: 'Futebol',
        entry_fee: 1.00,
        options: ['A', 'B'],
        creator_id: admin.id,
        scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        bets_deadline: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours from now
        status: 'open'
    };

    const { data, error } = await supabase.from('pools').insert(payload).select().single();

    if (error) {
        console.error('Error creating pool. Check pool_creation_error.json');
        import('fs').then(fs => fs.writeFileSync('pool_creation_error.json', JSON.stringify(error, null, 2)));
    } else {
        console.log('--- Pool Created Successfully ---');
        console.log('ID:', data.id);
    }
}
run();
