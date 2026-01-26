import { supabase } from '../../lib/supabase';

export const notifyAllUsers = async (title: string, message: string) => {
    try {
        const { error } = await supabase.functions.invoke('send-push', {
            body: {
                title,
                body: message,
                broadcast: true,
                url: '/'
            }
        });

        if (error) throw error;
        console.log('Broadcast sent successfully');
    } catch (error) {
        console.error('Failed to broadcast:', error);
    }
};
