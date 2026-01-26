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

export async function subscribeToPushNotifications(userId: string, silent = false) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!silent) console.warn('Push messaging is not supported');
        return false;
    }

    // Validação da Chave VAPID
    if (!VAPID_PUBLIC_KEY) {
        if (!silent) console.error('VITE_VAPID_PUBLIC_KEY não configurada no ambiente!');
        return false;
    }

    if (!silent) console.log('--- PUSH SETUP V10 (Harden Reset) ---');

    try {
        // 1. Service Worker Initialization
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Skip aggressive cleanup in silent mode to avoid flicker, just upsert current
        // BUT if current is null, we must subscribe
        let pushSubscription = await registration.pushManager.getSubscription();

        if (!pushSubscription) {
            // 3. New Subscription
            if (!silent) console.log('Requesting new subscription with key:', VAPID_PUBLIC_KEY);
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            };
            pushSubscription = await registration.pushManager.subscribe(subscribeOptions);

            // 4. Save to Database
            const { error } = await supabase
                .from('user_push_subscriptions')
                .upsert({
                    user_id: userId,
                    subscription: pushSubscription,
                    user_agent: navigator.userAgent
                }, { onConflict: 'user_id' });

            if (error) throw error;
            if (!silent) console.log('Web Push OK (New)!', pushSubscription);
            return true;
        } else {
            // If already subscribed, just update DB to be sure
            if (!silent) console.log('Existing subscription found, syncing...');

            const { error } = await supabase
                .from('user_push_subscriptions')
                .upsert({
                    user_id: userId,
                    subscription: pushSubscription,
                    user_agent: navigator.userAgent
                }, { onConflict: 'user_id' });

            if (error) throw error;
            if (!silent) console.log('Web Push OK (Synced)!', pushSubscription);
            return 'EXISTING';
        }

    } catch (error: any) {
        // --- AUTO-RECOVERY LOGIC FOR KEY CHANGE ---
        // If the browser holds an old key diff than expected, it throws invalidaccesserror or explicit message
        if (
            error.name === 'InvalidAccessError' ||
            error.name === 'InvalidStateError' ||
            error.message?.includes('different applicationServerKey')
        ) {
            if (!silent) console.warn('Key mismatch detected! Attempting auto-recovery...');

            try {
                const registration = await navigator.serviceWorker.ready;
                const sub = await registration.pushManager.getSubscription();
                if (sub) {
                    await sub.unsubscribe();
                    if (!silent) console.log('Old subscription removed. Retrying...');
                    // Recursive call to create new
                    return await subscribeToPushNotifications(userId, silent);
                }
            } catch (recoveryErr) {
                console.error('Recovery failed:', recoveryErr);
            }
        }

        if (silent) {
            // Log for developers but don't alert or spam
            console.warn('Silent Push Sync skipped:', error.name, error.message);
            return false;
        }

        console.error('Push Error:', error);

        if (error.name === 'AbortError' || error.message?.includes('incognito')) {
            alert('Atenção: Notificações não funcionam em Modo Incógnito/Anônimo.');
        } else if (error.name === 'NotAllowedError') {
            alert('Permissão Negada! Ative no cadeado do navegador.');
        } else {
            alert('Erro: ' + error.message);
        }

        return false;
    }
}
