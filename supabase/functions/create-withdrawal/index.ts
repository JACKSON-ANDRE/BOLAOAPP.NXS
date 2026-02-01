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
        const sbUrl = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
        const sbServiceKey = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Auth session missing!')

        const token = authHeader.replace('Bearer ', '')
        const payload = JSON.parse(atob(token.split('.')[1]))
        const userId = payload.sub
        const userEmail = payload.email

        const supabaseAdmin = createClient(sbUrl, sbServiceKey)
        let isAdmin = false;

        // 🛡️ AUTH CHECK (Com Bypass para Manutenção do Supabase)
        const adminEmails = ['jacksonsitebr@gmail.com', 'upmarketingassessoria@gmail.com']
        if (adminEmails.includes(userEmail)) {
            isAdmin = true;
        } else {
            const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
            if (profile?.role === 'admin') isAdmin = true;
        }

        if (!isAdmin) throw new Error(`Acesso Negado para ${userEmail}`)

        // 2. Data Retrieval
        const { request_id } = await req.json().catch(() => ({}))
        if (!request_id) throw new Error('ID do pedido é obrigatório')

        const { data: request, error: reqError } = await supabaseAdmin
            .from('withdraw_requests')
            .select('*, profiles(full_name, email)')
            .eq('id', request_id)
            .single()

        if (reqError || !request) throw new Error('Pedido de saque não encontrado')
        if (request.status === 'approved') throw new Error('Este pedido já foi pago')

        // 3. MERCADO PAGO PAYOUT (Real PIX Out)
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
        if (!mpAccessToken) throw new Error('MP_ACCESS_TOKEN não configurado')

        console.log(`🚀 Iniciando PIX real para: ${request.amount} (Chave: ${request.pix_key})`)

        /* 
           DETERMINAR TIPO DE CHAVE PIX (Disbursements format):
           - cpf: CPF
           - email: E-mail
           - phone: Celular (+55...)
           - evp: Chave Aleatória
        */
        let pixType = 'evp';
        const cleanKey = request.pix_key.replace(/\s/g, '');
        if (cleanKey.includes('@')) pixType = 'email';
        else if (/^\+?\d+$/.test(cleanKey)) {
            if (cleanKey.length <= 14) pixType = 'cpf';
            else pixType = 'phone';
        }

        console.log(`📍 Endpoint: disbursements | Tipo: ${pixType}`)

        // Tentaremos o endpoint de DISBURSEMENTS (mais moderno/comum para Marketplaces)
        const mpResponse = await fetch('https://api.mercadopago.com/v1/disbursements', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pix-${request.id.substring(0, 20)}`
            },
            body: JSON.stringify({
                amount: Number(request.amount),
                payout_method_id: 'pix',
                collector_id: request.id.substring(0, 10), // Algumas versões pedem isso
                receiver: {
                    account_number: cleanKey,
                    account_type: pixType
                }
            })
        })

        const mpResult = await mpResponse.json()

        if (!mpResponse.ok) {
            console.error('❌ Erro Mercado Pago (DETALHADO):', JSON.stringify(mpResult, null, 2))

            // Tratamento especial para conta sem permissão ou erro de sistema do MP
            if (mpResult.message === 'Invalid signature' || mpResponse.status === 403 || mpResponse.status === 400) {
                throw new Error(`O Mercado Pago recusou o envio automático. Motivo: Sua conta ainda não tem a função de "Payouts/Transferências via API" liberada ou os dados da chave PIX são incompatíveis com o seu perfil de conta. Por favor, realize o PIX manualmente pelo aplicativo do celular.`)
            }

            throw new Error(`Erro Mercado Pago: ${mpResult.message || 'Falha na transferência'}`)
        }

        console.log('✅ PIX enviado com sucesso via Disbursements API!')

        // 4. Finalize Database via RPC
        const { error: rpcError } = await supabaseAdmin.rpc('process_withdraw_request', {
            p_withdraw_id: request.id,
            p_admin_id: userId,
            p_action: 'approve',
            p_reason: 'Pago automaticamente via Payouts API Mercado Pago'
        })

        if (rpcError) throw rpcError

        return new Response(
            JSON.stringify({ success: true, status: 'approved', mp_id: mpResult.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Function Error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
