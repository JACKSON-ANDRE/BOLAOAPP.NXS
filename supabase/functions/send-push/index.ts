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
        try {
            const { user_id, title, body, url, broadcast } = await req.json();

            // Validation: If NOT broadcast, we neeed user_id. If broadcast, we just need title/body.
            if (!broadcast && !user_id) {
                throw new Error("Missing required fields: user_id (for direct message)");
            }
            if (!title || !body) {
                throw new Error("Missing title or body");
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

            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

            // PROCESSING LOGIC...
            let tokens = [];

            if (broadcast) {
                const { data: allSubs, error: dbError } = await supabase
                    .from('user_push_subscriptions')
                    .select('subscription');
                if (dbError) throw dbError;
                tokens = allSubs.map(s => s.subscription);
            } else {
                if (!user_id) throw new Error("Missing user_id for direct message");

                const { data: subData, error: dbError } = await supabase
                    .from('user_push_subscriptions')
                    .select('subscription')
                    .eq('user_id', user_id)
                    .maybeSingle();

                if (dbError) throw dbError;
                if (subData) tokens.push(subData.subscription);
            }

            if (tokens.length === 0) {
                return new Response(JSON.stringify({ message: "No subscribers found", success: false }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            const payload = JSON.stringify({
                title,
                body,
                url: url || '/',
                icon: '/icon-192.png'
            });

            // Send to all tokens (Parallel)
            const sendPromises = tokens.map(sub =>
                webpush.sendNotification(sub, payload).catch(err => {
                    console.error("Failed to send to one sub:", err);
                    return null;
                })
            );

            await Promise.all(sendPromises);

            return new Response(JSON.stringify({ success: true, message: `Sent to ${tokens.length} devices` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } catch (error: any) {

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
