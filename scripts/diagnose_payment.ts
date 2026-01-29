import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabase = createClient(
    "https://vucvouxutompqoqhxzmi.supabase.co",
    "sbp_297924d3ce03f35d3386f13e1827f2e4488822ca" // I shouldn't use the access token here, I need the service role key.
)

async function checkState() {
    const { data: deposits, error: dError } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (dError) {
        console.error('Error fetching deposits:', dError)
    } else {
        console.log('--- Last 5 Deposits ---')
        console.table(deposits.map(d => ({
            id: d.id,
            amount: d.amount,
            status: d.status,
            created: d.created_at,
            ref: d.external_reference
        })))
    }

    const { data: balances, error: bError } = await supabase
        .from('user_balances')
        .select('*, profiles(email)')
        .limit(10)

    if (bError) {
        console.error('Error fetching balances:', bError)
    } else {
        console.log('--- User Balances ---')
        console.table(balances.map(b => ({
            email: b.profiles?.email,
            balance: b.balance,
            updated: b.updated_at
        })))
    }
}

checkState()
