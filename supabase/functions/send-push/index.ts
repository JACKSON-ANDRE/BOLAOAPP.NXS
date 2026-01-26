import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { user_id, title, body, url } = await req.json();

        if (!user_id || !title || !body) {
            throw new Error("Missing required fields: user_id, title, body");
        }

        // Initialize Supabase Client (Service Role for Admin Access)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get VAPID Keys from Secrets
        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || "mailto:admin@bolaoapp.com";
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

        if (!vapidPrivateKey || !vapidPublicKey) {
            throw new Error("VAPID Keys not configured in Supabase Secrets");
        }

        webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
        );

        // Fetch User Subscription
        const { data: subData, error: dbError } = await supabase
            .from('user_push_subscriptions')
            .select('subscription')
            .eq('user_id', user_id)
            .maybeSingle();

        if (dbError) throw dbError;
        if (!subData) {
            return new Response(JSON.stringify({ message: "No subscription found for user", success: false }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, // Not an error, just no sub
            });
        }

        const subscription = subData.subscription;
        const payload = JSON.stringify({
            title,
            body,
            url: url || '/',
            icon: '/icon-192.png'
        });

        // Send Push
        await webpush.sendNotification(subscription, payload);

        return new Response(JSON.stringify({ success: true, message: "Notification sent" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Push Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
