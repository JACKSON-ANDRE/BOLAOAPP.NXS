import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabase = createClient(
    "https://vucvouxutompqoqhxzmi.supabase.co",
    "sbp_297924d3ce03f35d3386f13e1827f2e4488822ca"
)

async function finalAudit() {
    const email = 'upmarketingassessoria@gmail.com';

    // 1. Get Profile directly
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single()

    if (pError) return console.error("Profile Error:", pError)

    console.log(`--- DB State for ${email} ---`)
    console.log(`Balance (Jogo): ${profile.balance}`)
    console.log(`Withdrawable (Saque): ${profile.withdrawable_balance}`)

    // 2. Check the RPC output
    const { data: adminList } = await supabase.rpc('get_admin_users_list')
    const adminUser = adminList?.find((u: any) => u.email === email)

    if (adminUser) {
        console.log(`--- Admin RPC State ---`)
        console.log(`Balance (Jogo): ${adminUser.balance}`)
        console.log(`Withdrawable (Saque): ${adminUser.withdrawable_balance}`)
    }

    // 3. Check transactions sum
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'approved')

    const calcBalance = transactions?.reduce((acc: number, t: any) => {
        if (t.balance_type === 'balance' || !t.balance_type) {
            if (['deposit', 'winning', 'refund', 'bet_credit', 'bonus', 'adjustment'].includes(t.type)) return acc + Number(t.amount)
            if (['withdrawal', 'withdraw', 'bet_debit', 'bet'].includes(t.type)) return acc - Math.abs(Number(t.amount))
            if (t.type === 'admin_adjustment') return acc + Number(t.amount)
        }
        return acc
    }, 0)

    const calcWithdrawable = transactions?.reduce((acc: number, t: any) => {
        if (t.balance_type === 'withdrawable') {
            if (['winning', 'bonus', 'adjustment'].includes(t.type)) return acc + Number(t.amount)
            if (['withdrawal', 'withdraw'].includes(t.type)) return acc - Math.abs(Number(t.amount))
            if (t.type === 'admin_adjustment') return acc + Number(t.amount)
        }
        return acc
    }, 0)

    console.log(`--- Calculated from Transactions ---`)
    console.log(`Calc Balance: ${calcBalance}`)
    console.log(`Calc Withdrawable: ${calcWithdrawable}`)
}

finalAudit()
