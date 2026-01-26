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

    // Validação da Chave VAPID
    if (!VAPID_PUBLIC_KEY) {
        console.error('VITE_VAPID_PUBLIC_KEY não configurada no ambiente!');
        return false;
    }

    try {
        // 1. Register Service Worker if not already
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // 2. FORCE UNSUBSCRIBE FIRST (Handle Key Changes)
        // Isso resolve o erro "A subscription with a different applicationServerKey already exists"
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
            console.log('Unsubscribing old push sub to apply new keys...');
            await existingSub.unsubscribe();
        }

        // 3. Subscribe with new key
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        const pushSubscription = await registration.pushManager.subscribe(subscribeOptions);

        // 4. Save to Database
        const { error } = await supabase
            .from('user_push_subscriptions')
            .upsert({
                user_id: userId,
                subscription: pushSubscription,
                user_agent: navigator.userAgent
            }, { onConflict: 'user_id' }); // Use upsert to avoid duplicates

        if (error) throw error;

        console.log('Web Push Subscribed Successfully:', pushSubscription);
        return true;

    } catch (error: any) {
        console.error('Failed to subscribe to Web Push:', error);

        // Dica específica para Modo Incógnito
        if (error.name === 'AbortError' || error.message?.includes('incognito')) {
            alert('Atenção: Notificações não funcionam em Modo Incógnito do Chrome. Use a janela normal.');
        } else if (error.name === 'NotAllowedError') {
            alert('Permissão Negada! Por favor, clique no cadeado do navegador e ative as notificações.');
        } else {
            alert('Erro ao ativar notificações: ' + error.message);
        }

        return false;
    }
}
