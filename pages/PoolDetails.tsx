
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Pool, Bet } from '../types';
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Wallet,
  AlertCircle,
  RefreshCw,
  Crown,
  Gavel,
  Share2,
  Info,
  CheckCircle
} from 'lucide-react';
import { calculateServiceFee, getFeeTable } from '../src/utils/FeeCalculator';
import { triggerConfettiBurst } from '../src/utils/confetti';
import PoolChat from '../components/PoolChat';
import { notifyAdmin } from '../src/utils/adminNotification';
import { sendWebPush } from '../src/utils/sendWebPush';

const PoolDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, refreshProfile, isProfileComplete, maintenanceMode } = useAuth();

  const [pool, setPool] = useState<Pool | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [betting, setBetting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);

  // Finish Pool State
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [winningOption, setWinningOption] = useState<string>('');
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, bRes] = await Promise.all([
      supabase.from('pools').select('*').eq('id', id).single(),
      supabase.from('bets').select('*, profiles(full_name, avatar_url, role)').eq('pool_id', id)
    ]);

    if (pRes.data) setPool(pRes.data);
    if (bRes.data) setBets(bRes.data as any);
    setLoading(false);
  };

  // 🎉 Confetti for Winners
  useEffect(() => {
    if (pool?.status === 'finished' && bets.length > 0 && profile) {
      const myWinningBet = bets.find(b => b.user_id === profile.id && b.status === 'won');
      if (myWinningBet) {
        import('../src/utils/confetti').then(mod => mod.triggerCelebration());
      }
    }
  }, [pool, bets, profile]);

  const handlePlaceBetClick = () => {
    if (!profile) {
      // Save interest just in case, though App.tsx already does it on mount
      sessionStorage.setItem('intended_path', window.location.hash);
      navigate('/login');
      return;
    }

    if (!pool || !selectedOption) return;

    if (!isProfileComplete) {
      alert("⚠️ Complete seu cadastro (WhatsApp, Cidade e Estado) para apostar.");
      navigate('/profile');
      return;
    }

    if (profile.balance < pool.entry_fee) {
      alert("Saldo insuficiente! Adicione saldo na sua carteira.");
      navigate('/wallet');
      return;
    }

    setShowFeeModal(true);
  };

  const confirmPlaceBet = async () => {
    if (!profile || !pool || !selectedOption) return;

    setBetting(true);
    try {
      const { data, error } = await supabase.rpc('place_bet', {
        p_pool_id: pool.id,
        p_user_id: profile.id,
        p_selected_option: selectedOption
      });

      if (error) throw error;

      await refreshProfile();
      await fetchData();
      setShowFeeModal(false);
      triggerConfettiBurst(); // 🎉 WOW Effect
      alert("Aposta realizada com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao realizar aposta: " + (err.message || "Erro desconhecido"));
    } finally {
      setBetting(false);
    }
  };

  const handleUpdateBet = async () => {
    if (!profile || !pool || !selectedOption || !hasBet) return;

    if (hasBet.update_count >= 1) {
      alert("Você já alterou seu palpite uma vez. Não é permitido alterar novamente.");
      return;
    }

    if (selectedOption === hasBet.selected_option) {
      alert("Você escolheu a mesma opção atual.");
      return;
    }

    if (window.confirm(`Tem certeza que deseja alterar seu palpite para "${selectedOption}"? Essa ação só pode ser feita 1 vez.`)) {
      setBetting(true);

      const { error } = await supabase
        .from('bets')
        .update({
          selected_option: selectedOption,
          update_count: (hasBet.update_count || 0) + 1,
          created_at: new Date().toISOString() // Optional: track update time?
        })
        .eq('id', hasBet.id);

      if (error) {
        alert("Erro ao atualizar aposta: " + error.message);
      } else {
        await fetchData();
        alert("Palpite atualizado com sucesso!");
      }
      setBetting(false);
    }
  };

  const handleFinishPool = async () => {
    if (!profile || !pool || !winningOption) return;

    if (window.confirm(`ATENÇÃO: Isso encerrará o bolão e distribuirá os prêmios para quem apostou em "${winningOption}". Essa ação NÃO pode ser desfeita. Confirmar?`)) {
      setFinishing(true);

      const { error } = await supabase.rpc('finish_pool', {
        p_pool_id: pool.id,
        p_winning_option: winningOption,
        p_admin_id: profile.id
      });

      if (error) {
        alert('Erro ao finalizar bolão: ' + error.message);
      } else {
        alert('Bolão finalizado e prêmios distribuídos com sucesso!');
        notifyAdmin("Bolão Finalizado", `O bolão "${pool.title}" foi encerrado. Vencedor: ${winningOption}.`);

        // Notify Winners via Web Push
        const winners = bets.filter(b => b.selected_option === winningOption);
        const prizePerWinner = netPrize / (winners.length || 1);

        winners.forEach(winner => {
          sendWebPush(
            winner.user_id,
            "Você Ganhou! 🏆",
            `Parabéns! Você acertou o resultado do bolão "${pool.title}" e ganhou R$ ${prizePerWinner.toFixed(2)}!`,
            `/pools/${pool.id}`
          );
        });

        setShowFinishModal(false);
        await fetchData();
        // Refresh balances context if possible or just rely on profile refresh
        await refreshProfile();
      }
      setFinishing(false);
    }
  };

  const isOrganizer = profile?.id === pool?.creator_id;
  const isAdmin = (profile as any)?.role === 'admin';
  const canManage = isOrganizer || isAdmin;


  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-[#10B981]" size={48} /></div>;
  }

  if (!pool) return <div className="text-center p-20 text-zinc-500">Bolão não encontrado.</div>;

  const hasBet = bets.find(b => b.user_id === profile?.id);

  // Fee Calculation Logic
  const totalGross = bets.length * (pool?.entry_fee || 0);
  const serviceFee = calculateServiceFee(totalGross);
  const netPrize = Math.max(0, totalGross - serviceFee);
  const userPossiblePrize = netPrize / (bets.filter(b => b.selected_option === selectedOption).length || 1);


  const handleShare = () => {
    const text = `🏆 *${pool?.title}* no Bolão App!\n💰 Entrada: R$ ${pool?.entry_fee.toFixed(2)}\n📅 Data: ${new Date(pool?.scheduled_at || '').toLocaleDateString('pt-BR')}\n\nParticipe agora! 🚀`;

    // HashRouter Fix: link must include #
    var baseUrl = window.location.origin + window.location.pathname;
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    const url = baseUrl + '#/pools/' + pool?.id;

    if ((window as any).Forensic) (window as any).Forensic.save("SHARE: Gerando link com HASH: " + url);

    if (navigator.share) {
      navigator.share({
        title: pool?.title,
        text: text,
        url: url
      }).catch(console.error);
    } else {
      // Fallback for desktop
      navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white rounded-xl text-sm font-bold transition-all"
        >
          <Share2 size={16} />
          Compartilhar
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* SECTION 1: INFO CARD */}
        <div id="tour-pool-info" className="bg-[#141417] border border-[#27272A] rounded-2xl p-4 md:p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-[#10B981]/10 text-[#10B981] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {pool.modality}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${pool.status === 'open' && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline))
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-zinc-500/10 text-zinc-500'
              }`}>
              {pool.status === 'open' && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline))
                ? 'Aberto'
                : 'Encerrado'}
            </span>
          </div>

          <h1 className="text-xl md:text-3xl font-black text-white mb-4 leading-tight">{pool.title}</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
              <Calendar size={14} className="text-[#10B981] mb-1" />
              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">DATA</p>
              <p className="text-xs text-white font-bold">
                {new Date(pool.scheduled_at).toLocaleDateString('pt-BR')} {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {pool.bets_deadline && (
              <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                <Clock size={14} className="text-red-500 mb-1" />
                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">LIMITE</p>
                <p className="text-xs text-white font-bold">{new Date(pool.bets_deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}
            <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
              <Wallet size={14} className="text-[#10B981] mb-1" />
              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">PRÊMIO</p>
              <p className="text-xs text-[#10B981] font-black">R$ {netPrize.toFixed(2)}</p>
            </div>
            <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
              <Users size={14} className="text-[#10B981] mb-1" />
              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">APOSTAS</p>
              <p className="text-xs text-white font-bold">{bets.length}</p>
            </div>
          </div>

          {/* GESTÃO DO BOLÃO - COMPACTA */}
          {canManage && (
            <div className="mt-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2">
                <Gavel size={14} className="text-zinc-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Gestão</span>
              </div>
              <div className="flex gap-2">
                {pool?.status === 'open' && (
                  <button
                    onClick={() => navigate(`/pools/${pool.id}/edit`)}
                    className="bg-[#27272A] text-white font-bold py-1.5 px-3 rounded-lg text-[9px] uppercase whitespace-nowrap"
                  >
                    Editar
                  </button>
                )}
                {bets.length > 0 && pool?.status === 'open' && (
                  <button
                    onClick={() => setShowFinishModal(true)}
                    disabled={new Date() < new Date(pool.scheduled_at)}
                    className="bg-[#10B981] text-[#0A0A0B] font-black py-1.5 px-3 rounded-lg text-[9px] uppercase whitespace-nowrap disabled:opacity-50"
                  >
                    Finalizar
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Excluir este bolão?')) {
                        try {
                          const { error } = await supabase.rpc('delete_pool_with_refund', { p_pool_id: pool.id });
                          if (error) throw error;
                          alert('Bolão excluído!'); navigate('/');
                        } catch (error: any) { alert(error.message); }
                      }
                    }}
                    className="bg-red-500/10 text-red-500 font-bold py-1.5 px-3 rounded-lg text-[9px] uppercase whitespace-nowrap"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: BETTING CARD */}
        <div className="bg-[#141417] border border-[#27272A] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Trophy size={16} className="text-yellow-500" />
            Escolha seu Lado
          </h3>

          <div id="tour-pool-options" className="grid grid-cols-2 gap-3">
            {pool.options.map((option) => (
              <button
                key={option}
                disabled={!!hasBet || pool.status !== 'open' || (pool.bets_deadline && new Date() > new Date(pool.bets_deadline))}
                onClick={() => setSelectedOption(option)}
                className={`
                  p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[80px]
                  ${selectedOption === option
                    ? 'border-[#10B981] bg-[#10B981]/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-[#27272A] bg-[#0A0A0B] text-zinc-500 hover:border-zinc-700'}
                  ${hasBet?.selected_option === option ? 'border-[#10B981] bg-[#10B981]/20 text-[#10B981]' : ''}
                `}
              >
                <p className="font-black text-xs uppercase break-words leading-tight">{option}</p>
                <p className="text-[8px] font-bold text-zinc-600">
                  {bets.filter(b => b.selected_option === option).length} apostas
                </p>
              </button>
            ))}
          </div>

          {!hasBet && pool.status === 'open' && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline)) && (
            <div className="mt-6">
              {maintenanceMode && profile?.role !== 'admin' ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex gap-2">
                  <AlertCircle className="text-yellow-500 shrink-0" size={14} />
                  <p className="text-[10px] text-yellow-200">Em manutenção.</p>
                </div>
              ) : (
                <button
                  id="tour-pool-bet-button"
                  onClick={handlePlaceBetClick}
                  disabled={(!profile ? false : !selectedOption) || betting}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-30 uppercase text-xs"
                >
                  {betting ? <Loader2 className="animate-spin" size={18} /> : (!profile ? 'LOGAR PARA PARTICIPAR' : 'Confirmar Palpite')}
                </button>
              )}
            </div>
          )}

          {hasBet && (
            <div className="mt-4 p-4 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center text-[#0A0A0B]">
                  <CheckCircle size={18} strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-black text-[10px] text-white uppercase">Sua Aposta</h4>
                  <p className="text-xs text-[#10B981] font-black uppercase">{hasBet.selected_option}</p>
                </div>
              </div>

              {pool.status === 'open' && hasBet.update_count === 0 && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline)) && (
                <div className="flex gap-2">
                  <select
                    value={selectedOption || ''}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="bg-[#0A0A0B] border border-[#27272A] rounded-lg px-3 py-2 text-[10px] text-white flex-1 outline-none"
                  >
                    <option value="" disabled>Novo palpite...</option>
                    {pool.options.filter(o => o !== hasBet.selected_option).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateBet}
                    disabled={!selectedOption || betting || selectedOption === hasBet.selected_option}
                    className="bg-zinc-800 text-white p-2 rounded-lg disabled:opacity-30"
                  >
                    <RefreshCw size={14} className={betting ? "animate-spin" : ""} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 3: CHAT DATA */}
        <div id="tour-pool-chat" className="bg-[#141417] border border-[#27272A] rounded-2xl p-1 shadow-xl">
          <PoolChat
            poolId={pool.id}
            category={pool.modality}
            hasBet={!!hasBet}
            isAdmin={!!isAdmin}
          />
        </div>

        {/* SECTION 4: BETHORS LIST */}
        <div className="bg-[#141417] border border-[#27272A] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-[#10B981]" />
              Apostadores
            </h3>
            <span className="text-[10px] font-black text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-lg">{bets.length}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
            {bets.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center py-4 uppercase">Ninguém apostou ainda.</p>
            ) : (
              bets.map((bet) => (
                <div key={bet.id} className="flex items-center gap-3 p-2 bg-[#0A0A0B] rounded-lg border border-[#27272A]">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-400 overflow-hidden ring-1 ring-[#27272A]">
                    {(bet as any).profiles?.role === 'admin' ? (
                      <ShieldCheck size={14} className="text-[#10B981]" />
                    ) : (bet as any).profiles?.avatar_url ? (
                      <img src={`https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/avatars/${(bet as any).profiles.avatar_url}`} className="w-full h-full object-cover" />
                    ) : (bet as any).profiles?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className={`text-[10px] flex-1 truncate font-black ${(bet as any).profiles?.role === 'admin' ? 'text-[#10B981]' : 'text-zinc-300'}`}>
                    {(bet as any).profiles?.role === 'admin' ? 'BOLÃO APP' : (bet as any).profiles?.full_name}
                  </p>
                  <span className="text-[8px] font-black text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded uppercase">{bet.selected_option}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 5: RULES COMPACT */}
        <div className="bg-[#141417]/50 border border-[#27272A] rounded-2xl p-5 shadow-lg">
          <h3 className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Regras Gerais</h3>
          <ul className="space-y-2">
            {[
              'Prêmio dividido entre os que acertarem o resultado.',
              'Taxas aplicadas conforme acordado na mesa.',
              'Cancelamento somente em caso do evento não ocorrer.'
            ].map((regra, i) => (
              <li key={i} className="flex gap-2 text-[9px] text-zinc-500 font-medium">
                <span className="text-[#10B981] font-black">•</span>
                {regra}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FINISH MODAL */}
      {showFinishModal && pool && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-md p-8 relative">

            <h2 className="text-2xl font-black text-white mb-2">Quem venceu?</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Selecione o resultado oficial do evento. O prêmio líquido será distribuído automaticamente entre os acertadores.
            </p>

            <div className="space-y-3 mb-8">
              {pool.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => setWinningOption(opt)}
                  className={`w-full p-4 rounded-xl border text-left font-bold transition-all ${winningOption === opt
                    ? 'bg-[#10B981] text-black border-[#10B981]'
                    : 'bg-[#0A0A0B] text-zinc-400 border-[#27272A] hover:border-zinc-500'
                    }`}
                >
                  {opt}
                  {winningOption === opt && <span className="float-right">🏆</span>}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleFinishPool}
                disabled={!winningOption || finishing}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-xl flex items-center justify-center gap-2"
              >
                {finishing ? <Loader2 className="animate-spin" /> : 'CONFIRMAR RESULTADO'}
              </button>

              <button
                onClick={() => setShowFinishModal(false)}
                className="w-full text-zinc-500 hover:text-white font-bold py-3 text-sm"
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WINNERS LIST (Only if Finished) */}
      {pool?.status === 'finished' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-white">Resultados</h2>
                <p className="text-zinc-400 text-sm">Vencedor: <span className="text-[#10B981] font-bold uppercase">{pool.winning_option}</span></p>
              </div>
              <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white"><ArrowLeft size={24} /></button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-[#27272A] pb-2">Ganhadores</h3>
              {bets.filter(b => b.status === 'won').length > 0 ? (
                bets.filter(b => b.status === 'won').map(winner => (
                  <div key={winner.id} className="flex items-center justify-between p-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center text-black font-black overflow-hidden border-2 border-[#10B981]">
                        {(winner as any).profiles?.avatar_url ? (
                          <img
                            src={`https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/avatars/${(winner as any).profiles.avatar_url}`}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Trophy size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase">{(winner as any).profiles?.full_name || 'Usuário ' + winner.user_id.slice(0, 4)}</p>
                        <p className="text-[10px] text-[#10B981]">Vencedor</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold">Prêmio</p>
                      <p className="text-lg font-black text-white">R$ {(pool.net_prize / bets.filter(b => b.status === 'won').length).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-zinc-500 bg-[#0A0A0B] rounded-2xl border border-[#27272A]">
                  Ninguém acertou o resultado. 😢
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {
        showFeeModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-lg p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">

              <div className="text-center">
                <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="text-[#10B981]" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white">VALORES</h2>
              </div>

              <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl overflow-hidden">
                <div className="bg-[#27272A] px-4 py-3 text-xs font-bold text-zinc-300 uppercase flex justify-between">
                  <span>Faixa de Arrecadação</span>
                  <span>VALORES</span>
                </div>
                <div className="divide-y divide-[#27272A]">
                  {getFeeTable().map((row: any, i: number) => (
                    <div key={i} className="px-4 py-3 flex justify-between text-sm text-zinc-400 hover:bg-[#27272A]/50 transition">
                      <span>{row.range}</span>
                      <span className="font-bold text-white">{row.fee}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#10B981]/10 border border-[#10B981]/20 p-4 rounded-2xl flex gap-3">
                <CheckCircle className="text-[#10B981] shrink-0" size={20} />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Ao clicar em "Concordo", você declara estar ciente dos valores, e que serão descontados automaticamente do prêmio total antes do pagamento aos vencedores.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={confirmPlaceBet}
                  disabled={betting}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  {betting ? <Loader2 className="animate-spin" /> : 'CONCORDO E APOSTAR R$ ' + pool?.entry_fee.toFixed(2)}
                </button>

                <button
                  onClick={() => setShowFeeModal(false)}
                  className="w-full text-zinc-500 hover:text-white font-bold py-3 text-sm"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        )
      }
    </div >
  );
};

export default PoolDetails;
