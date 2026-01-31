import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  KeyRound,
  Save,
  LogOut,
  Camera,
  Bell,
  Download,
  PlayCircle
} from "lucide-react";
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { subscribeToPushNotifications } from '../src/utils/pushNotifications';
import { usePWAInstall } from '../src/hooks/usePWAInstall';
import { processImage } from '../src/utils/imageUtils';

const Profile: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { isInstallable, install } = usePWAInstall(); // Custom Hook
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setWhatsapp(current => current || profile.whatsapp || profile.pix_key || "");
      setCity(current => current || profile.city || "");
      setState(current => current || profile.state || "");
    }
  }, [profile?.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files || !e.target.files[0]) return;

    const originalFile = e.target.files[0];
    alert(`DEBUG: Arquivo: ${originalFile.name} | Tipo: ${originalFile.type} | Tamanho: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB`);

    setAvatarLoading(true);

    try {
      console.log("Processing image...");
      // Process image (HEIC/Large -> JPEG/Small)
      const processedBlob = await processImage(originalFile);
      alert("DEBUG: Imagem processada com sucesso. Iniciando Upload...");

      const fileName = `${profile.id}/profile.jpg`; // Force .jpg

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, processedBlob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error("Storage Error:", uploadError);
        throw new Error(`Erro no servidor de fotos: ${uploadError.message}`);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: fileName,
          updated_at: new Date()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error("Profile Update Error:", updateError);
        throw new Error(`Erro ao salvar no perfil: ${updateError.message}`);
      }
      window.location.reload();
    } catch (error: any) {
      console.error("Upload Process Error:", error);
      alert("Aviso: " + error.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const updates: any = {
        whatsapp,
        city,
        state,
        updated_at: new Date(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (profileError) throw profileError;

      if (password && password.length > 0) {
        const { error: pwdError } = await supabase.auth.updateUser({ password });
        if (pwdError) {
          if (pwdError.message.includes("different from the old")) {
            alert("Aviso: A nova senha deve ser diferente da antiga. Perfil salvo.");
          } else {
            alert("Erro na senha: " + pwdError.message);
          }
        } else {
          alert("Perfil e senha atualizados!");
          setPassword("");
        }
      } else {
        alert("Perfil atualizado!");
      }
      window.location.reload();
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* HEADER CARD */}
      <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-10 text-center max-w-3xl mx-auto">
        <div className="relative w-24 h-24 mx-auto group cursor-pointer">
          <div className={`w-full h-full rounded-full border-2 overflow-hidden bg-[#0A0A0B] flex items-center justify-center ${!profile?.avatar_url ? 'border-red-500 animate-pulse' : 'border-[#10B981]'}`}>
            {profile?.avatar_url ? (
              <img
                src={`https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}?t=${new Date().getTime()}`}
                alt="Avatar"
                className={`w-full h-full object-cover ${avatarLoading ? 'opacity-50' : ''}`}
              />
            ) : (
              <span className="text-zinc-500 text-3xl font-black">
                {profile?.full_name?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="text-white" size={24} />
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleAvatarChange}
            disabled={avatarLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {!profile?.avatar_url && (
          <p className="text-red-500 text-xs font-bold mt-2 uppercase animate-pulse">Foto Obrigatória</p>
        )}



        <h1 className="mt-6 text-2xl font-black text-white">
          {profile?.full_name?.toUpperCase() || "USUÁRIO"}
        </h1>

        <div className="mt-4 space-y-2 text-sm text-zinc-400">
          <div className="flex items-center justify-center gap-2">
            <Mail size={14} /> {profile?.email}
          </div>
          <div className="flex items-center justify-center gap-2 text-[#10B981]">
            <Phone size={14} /> {profile?.whatsapp || "Não informado"}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <div className="px-6 py-3 bg-[#0A0A0B] border border-[#27272A] rounded-2xl text-sm">
            <span className="text-zinc-500 block">Status</span>
            <span className="text-[#10B981] font-bold flex items-center gap-1 justify-center">
              <ShieldCheck size={14} /> {profile?.role?.toUpperCase() || "MEMBER"}
            </span>
          </div>
          <div className="px-6 py-3 bg-[#0A0A0B] border border-[#27272A] rounded-2xl text-sm">
            <span className="text-zinc-500 block">Membro desde</span>
            <span className="text-white font-bold flex items-center gap-1 justify-center">
              <Calendar size={14} /> {new Date(profile?.created_at || Date.now()).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full max-w-4xl mx-auto bg-[#1C1C21] border border-red-500/20 hover:bg-red-500/10 text-red-500 font-bold py-4 rounded-3xl flex items-center justify-center gap-2 transition md:hidden"
      >
        <LogOut size={20} />
        SAIR DA CONTA
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pb-20">
        {/* CARD 1: EDIT PROFILE */}
        <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8">
          <h2 className="text-white font-black mb-6 flex items-center gap-2">
            <KeyRound size={18} className="text-[#10B981]" />
            Completar Cadastro
          </h2>
          <div className="space-y-5">
            <div>
              <label className="text-xs text-zinc-500 uppercase">E-mail de login</label>
              <input disabled readOnly value={profile?.email || ""} className="mt-1 w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs text-[#10B981] uppercase font-bold">WhatsApp *</label>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" className="mt-1 w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white focus:border-[#10B981] outline-none transition" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-[#10B981] uppercase font-bold">Cidade *</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: São Paulo" className="mt-1 w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white focus:border-[#10B981] outline-none transition" />
              </div>
              <div>
                <label className="text-xs text-[#10B981] uppercase font-bold">UF *</label>
                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="SP" maxLength={2} className="mt-1 w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white focus:border-[#10B981] outline-none transition uppercase" />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-6 bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition disabled:opacity-50"
            >
              <Save size={18} /> {loading ? 'SALVANDO...' : 'SALVAR E DESBLOQUEAR'}
            </button>
          </div>
        </div>

        {/* CARD 2: SUPPORT */}
        <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8 h-fit">
          <h3 className="text-[#10B981] font-bold mb-3 uppercase">Por que preencher?</h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">Validamos sua identidade para segurança total nos pagamentos PIX.</p>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#10B981]" /> WhatsApp para suporte</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="text-[#10B981]" /> Cidade/UF para estatísticas</li>
            <li className="flex gap-2 text-red-400 font-bold"><Camera size={16} /> Foto de Perfil Obrigatória</li>
          </ul>
        </div>

        {/* CARD 3: NOTIFICATIONS */}
        <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8 h-fit">
          <h3 className="text-white font-black mb-3 flex items-center gap-2">
            <Bell size={18} className="text-[#10B981]" /> Notificações
          </h3>
          <button
            onClick={async () => {
              if (profile) {
                const result = await subscribeToPushNotifications(profile.id);
                if (result === 'EXISTING') alert('Já ativado!');
                else if (result === true) alert('Ativado!');
                else alert('Erro ou negado.');
              }
            }}
            className="w-full bg-[#1C1C21] hover:bg-[#27272A] border border-[#27272A] text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Bell size={16} /> ATIVAR AGORA
          </button>
          {isInstallable && (
            <div className="mt-4 pt-4 border-t border-[#27272A]">
              <button onClick={install} className="w-full bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/50 text-[#10B981] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
                <Download size={16} /> INSTALAR APP
              </button>
            </div>
          )}
        </div>

        {/* CARD 4: TOUR RESTART */}
        <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8 h-fit">
          <h3 className="text-white font-black mb-3 flex items-center gap-2">
            <PlayCircle size={18} className="text-[#10B981]" /> Guia do Usuário
          </h3>
          <p className="text-sm text-zinc-400 mb-6">Reinicie as instruções de uso do App.</p>
          <button
            onClick={async () => {
              if (profile) {
                await supabase.from('profiles').update({ has_completed_tour: false }).eq('id', profile.id);
                navigate('/');
                window.location.reload();
              }
            }}
            className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-xl flex items-center justify-center gap-2 transition hover:scale-105"
          >
            <PlayCircle size={18} /> REINICIAR TOUR
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
