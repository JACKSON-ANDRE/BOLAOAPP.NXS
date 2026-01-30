import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "npm:web-push";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { user_id, title, body: messageBody, url, broadcast, target } = await req.json();

        // Initialize Supabase (Service Role)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- BUSCA DINÂMICA DAS CHAVES NO BANCO ---
        const { data: settings } = await supabase
            .from('app_settings')
            .select('vapid_public_key, vapid_private_key')
            .eq('id', 1)
            .maybeSingle();

        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || "mailto:admin@bolaoapp.com";
        const vapidPublicKey = settings?.vapid_public_key || Deno.env.get('VAPID_PUBLIC_KEY')!;
        const vapidPrivateKey = settings?.vapid_private_key || Deno.env.get('VAPID_PRIVATE_KEY')!;

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error("VAPID keys not found in DB or Environment");
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        let tokens = [];

        if (broadcast) {
            // 1. Send to EVERYONE
            const { data: allSubs, error: subError } = await supabase
                .from('user_push_subscriptions')
                .select('subscription');
            if (subError) throw subError;
            tokens = allSubs ? allSubs.map(s => s.subscription) : [];
        } else if (target === 'admins') {
            // 2. Send to ADMINS only
            const { data: adminSubs, error: adminError } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin');

            if (adminError) throw adminError;
            const adminIds = adminSubs ? adminSubs.map(a => a.id) : [];

            if (adminIds.length > 0) {
                const { data: subs, error: subError } = await supabase
                    .from('user_push_subscriptions')
                    .select('subscription')
                    .in('user_id', adminIds);

                if (subError) throw subError;
                tokens = subs ? subs.map(s => s.subscription) : [];
            }
        } else if (user_id) {
            // 3. Send to SPECIFIC user
            const { data: subData, error: subError } = await supabase
                .from('user_push_subscriptions')
                .select('subscription')
                .eq('user_id', user_id)
                .maybeSingle();
            if (subError) throw subError;
            if (subData) tokens.push(subData.subscription);
        }

        if (tokens.length === 0) {
            return new Response(JSON.stringify({ success: false, message: "No subscribers found for target" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        const payload = JSON.stringify({
            title,
            body: messageBody,
            url: url || '/',
            icon: 'https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/app_assets/pwa-icon.png'
        });

        // Use Promise.allSettled for robust sending
        const results = await Promise.allSettled(tokens.map(sub =>
            webpush.sendNotification(sub, payload)
        ));

        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error(`Token ${i} failed:`, r.reason.message || r.reason);
                if (r.reason.body) console.error(`Token ${i} response body:`, r.reason.body);
            }
        });

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`Push execution finished: ${successful} success, ${failed} failed`);

        return new Response(JSON.stringify({
            success: true,
            message: `Sent to ${successful} devices (${failed} failed)`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error("Function error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
