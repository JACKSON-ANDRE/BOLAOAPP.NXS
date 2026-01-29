import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabase = createClient(
    "https://vucvouxutompqoqhxzmi.supabase.co",
    "sbp_297924d3ce03f35d3386f13e1827f2e4488822ca"
)

async function debugBalance() {
    const email = 'upmarketingassessoria@gmail.com';

    // Check Profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, email, balance, withdrawable_balance')
        .eq('email', email)
        .single()

    if (pError) {
        console.error('Error fetching profile:', pError)
    } else {
        console.log('--- User Profile ---')
        console.log(profile)
    }

    if (profile) {
        // Check Deposits
        const { data: deposits, error: dError } = await supabase
            .from('deposits')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })

        if (dError) {
            console.error('Error fetching deposits:', dError)
        } else {
            console.log('--- User Deposits ---')
            console.table(deposits.map(d => ({
                id: d.id,
                amount: d.amount,
                status: d.status,
                created: d.created_at
            })))
        }

        // Check Transactions
        const { data: transactions, error: tError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(5)

        if (tError) {
            console.error('Error fetching transactions:', tError)
        } else {
            console.log('--- Last 5 Transactions ---')
            console.table(transactions.map(t => ({
                type: t.type,
                amount: t.amount,
                status: t.status,
                created: t.created_at
            })))
        }
    }
}

debugBalance()
