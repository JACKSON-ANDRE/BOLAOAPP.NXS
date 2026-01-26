
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const UpdatePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Check if we have a session (Supabase auto-recovers from URL fragment)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session found immediately, wait a bit or redirect
                // Usually supabase.auth.onAuthStateChange handles this, but we'll safeguard
                const { error } = await supabase.auth.getUser(); // Try to get user
                if (error) {
                    // Normally we might redirect to login, but let's let the user try to type password 
                    // OR show an error that the link is invalid.
                    // The link should have set the session.
                }
            }
        };
        checkSession();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);

            // Redirect after delay
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar senha.');
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
                    <h1 className="text-2xl font-bold text-white">Nova Senha</h1>
                    <p className="text-zinc-500 mt-2">Digite sua nova senha de acesso</p>
                </div>

                <div className="bg-[#141417] border border-[#27272A] p-8 rounded-3xl shadow-xl">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                                <CheckCircle2 size={32} className="text-[#10B981]" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Sucesso!</h3>
                            <p className="text-zinc-400 text-sm">
                                Sua senha foi atualizada. <br />
                                Redirecionando para o app...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                                        placeholder="Mínimo 6 caracteres"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
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
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Nova Senha'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdatePassword;
