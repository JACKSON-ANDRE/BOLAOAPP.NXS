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

                <div className="space-y-6">
                    {/* BUTTON 1: BAIXAR APP */}
                    {!isStandalone && (
                        <button
                            onClick={async () => {
                                const success = await install();
                                if (!success) {
                                    alert('Para instalar:\n\n1. Clique nos 3 pontinhos (Android) ou Compartilhar (iOS)\n2. Selecione "Instalar App" ou "Adicionar à Tela de Início"');
                                }
                            }}
                            className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-xl shadow-xl shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-95"
                        >
                            <Download size={26} />
                            <span>BAIXAR APP</span>
                        </button>
                    )}

                    {/* BUTTON 2: LOGAR NO NAVEGADOR */}
                    <Link
                        to="/login"
                        className="w-full bg-[#1C1C21] hover:bg-[#27272A] text-zinc-300 hover:text-white font-bold py-5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg border border-[#27272A]"
                    >
                        <LogIn size={22} />
                        <span>LOGAR NO NAVEGADOR</span>
                    </Link>
                </div>

                <p className="mt-12 text-xs text-zinc-600 font-medium tracking-widest uppercase">
                    &copy; 2026 Bolão App
                </p>

            </div>
        </div>
    );
};

export default Gateway;
