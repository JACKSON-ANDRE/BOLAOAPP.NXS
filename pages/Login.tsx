
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrendingUp, Mail, Lock, Loader2, Download, Eye, EyeOff, Check } from 'lucide-react';
import { usePWAInstall } from '../src/hooks/usePWAInstall';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isInstallable, install } = usePWAInstall();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Salva a preferência de persistência para o ControlledStorage
    localStorage.setItem('bt_remember', rememberMe ? 'true' : 'false');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const intendedPath = sessionStorage.getItem('intended_path');
      if (intendedPath) {
        sessionStorage.removeItem('intended_path');
        // Extract route from hash (remove #)
        const target = intendedPath.replace(/^#/, '');
        navigate(target);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 flex justify-center">
            <img
              src="/login-logo.jpg"
              alt="Bolão App"
              className="w-24 h-24 rounded-2xl shadow-lg shadow-emerald-500/20"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">Bem-vindo de volta</h1>
          <p className="text-zinc-500 mt-2">Acesse sua conta para começar a brincar !</p>
        </div>

        <div className="bg-[#141417] border border-[#27272A] p-8 rounded-3xl shadow-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">E-mail</label>
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

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#10B981] border-[#10B981]' : 'border-zinc-600 bg-transparent group-hover:border-zinc-500'}`}>
                  {rememberMe && <Check size={14} className="text-black stroke-[3]" />}
                </div>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Manter conectado</span>
              </div>

              <Link
                to="/forgot-password"
                className="text-sm text-[#10B981] hover:underline relative z-10 p-2 -m-2 inline-block"
              >
                Esqueceu a senha?
              </Link>
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
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar na Conta'}
            </button>
          </form>

          <div className="mt-8 text-center text-zinc-500 text-sm">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-[#10B981] font-semibold hover:underline">
              Crie uma agora
            </Link>
          </div>


          {/* PWA INSTALL BUTTON REMOVED (Moved to Gateway) */}
        </div>
      </div>
    </div>
  );
};

export default Login;
