import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BellRing, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { subscribeToPushNotifications } from '../utils/pushNotifications';

interface NotificationGuardProps {
    children: React.ReactNode;
}

const NotificationGuard: React.FC<NotificationGuardProps> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);
    const [activationLoading, setActivationLoading] = useState(false);
    const [directUserEmail, setDirectUserEmail] = useState<string>('');
    const [safeMode] = useState(() => window.location.search.includes('safe=true'));

    useEffect(() => {
        const verifyAndBlock = async () => {
            if (!user && !authLoading) {
                setHasSubscription(true);
                return;
            }
            if (!user) return;

            try {
                // Check DB quietly
                const { data } = await supabase
                    .from('user_push_subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data && data.id) {
                    setHasSubscription(true);
                } else {
                    // SE NÃO TIVER NO BANCO: Mostra o bloqueio para forçar ativação
                    setHasSubscription(false);
                    if ((window as any).Forensic) (window as any).Forensic.save("GUARD: Usuário bloqueado (Falta assinatura).");
                }
            } catch (err) {
                setHasSubscription(true);
            }
        };

        verifyAndBlock();
    }, [user, authLoading]);

    const handleActivate = async () => {
        setActivationLoading(true);
        try {
            // Get user again to be 100% sure
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const targetId = user?.id || currentUser?.id;

            if (!targetId) {
                alert('Sessão expirada. Por favor, faça login novamente.');
                window.location.href = '#/login';
                return;
            }

            // Force registration
            const success = await subscribeToPushNotifications(targetId);
            if (success) {
                if ((window as any).Forensic) (window as any).Forensic.save("GUARD: Notificações ativadas com sucesso. Desbloqueando...");
                alert('✅ Notificações ativadas! Acesso liberado.');
                setHasSubscription(true); // Desbloqueia sem precisar de reload
            } else {
                alert('❌ Não foi possível ativar. Verifique se as permissões do navegador estão bloqueadas.');
            }
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setActivationLoading(false);
        }
    };

    // If we are checking, OR if we haven't decided yet (null), show spinner
    // EXCEPTION: If auth is loading, we show spinner.
    if ((authLoading || checking) && hasSubscription === null) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[#10B981]" size={32} />
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest animate-pulse">Sincronizando...</p>
                </div>
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
                        User: {user?.email} | Direct: {directUserEmail}
                    </div>
                </div>
            </div>
        );
    }

    // Pass through if subscription confirmed OR if in Safe Mode
    if (hasSubscription === true || safeMode) {
        return <>{children}</>;
    }

    // Default: Wait for check
    return (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
            <Loader2 className="animate-spin text-[#10B981]" size={32} />
        </div>
    );
};

export default NotificationGuard;
