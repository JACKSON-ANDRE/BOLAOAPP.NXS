import { supabase } from '../../lib/supabase';

// PREENCHA COM SUA CHAVE PÚBLICA VAPID (Gerada via web-push generate-vapid-keys)
// Se não tiver, o navegador pode dar erro ao tentar se inscrever.
// Para teste sem chave, em alguns casos funciona, mas o ideal é ter.
// Use a chave pública vinda do ambiente (configurada no Vercel/Env)
const VAPID_PUBLIC_KEY = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPushNotifications(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return false;
    }

    try {
        // 1. Register Service Worker if not already
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // 2. Subscribe
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);

        // 3. Save to Database
        const { error } = await supabase
            .from('user_push_subscriptions')
            .insert({
                user_id: userId,
                subscription: pushSubscription,
                user_agent: navigator.userAgent
            });

        if (error) throw error;

        console.log('Web Push Subscribed:', pushSubscription);
        return true;

    } catch (error) {
        console.error('Failed to subscribe to Web Push:', error);
        // Silent fail or return false
        return false;
    }
}
