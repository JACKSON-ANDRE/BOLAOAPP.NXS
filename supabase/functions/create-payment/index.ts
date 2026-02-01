import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
}

serve(async (req) => {
    // 0. Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            status: 200,
            headers: corsHeaders
        })
    }

    try {
        console.log('--- Start create-payment ---')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 1. Get user from Auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !user) {
            console.error('Auth Error:', authError)
            throw new Error('Invalid user token')
        }

        // 1.5 Fetch full user profile for better metadata
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        // 2. Get data from request body
        const body = await req.json().catch(() => ({}))
        const { amount, device_id } = body

        if (!amount || amount < 1) throw new Error('Valor inválido. Mínimo R$ 1,00')

        const external_reference = `DEP-${crypto.randomUUID()}`
        console.log(`Generating payment for ${user.email} - Amount: ${amount} - Ref: ${external_reference} - Device: ${device_id}`)

        // 3. Call Mercado Pago API
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
        if (!mpAccessToken) {
            console.error('ERRO: MP_ACCESS_TOKEN não configurado')
            throw new Error('Configuração de pagamento ausente no servidor. Verifique as chaves do Mercado Pago.')
        }

        // Preparation of names (Avoid "Cliente App" if possible)
        const fullName = profile?.full_name || user.user_metadata?.full_name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Usuario';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Bolao';

        // Clean CPF and Phone (Mandatory for MP quality)
        const cleanCpf = (profile?.cpf || user.user_metadata?.cpf || "").replace(/\D/g, '');
        const rawPhone = (profile?.whatsapp || user.user_metadata?.phone || "").replace(/\D/g, '');
        const cleanPhone = rawPhone.length >= 8 ? rawPhone.slice(-9) : ""; // Only send if valid size

        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': external_reference,
                'X-Meli-Session-Id': device_id || '' // 🛡️ DEVICE ID / FINGERPRINT
            },
            body: JSON.stringify({
                transaction_amount: Number(amount),
                description: `Deposito Bolao - ${user.email}`,
                payment_method_id: 'pix',
                external_reference: external_reference,
                notification_url: "https://vucvouxutompqoqhxzmi.supabase.co/functions/v1/mercado-pago-webhook",
                statement_descriptor: "BOLAOAPP",
                binary_mode: true,
                additional_info: {
                    items: [
                        {
                            id: "CREDIT-BOLAO",
                            title: "Creditos Bolao App",
                            description: "Adicao de saldo para participacao em boloes esportivos via Pix no Bolao App.",
                            category_id: "others",
                            quantity: 1,
                            unit_price: Number(amount)
                        }
                    ],
                    payer: {
                        first_name: firstName,
                        last_name: lastName,
                        registration_date: user.created_at,
                        phone: cleanPhone ? {
                            area_code: "55",
                            number: cleanPhone
                        } : undefined
                    }
                },
                payer: {
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName,
                    identification: cleanCpf ? {
                        type: "CPF",
                        number: cleanCpf
                    } : undefined
                }
            })
        })

        const mpData = await mpResponse.json()
        if (!mpResponse.ok) {
            console.error('Mercado Pago API Error Details:', JSON.stringify(mpData, null, 2))
            const errorMsg = mpData.message || (mpData.cause && mpData.cause[0]?.description) || 'Erro no Mercado Pago'
            throw new Error(`MP Error: ${errorMsg}`)
        }

        // Validate nested data
        const transactionData = mpData.point_of_interaction?.transaction_data
        if (!transactionData?.qr_code) {
            console.error('MP Invalid Data (Missing QR Code):', mpData)
            throw new Error('Erro ao processar dados de resposta do Mercado Pago')
        }

        // 4. Save to deposits table
        const { error: dbError } = await supabaseClient
            .from('deposits')
            .insert({
                user_id: user.id,
                amount: amount,
                external_reference: external_reference,
                mp_id: String(mpData.id),
                qr_code: transactionData.qr_code,
                qr_code_base64: transactionData.qr_code_base64,
                status: 'pending'
            })

        if (dbError) {
            console.error('Database Insert Error:', dbError)
            throw dbError
        }

        // 🔔 NOTIFICAÇÃO removida daqui para evitar duplicidade.
        // O trigger no banco de dados cuidará disso se necessário,
        // mas geralmente notificamos apenas na confirmação (webhook).

        console.log('Payment created successfully')

        return new Response(
            JSON.stringify({
                qr_code: transactionData.qr_code,
                qr_code_base64: transactionData.qr_code_base64,
                external_reference
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Function Error:', error.message)
        // Return 200 with error property for easier debugging in frontend
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
