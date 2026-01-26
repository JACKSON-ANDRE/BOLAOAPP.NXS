const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vucvouxutompqoqhxzmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3ZvdXh1dG9tcHFvcWh4em1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Nzk1NTIsImV4cCI6MjA4MzU1NTU1Mn0.zHtRJNb3Km-758fkNlZDvq9FivthiWvG4ZpS8NcqbRo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('pools')
        .select('id, title, bets_deadline, scheduled_at');

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
