import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, LogIn } from 'lucide-react';
import { usePWAInstall } from '../src/hooks/usePWAInstall';

const Gateway: React.FC = () => {
    const { isInstallable, install } = usePWAInstall();
    const navigate = useNavigate();

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
                    {/* LOGIN BUTTON */}
                    <Link
                        to="/login"
                        className="w-full bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg border border-[#27272A]"
                    >
                        <LogIn size={22} className="text-zinc-400" />
                        <span>Logar no Navegador</span>
                    </Link>

                    {/* INSTALL BUTTON (OR IOS INSTRUCTION) */}
                    {isInstallable ? (
                        <button
                            onClick={install}
                            className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg shadow-emerald-500/20"
                        >
                            <Download size={22} />
                            <span>Baixar Aplicativo</span>
                        </button>
                    ) : (
                        <div className="bg-[#141417] border border-[#27272A] rounded-2xl p-4 text-sm text-zinc-500">
                            <p>Para instalar no iOS:</p>
                            <p className="mt-1 font-bold text-white">Compartilhar <span className='mx-1'>square.and.arrow.up</span> &gt; Tela de Início <span className='mx-1'>plus.square</span></p>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-xs text-zinc-600">
                    &copy; 2026 Bolão App. Todos os direitos reservados.
                </p>

            </div>
        </div>
    );
};

export default Gateway;
