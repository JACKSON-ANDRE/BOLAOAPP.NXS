// Native fetch

async function run() {
    const url = "https://vucvouxutompqoqhxzmi.supabase.co/functions/v1/exec-sql";
    const body = {
        sql: "DROP TRIGGER IF EXISTS tr_notify_on_deposit_approved ON public.deposits; DROP TRIGGER IF EXISTS on_deposit_approved ON public.deposits;"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
