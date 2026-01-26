
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // URL MUST be configured in Supabase Auth Settings -> Redirect URLs
            // Typically window.location.origin + '/update-password'
            const redirectUrl = `${window.location.origin}/update-password`;

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="mx-auto mb-6 flex justify-center">
                        <img
                            src="/login-logo.jpg"
                            alt="Bolão App"
                            className="w-24 h-24 rounded-2xl shadow-lg shadow-emerald-500/20 opacity-80"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Recuperar Senha</h1>
                    <p className="text-zinc-500 mt-2">Informe seu e-mail para receber o link de troca</p>
                </div>

                <div className="bg-[#141417] border border-[#27272A] p-8 rounded-3xl shadow-xl">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-[#10B981]" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">E-mail Enviado!</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Verifique sua caixa de entrada (e spam) para redefinir sua senha.
                            </p>
                            <Link
                                to="/login"
                                className="inline-block w-full bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Voltar para o Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">E-mail Cadastrado</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-4 rounded-xl text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Link de Recuperação'}
                            </button>

                            <div className="text-center pt-2">
                                <Link to="/login" className="text-zinc-500 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors">
                                    <ArrowLeft size={16} />
                                    Voltar para Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
