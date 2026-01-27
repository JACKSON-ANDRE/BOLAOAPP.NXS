import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, LogIn, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../src/hooks/usePWAInstall';

const Gateway: React.FC = () => {
    const { isInstallable, install } = usePWAInstall();
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    return (
        <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">

                {/* LOGO */}
                <div className="mb-10 flex justify-center">
                    <img
                        src="/login-logo.jpg"
                        alt="Bolão App"
                        className="w-32 h-32 rounded-3xl shadow-2xl shadow-emerald-500/20"
                    />
                </div>

                <h1 className="text-4xl font-black text-white mb-2">BOLÃO APP</h1>
                <p className="text-zinc-500 text-lg mb-10">Aposte com amigos, ganhe com a comunidade.</p>

                <div className="space-y-4">
                    {/* INSTALL BUTTON & INSTRUCTIONS */}
                    {!isStandalone && (
                        <div className="flex flex-col gap-4">
                            {/* Primary Install Button - Aggressive Approach */}
                            <button
                                onClick={async () => {
                                    const success = await install();
                                    if (!success) {
                                        // Se falhou (evento não pronto ou iOS), mostra o alerta manual
                                        alert('Para instalar agora:\n\n1. Clique nos 3 pontinhos (Android) ou Compartilhar (iOS)\n2. Selecione "Instalar Aplicativo" ou "Adicionar à Tela de Início"');
                                    }
                                }}
                                className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-95"
                            >
                                <Download size={22} />
                                <span>{isInstallable ? 'INSTALAR AGORA' : 'BAIXAR APLICATIVO'}</span>
                            </button>

                            {/* Help Card - Discretely informative instead of blocking */}
                            <div className="bg-[#141417] border border-[#27272A] rounded-2xl p-5 text-sm text-zinc-400 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <h4 className="text-white font-bold mb-3 flex items-center justify-center gap-2">
                                    <PlusSquare size={18} className="text-[#10B981]" />
                                    Instalação Rápida
                                </h4>
                                {isIOS ? (
                                    <p className="flex items-center justify-center gap-2 font-medium text-white bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                                        Compartilhar <Share size={18} className="text-[#10B981]" /> &gt; Tela de Início
                                    </p>
                                ) : (
                                    <p className="font-medium text-zinc-300">
                                        {isInstallable
                                            ? 'Clique no botão acima para baixar direto.'
                                            : 'Se o botão acima não abrir, use o menu do navegador e selecione "Instalar App".'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LOGIN BUTTON - Tertiary for Browsers */}
                    <Link
                        to="/login"
                        className="w-full bg-transparent hover:bg-white/5 text-zinc-500 hover:text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-sm border border-transparent hover:border-[#27272A]"
                    >
                        <LogIn size={18} />
                        <span>Entrar pelo Navegador</span>
                    </Link>
                </div>

                <p className="mt-8 text-xs text-zinc-600">
                    &copy; 2026 Bolão App. Todos os direitos reservados.
                </p>

            </div>
        </div>
    );
};

export default Gateway;
