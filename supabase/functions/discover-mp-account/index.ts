import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    try {
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!mpAccessToken) throw new Error("MP_ACCESS_TOKEN is missing");

        // 1. Check User Info (Tags, Type)
        const userRes = await fetch('https://api.mercadopago.com/users/me', {
            headers: { 'Authorization': `Bearer ${mpAccessToken}` }
        });
        const userData = await userRes.json();

        // 2. Check Payment Methods (if useful)
        const pmRes = await fetch('https://api.mercadopago.com/v1/payment_methods', {
            headers: { 'Authorization': `Bearer ${mpAccessToken}` }
        });
        const pmData = await pmRes.json();

        return new Response(
            JSON.stringify({
                message: "Mercado Pago Account Discovery",
                mp_tags: userData.tags,
                site_id: userData.site_id,
                user_type: userData.user_type, // 'normal', 'operator', etc.
                points: userData.points,
                test_user: userData.test_user,
                // Raw data for deep inspection if needed
                raw_user: userData,
                raw_payment_methods: Array.isArray(pmData) ? pmData.map(p => p.id) : pmData
            }, null, 2),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
