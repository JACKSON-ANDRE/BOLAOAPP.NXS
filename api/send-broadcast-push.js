// api/send-broadcast-push.js
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// MUST be Service Role to read all subscriptions and bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

webpush.setVapidDetails(
    'mailto:admin@bolaoapp.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).json({ error: 'Missing title or message' });
    }

    try {
        // 1. Fetch All Subscriptions
        // We paginate or just fetch all (assuming < 10k users for now)
        const { data: subs, error } = await supabase
            .from('user_push_subscriptions')
            .select('subscription, user_id');

        if (error) throw error;

        console.log(`Sending broadcast to ${subs.length} devices.`);

        const payload = JSON.stringify({ title, body: message });

        // 2. Send in Parallel
        let successCount = 0;
        let failCount = 0;

        // Process in chunks of 50 to avoid creating too many promises at once if userbase grows
        const chunkSize = 50;
        for (let i = 0; i < subs.length; i += chunkSize) {
            const chunk = subs.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (sub) => {
                try {
                    await webpush.sendNotification(sub.subscription, payload);
                    successCount++;
                } catch (err) {
                    failCount++;
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Token dead, remove it
                        await supabase.from('user_push_subscriptions').delete().match({ subscription: sub.subscription });
                    }
                }
            }));
        }

        return res.status(200).json({ success: true, sent: successCount, failed: failCount });

    } catch (err) {
        console.error('Broadcast Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
