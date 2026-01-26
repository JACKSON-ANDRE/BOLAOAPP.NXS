import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BellRing, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { subscribeToPushNotifications } from '../utils/pushNotifications';

interface NotificationGuardProps {
    children: React.ReactNode;
}

const NotificationGuard: React.FC<NotificationGuardProps> = ({ children }) => {
    const { session, loading: authLoading } = useAuth();
    const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);
    const [activationLoading, setActivationLoading] = useState(false);
    const [directUserEmail, setDirectUserEmail] = useState<string>('');

    useEffect(() => {
        const verifyAndBlock = async () => {
            // 1. Get Real User (Direct) to bypass potential Context lags
            const { data: { user: directUser } } = await supabase.auth.getUser();

            // Updates debug info
            if (directUser) {
                setDirectUserEmail(directUser.email || 'No Email');
            } else {
                setDirectUserEmail('No User');
            }

            // 2. Decide if we should check subscription
            // If Context is loading, we wait. UNLESS direct user is already found, then we can proceed.
            // Actually, waiting for authLoading is safer to avoid flicker, but if Context is dead, we rely on directUser.

            const effectiveUser = directUser || session?.user;

            if (!effectiveUser) {
                if (!authLoading) {
                    setHasSubscription(true); // Truly logged out and finished loading
                }
                return;
            }

            // 3. User detected! Check DB
            setChecking(true);
            try {
                const { data, error } = await supabase
                    .from('user_push_subscriptions')
                    .select('id')
                    .eq('user_id', effectiveUser.id)
                    .maybeSingle();

                if (data && data.id) {
                    setHasSubscription(true);
                } else {
                    setHasSubscription(false); // BLOCK!
                }
            } catch (err) {
                console.error('Error checking sub:', err);
                setHasSubscription(true);
            } finally {
                setChecking(false);
            }
        };

        if (!authLoading || directUserEmail) {
            verifyAndBlock();
        }

        // Polling backup just in case
        const interval = setInterval(() => {
            if (hasSubscription === null) verifyAndBlock();
        }, 3000);

        return () => clearInterval(interval);

    }, [session?.user, authLoading]);

    const handleActivate = async () => {
        let targetId = session?.user?.id;

        // Fallback to direct check if session missing
        if (!targetId) {
            const { data } = await supabase.auth.getUser();
            targetId = data.user?.id;
        }

        if (!targetId) return;

        setActivationLoading(true);
        try {
            // Force registration
            const success = await subscribeToPushNotifications(targetId);
            if (success) {
                // SUCCESS
                alert('Notificações ativadas! Acesso liberado.');
                window.location.reload();
            } else {
                alert('Não foi possível ativar. Verifique se as permissões do navegador estão bloqueadas.');
                setActivationLoading(false);
            }
        } catch (err: any) {
            alert('Erro: ' + err.message);
            setActivationLoading(false);
        }
    };

    // If we are checking, OR if we haven't decided yet (null), show spinner
    // EXCEPTION: If auth is loading, we show spinner.
    if (authLoading && hasSubscription === null) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#10B981]" size={32} />
            </div>
        );
    }

    // IF we decided False => BLOCK
    if (hasSubscription === false) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-[#141417] border border-[#27272A] p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-[#10B981]/10">
                    <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <BellRing size={40} className="text-[#10B981]" />
                    </div>

                    <h1 className="text-2xl font-black text-white mb-3">
                        Atualização de Segurança
                    </h1>

                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        Para garantir a segurança da sua conta e recebimento de prêmios, é obrigatório ativar o novo sistema de notificações.
                    </p>

                    <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 mb-8 text-left space-y-3">
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <ShieldCheck className="text-[#10B981]" size={18} />
                            <span>Avisos de Depósitos e Saques</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-300">
                            <ShieldCheck className="text-[#10B981]" size={18} />
                            <span>Resultados dos Bolões</span>
                        </div>
                    </div>

                    <button
                        onClick={handleActivate}
                        disabled={activationLoading}
                        className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                    >
                        {activationLoading ? <Loader2 className="animate-spin" /> : 'ATIVAR E LIBERAR ACESSO'}
                    </button>

                    <p className="text-[10px] text-zinc-600 mt-4">
                        Ao clicar, permita as notificações no navegador.
                    </p>

                    {/* Debug inside blocker */}
                    <div className="text-red-500 text-[10px] mt-4 font-mono">
                        User: {session?.user?.email} | Direct: {directUserEmail}
                    </div>
                </div>
            </div>
        );
    }

    // Pass through
    return (
        <>
            <div className="bg-red-500 text-white text-[10px] font-bold text-center fixed top-0 w-full z-[10000]">
                CTX_Load: {authLoading ? 'T' : 'F'} | User: {session?.user?.email ? 'OK' : 'NULL'} | Direct: {directUserEmail} | Sub: {hasSubscription === null ? 'NULL' : hasSubscription ? 'T' : 'F'}
            </div>
            {children}
        </>
    );
};

export default NotificationGuard;
