// api/send-admin-push.js
// This function runs on the server (Vercel)
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Service Role for Admin Access)
// We need SERVICE_ROLE_KEY to bypass RLS and fetch all admin tokens.
// If SERVICE_ROLE_KEY is not set, we can try to use standard key but RLS might block if not careful.
// Ideally, user should add SUPABASE_SERVICE_ROLE_KEY to Vercel env.
// For now, I will assume the key is passed or we use the anon key if policies allow admins to read all subs.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Web Push
webpush.setVapidDetails(
    'mailto:admin@bolaoapp.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
    // CORS Header (Allow all or specific domain)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).json({ error: 'Missing title or message' });
    }

    try {
        // 1. Fetch all subscriptions that belong to ADMIN users
        const { data: adminSubs, error } = await supabase
            .from('user_push_subscriptions')
            .select(`
        subscription,
        profiles!inner(role)
      `)
            .eq('profiles.role', 'admin');

        if (error) throw error;

        console.log(`Found ${adminSubs.length} admin subscriptions.`);

        // 2. Send Notification to all Admins
        const payload = JSON.stringify({ title, body: message });

        const promises = adminSubs.map(sub =>
            webpush.sendNotification(sub.subscription, payload)
                .catch(err => {
                    console.error('Error sending push:', err);
                    // If 410 (Gone), should delete from DB (TODO)
                })
        );

        await Promise.all(promises);

        return res.status(200).json({ success: true, sent_to: adminSubs.length });

    } catch (err) {
        console.error('Error in send-admin-push:', err);
        return res.status(500).json({ error: err.message });
    }
}
