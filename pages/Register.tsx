
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrendingUp, Mail, Lock, User, Loader2, CheckCircle2, Camera } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Você precisa aceitar os termos de uso.");
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Criar usuário
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // 2. Upload do Avatar (Se houver)
      if (avatarFile) {
        try {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${data.user.id}/profile.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile, { upsert: true });

          if (!uploadError) {
            // 3. Atualizar perfil com a URL
            await supabase
              .from('profiles')
              .update({ avatar_url: fileName })
              .eq('id', data.user.id);
          }
        } catch (uploadErr) {
          console.error("Erro ao subir foto, mas conta criada:", uploadErr);
        }
      }

      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#10B981] rounded-2xl flex items-center justify-center text-[#0A0A0B] mx-auto mb-4">
            <TrendingUp size={40} strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-bold text-white">Criar Conta</h1>
          <p className="text-zinc-500 mt-2">Junte-se à maior comunidade de bolões</p>
        </div>

        <div className="bg-[#141417] border border-[#27272A] p-8 rounded-3xl shadow-xl">
          <form onSubmit={handleRegister} className="space-y-5">

            {/* AVATAR UPLOAD */}
            <div className="flex justify-center mb-4">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#27272A] group-hover:border-[#10B981] transition-colors bg-[#0A0A0B] flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-zinc-600" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-[#10B981] text-[#0A0A0B] rounded-full p-1.5 border-2 border-[#141417]">
                  <Camera size={16} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                  placeholder="João da Silva"
                />
              </div>
            </div>

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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <button
                type="button"
                onClick={() => setTermsAccepted(!termsAccepted)}
                className={`mt-0.5 rounded flex-shrink-0 transition-colors ${termsAccepted ? 'text-[#10B981]' : 'text-zinc-600'}`}
              >
                <CheckCircle2 size={20} fill={termsAccepted ? 'currentColor' : 'none'} />
              </button>
              <label className="text-xs text-zinc-500 leading-relaxed cursor-pointer" onClick={() => setTermsAccepted(!termsAccepted)}>
                Eu aceito os <span className="text-[#10B981]">Termos de Uso</span> e a <span className="text-[#10B981]">Política de Privacidade</span> do Bolão App.
              </label>
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
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Criar minha Conta'}
            </button>
          </form>

          <div className="mt-8 text-center text-zinc-500 text-sm">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-[#10B981] font-semibold hover:underline">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
