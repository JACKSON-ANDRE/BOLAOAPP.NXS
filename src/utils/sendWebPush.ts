import { supabase } from '../../lib/supabase';

/**
 * Envia uma notificação Web Push via Edge Function.
 * Só funciona se o backend (Edge Functions) estiver configurado com VAPID_PRIVATE_KEY.
 */
export const sendWebPush = async (userId: string, title: string, body: string, url: string = '/') => {
    try {
        const { data, error } = await supabase.functions.invoke('send-push', {
            body: {
                user_id: userId,
                title,
                body,
                url
            }
        });

        if (error) {
            console.warn('[WebPush] Falha ao chamar a função:', error);
            return false;
        }

        if (data && !data.success) {
            console.warn('[WebPush] Resposta de erro do servidor:', data.message);
            return false;
        }

        console.log('[WebPush] Enviado com sucesso:', title);
        return true;
    } catch (err) {
        console.error('[WebPush] Erro crítico:', err);
        return false;
    }
};
