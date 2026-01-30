import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered');
        },
        onRegisterError(error) {
            console.error('SW Register Error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-0 right-0 p-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#141417] border border-[#10B981]/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[280px]">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-[#10B981] font-black text-xs uppercase tracking-widest mb-1">PWA Atualizado</p>
                        <p className="text-zinc-400 text-xs">
                            {offlineReady ? 'App pronto para uso offline' : 'Nova versão disponível!'}
                        </p>
                    </div>
                    <button onClick={close} className="text-zinc-600 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                {needRefresh && (
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                        <RefreshCw size={14} /> RECARREGAR AGORA
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReloadPrompt;
