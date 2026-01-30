import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, LogIn, Share, PlusSquare, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../src/hooks/usePWAInstall';
import { useState, useEffect } from 'react';

const Gateway: React.FC = () => {
    const { isInstallable, isInstalled, install } = usePWAInstall();
    const navigate = useNavigate();
    const [installing, setInstalling] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [installedSuccess, setInstalledSuccess] = useState(false);

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    useEffect(() => {
        /*
        if (isInstalled || isStandalone) {
            setInstalledSuccess(true);
            const timer = setTimeout(() => {
                navigate('/login');
            }, 2500);
            return () => clearTimeout(timer);
        }
        */
    }, [isInstalled, isStandalone, navigate]);

    return (
        <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">

                {/* LOGO */}
                <div className="mb-6 flex justify-center">
                    <img
                        src="/login-logo.jpg"
                        alt="Bolão App"
                        className="w-32 h-32 rounded-3xl shadow-2xl shadow-emerald-500/20"
                    />
                </div>

                <p className="text-zinc-400 text-xl font-medium mb-12 italic">Brinque com seus amigos!</p>

                <div className="space-y-6">
                    {/* BUTTON 1: BAIXAR APP (Direct Flow) */}
                    {!isStandalone && !installedSuccess && (
                        <div className="space-y-3">
                            <button
                                onClick={async () => {
                                    if (isIOS) {
                                        setShowInstructions(true);
                                        return;
                                    }

                                    setInstalling(true);
                                    const success = await install();

                                    if (!success) {
                                        // User dismissed or something failed
                                        setInstalling(false);
                                        // For Android/PC, if it's installable but they didn't accept, 
                                        // we don't necessarily want to force instructions, 
                                        // but it helps if they are lost.
                                        setShowInstructions(true);
                                    }
                                    // If success, keep installing=true until appinstalled event fires
                                }}
                                disabled={installing}
                                className={`w-full ${installing ? 'bg-zinc-700' : 'bg-[#10B981] hover:bg-[#059669]'} text-[#0A0A0B] font-black py-5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-xl shadow-xl shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-95`}
                            >
                                {installing ? <Loader2 className="animate-spin" size={26} /> : <Download size={26} />}
                                <span>{installing ? 'INSTALANDO...' : 'BAIXAR APP'}</span>
                            </button>

                            <button
                                onClick={() => setShowInstructions(true)}
                                className="text-zinc-500 text-[10px] font-bold uppercase hover:text-white transition-colors"
                            >
                                Não conseguiu instalar? Clique aqui
                            </button>
                        </div>
                    )}

                    {installedSuccess && (
                        <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4 text-[#0A0A0B]">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-white font-black text-xl mb-1 uppercase italic">Instalação em Curso!</h3>
                            <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                                Você já pode fechar esta aba. O App será instalado em segundo plano e o ícone aparecerá no seu celular em instantes.
                            </p>
                            <p className="text-[#10B981] text-[10px] font-bold mt-2 animate-pulse uppercase">Redirecionando para segurança...</p>
                        </div>
                    )}

                    {!isStandalone && isIOS && (
                        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-tighter flex items-center justify-center gap-1.5 opacity-60">
                            <Share size={10} className="text-zinc-500" />
                            Toque em <span className="text-emerald-500/80">Compartilhar</span> e depois <span className="text-emerald-500/80">Adicionar à Tela de Início</span>
                        </p>
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

            {/* INSTRUCTIONS MODAL */}
            {showInstructions && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-sm p-8 relative overflow-hidden">
                        <button
                            onClick={() => setShowInstructions(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PlusSquare className="text-[#10B981]" size={32} />
                            </div>
                            <h2 className="text-xl font-black text-white uppercase italic">Instalação Manual</h2>
                            <p className="text-zinc-500 text-sm">Seu aparelho requer um passo extra</p>
                        </div>

                        <div className="space-y-6">
                            {isIOS ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#27272A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm">1</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">Toque no ícone de <span className="text-[#10B981] font-bold">Compartilhar</span> (quadrado com seta pra cima) na barra do seu navegador.</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#27272A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm">2</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">Role para baixo e toque em <span className="text-[#10B981] font-bold">Adicionar à Tela de Início</span>.</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#27272A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm">3</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">Confirme o nome do App e toque em <span className="text-[#10B981] font-bold">Adicionar</span>.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#27272A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm">1</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">Toque nos <span className="text-[#10B981] font-bold">3 Pontinhos</span> no canto superior direito do navegador.</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#27272A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm">2</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">Selecione <span className="text-[#10B981] font-bold">Instalar Aplicativo</span> ou "Adicionar à tela inicial".</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-[#27272A] w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm">3</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">Aguarde o download e o ícone aparecerá no seu celular!</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowInstructions(false)}
                                className="w-full bg-[#10B981] text-[#0A0A0B] font-black py-4 rounded-2xl mt-4"
                            >
                                ENTENDI, VOU FAZER
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gateway;
