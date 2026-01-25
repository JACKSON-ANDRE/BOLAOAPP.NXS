import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-[#141417] border border-[#27272A] p-4 rounded-xl shadow-2xl flex flex-col gap-3 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm mb-1">
                        {offlineReady ? 'Pronto para uso offline' : 'Nova versão disponível'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                        {offlineReady
                            ? 'O app pode ser usado mesmo sem internet.'
                            : 'Clique em atualizar para carregar as novidades.'}
                    </p>
                </div>
                <button onClick={close} className="text-zinc-500 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            {needRefresh && (
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-bold text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <RefreshCw size={14} className="animate-spin-slow" />
                    ATUALIZAR AGORA
                </button>
            )}
        </div>
    );
};

export default ReloadPrompt;
