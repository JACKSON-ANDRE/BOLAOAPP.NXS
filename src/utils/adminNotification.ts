import { supabase } from '../../lib/supabase';

export const notifyAdmin = async (title: string, message: string) => {
    try {
        // Use the send-push Edge Function with broadcast: true
        // and let the function filter for admins (after we update the function)
        // OR pass a specific flag.

        await supabase.functions.invoke('send-push', {
            body: {
                title,
                body: message,
                broadcast: false, // We don't want to notify everyone
                target: 'admins', // New flag we'll handle in the Edge Function
                url: '/admin'
            }
        });
    } catch (error) {
        console.error('Failed to notify admin:', error);
    }
};
