import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "https://esm.sh/web-push@3.6.7";

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

        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || "mailto:admin@bolaoapp.com";
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        let tokens = [];

        if (broadcast) {
            // 1. Send to EVERYONE
            const { data: allSubs, error } = await supabase
                .from('user_push_subscriptions')
                .select('subscription');
            if (error) throw error;
            tokens = allSubs.map(s => s.subscription);
        } else if (target === 'admins') {
            // 2. Send to ADMINS only
            const { data: adminSubs, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin');

            if (error) throw error;
            const adminIds = adminSubs.map(a => a.id);

            const { data: subs, error: subError } = await supabase
                .from('user_push_subscriptions')
                .select('subscription')
                .in('user_id', adminIds);

            if (subError) throw subError;
            tokens = subs.map(s => s.subscription);
        } else if (user_id) {
            // 3. Send to SPECIFIC user
            const { data: subData, error } = await supabase
                .from('user_push_subscriptions')
                .select('subscription')
                .eq('user_id', user_id)
                .maybeSingle();
            if (error) throw error;
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

        const results = await Promise.all(tokens.map(sub =>
            webpush.sendNotification(sub, payload).catch(err => {
                console.error("Single send failed:", err.message);
                return null;
            })
        ));

        return new Response(JSON.stringify({
            success: true,
            message: `Sent to ${results.filter(r => r !== null).length} devices`
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
