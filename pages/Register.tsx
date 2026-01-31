import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { subscribeToPushNotifications } from '../src/utils/pushNotifications';
import { notifyAdmin } from '../src/utils/adminNotification';
import { TrendingUp, Mail, Lock, User, Loader2, CheckCircle2, Camera, Bell, Phone, MapPin } from 'lucide-react';
import { processImage } from '../src/utils/imageUtils';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true); // Default to true
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
    if (!whatsapp || !city || !state || !fullName || !email || !password) {
      setError("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (!avatarFile) {
      setError("A foto de perfil é obrigatória para segurança do PIX.");
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
      let uploadedAvatarUrl = null;

      // 2. Upload do Avatar (Se houver)
      if (avatarFile) {
        try {
          // Process image before upload
          const processedBlob = await processImage(avatarFile);
          const fileName = `${data.user.id}/profile.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, processedBlob, {
              upsert: true,
              contentType: 'image/jpeg'
            });

          if (!uploadError) {
            uploadedAvatarUrl = fileName;
          }
        } catch (uploadErr) {
          console.error("Erro ao subir foto, mas conta criada:", uploadErr);
        }
      }

      // 3. Atualizar perfil com todos os dados (Foto, WhatsApp, Cidade, Estado)
      try {
        const profileUpdates: any = {
          whatsapp,
          city,
          state,
          updated_at: new Date()
        };
        if (uploadedAvatarUrl) profileUpdates.avatar_url = uploadedAvatarUrl;

        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', data.user.id);

        if (updateError) throw updateError;

      } catch (profileErr) {
        console.error("Erro ao atualizar perfil inicial:", profileErr);
        // Não bloqueamos o fluxo, mas logamos o erro
      }

      // 4. Solicitar Notificações (Opcional - mas sugerido)
      if (pushEnabled) {
        try {
          await subscribeToPushNotifications(data.user.id);
        } catch (pushErr) {
          console.warn("Erro ao registrar notificações:", pushErr);
        }
      }

      // 5. Notify Admin
      notifyAdmin("Novo Usuário V2!", `O usuário ${fullName} (${city}/${state}) criou uma conta completa.`);

      const intendedPath = sessionStorage.getItem('intended_path');
      if (intendedPath) {
        sessionStorage.setItem('intended_path_debug', intendedPath); // Debug helper
        sessionStorage.removeItem('intended_path');
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
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex justify-center">
            <img
              src="/login-logo.jpg"
              alt="Bolão App"
              className="w-24 h-24 rounded-2xl shadow-lg shadow-emerald-500/20"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">Criar Conta Premium</h1>
          <p className="text-zinc-500 mt-2">Junte-se à maior comunidade de bolões</p>
        </div>

        <div className="bg-[#141417] border border-[#27272A] p-8 rounded-3xl shadow-xl">
          <form onSubmit={handleRegister} className="space-y-4">

            {/* AVATAR UPLOAD */}
            <div className="flex justify-center mb-6">
              <div className="relative group cursor-pointer">
                <div className={`w-24 h-24 rounded-full overflow-hidden border-2 transition-colors bg-[#0A0A0B] flex items-center justify-center ${previewUrl ? 'border-[#10B981]' : 'border-red-500/50 group-hover:border-red-500'}`}>
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
              {!previewUrl && <p className="absolute mt-28 text-[10px] text-red-500 uppercase tracking-wider font-bold">Foto Obrigatória *</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                  placeholder="Seu nome real"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">E-mail</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#10B981] uppercase mb-1">WhatsApp *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                    placeholder="(00) 00000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                    placeholder="******"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[#10B981] uppercase mb-1">Cidade *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#10B981] transition-colors"
                    placeholder="Sua cidade"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#10B981] uppercase mb-1">UF *</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl py-3 px-4 text-center text-white focus:outline-none focus:border-[#10B981] transition-colors uppercase"
                  placeholder="UF"
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
                Eu aceito os <span className="text-[#10B981]">Termos</span> e a <span className="text-[#10B981]">Privacidade</span>.
              </label>
            </div>

            <div className="flex items-center gap-3 p-4 bg-[#0A0A0B] rounded-2xl border border-[#27272A] hover:border-[#10B981]/30 transition-all">
              <div className="flex-1">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell size={16} className="text-[#10B981]" />
                  Avisos de Prêmios
                </p>
                <p className="text-[10px] text-zinc-500">Receber alertas de ganhos e resultados</p>
              </div>
              <button
                type="button"
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${pushEnabled ? 'bg-[#10B981]' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
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
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'CRIAR CONTA COMPLETA'}
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
