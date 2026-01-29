import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabase = createClient(
    "https://vucvouxutompqoqhxzmi.supabase.co",
    "sbp_297924d3ce03f35d3386f13e1827f2e4488822ca"
)

async function findMissingTransactions() {
    const email = 'upmarketingassessoria@gmail.com';

    // 1. Get Profile
    const { data: profile } = await supabase.from('profiles').select('id, balance').eq('email', email).single()
    if (!profile) return console.error("User not found")

    // 2. Get Approved Deposits
    const { data: deposits } = await supabase.from('deposits').select('*').eq('user_id', profile.id).eq('status', 'approved')

    // 3. Get Deposit-linked Transactions
    const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', profile.id).eq('type', 'deposit')

    console.log(`--- Audit for ${email} ---`)
    console.log(`Current Balance: ${profile.balance}`)
    console.log(`Approved Deposits: ${deposits?.length || 0}`)
    console.log(`Deposit Transactions: ${transactions?.length || 0}`)

    if (deposits && transactions) {
        const transRefs = new Set(transactions.map(t => t.reference_id))
        const missing = deposits.filter(d => !transRefs.has(d.id))

        if (missing.length > 0) {
            console.log("Found deposits without transaction records:")
            console.table(missing.map(m => ({ id: m.id, amount: m.amount, created: m.created_at })))
        } else {
            console.log("All approved deposits have transaction records.")
        }
    }
}

findMissingTransactions()
