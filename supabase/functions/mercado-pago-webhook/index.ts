import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            status: 200,
            headers: corsHeaders
        })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Mercado Pago sends data in query params or body depending on the type
        const url = new URL(req.url)
        const topic = url.searchParams.get('topic') || url.searchParams.get('type')
        const id = url.searchParams.get('id') || url.searchParams.get('data.id')

        // Only interest in payment notifications
        if (topic === 'payment' || topic === 'payment.updated' || req.method === 'POST') {
            let paymentId = id;

            // If it's a POST, the ID might be in the body
            if (!paymentId) {
                const body = await req.json();
                paymentId = body.data?.id || body.id;
            }

            if (paymentId) {
                console.log(`Processing MP Payment ID: ${paymentId}`);

                // 1. Fetch real status from Mercado Pago API (Security)
                const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');
                const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: { 'Authorization': `Bearer ${mpAccessToken}` }
                });

                if (mpResponse.ok) {
                    const mpData = await mpResponse.json();
                    const status = mpData.status; // 'approved', 'pending', etc.
                    const externalReference = mpData.external_reference;

                    console.log(`Payment ${paymentId} status: ${status} | Ref: ${externalReference}`);

                    // 2. Update our database
                    // This will trigger the SQL on_deposit_approved function automatically
                    const { error } = await supabaseClient
                        .from('deposits')
                        .update({ status: status })
                        .eq('external_reference', externalReference)
                        .eq('status', 'pending'); // Only update if it was still pending

                    if (error) console.error('Error updating deposit:', error);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Webhook Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
