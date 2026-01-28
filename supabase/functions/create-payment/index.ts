import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 1. Get user from Auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) throw new Error('Invalid user token')

        // 2. Get amount from request body
        const { amount } = await req.json()
        if (!amount || amount < 1) throw new Error('Valor inválido. Mínimo R$ 1,00')

        const external_reference = `DEP-${crypto.randomUUID()}`

        // 3. Call Mercado Pago API
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
        if (!mpAccessToken) throw new Error('Configuração MP_ACCESS_TOKEN ausente no servidor')

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': external_reference
            },
            body: JSON.stringify({
                transaction_amount: Number(amount),
                description: `Depósito Bolão App - Ref: ${external_reference}`,
                payment_method_id: 'pix',
                external_reference: external_reference,
                notification_url: "https://vucvouxutompqoqhxzmi.supabase.co/functions/v1/mercado-pago-webhook",
                payer: {
                    email: user.email,
                    first_name: 'Usuário',
                    last_name: 'Bolão App'
                }
            })
        })

        const mpData = await mpResponse.json()
        if (!mpResponse.ok) {
            console.error('MP API Error:', mpData)
            throw new Error(mpData.message || 'Erro ao gerar pagamento no Mercado Pago')
        }

        // 4. Save to deposits table
        const { error: dbError } = await supabaseClient
            .from('deposits')
            .insert({
                user_id: user.id,
                amount: amount,
                external_reference: external_reference,
                mp_id: String(mpData.id),
                qr_code: mpData.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: mpData.point_of_interaction.transaction_data.qr_code_base64,
                status: 'pending'
            })

        if (dbError) throw dbError

        return new Response(
            JSON.stringify({
                qr_code: mpData.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: mpData.point_of_interaction.transaction_data.qr_code_base64,
                external_reference
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
