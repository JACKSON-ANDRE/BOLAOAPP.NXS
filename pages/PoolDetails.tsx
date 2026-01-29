
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
      navigate('/');
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
    const url = window.location.href;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div id="tour-pool-info" className="bg-[#141417] border border-[#27272A] rounded-2xl md:rounded-3xl p-4 md:p-8">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <span className="bg-[#10B981]/10 text-[#10B981] px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest">
                {pool.modality}
              </span>
              <span className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase ${pool.status === 'open' && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline))
                ? 'bg-blue-500/10 text-blue-500'
                : 'bg-zinc-500/10 text-zinc-500'
                }`}>
                {pool.status === 'open' && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline))
                  ? 'Aberto'
                  : 'Encerrado'}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white mb-4 md:mb-6 leading-tight">{pool.title}</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-[#0A0A0B] p-3 md:p-4 rounded-xl md:rounded-2xl border border-[#27272A]">
                <Calendar size={16} className="text-[#10B981] mb-1 md:mb-2 md:w-[18px]" />
                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold">
                  {/ufc|mma|boxe|luta|vale\s*tudo/i.test(pool.modality) ? 'Data Luta' : pool.modality === 'Big Brother Brasil' ? 'Data do Paredão' : 'Data Jogo'}
                </p>
                <p className="text-xs md:text-sm text-white font-bold">
                  {new Date(pool.scheduled_at).toLocaleDateString('pt-BR')} {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {pool.bets_deadline && (
                <div className="bg-[#0A0A0B] p-3 md:p-4 rounded-xl md:rounded-2xl border border-[#27272A]">
                  <Clock size={16} className="text-red-500 mb-1 md:mb-2 md:w-[18px]" />
                  <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold">Fim Apostas</p>
                  <p className="text-xs md:text-sm text-white font-bold">{new Date(pool.bets_deadline).toLocaleDateString('pt-BR')} {new Date(pool.bets_deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
              <div className="bg-[#0A0A0B] p-3 md:p-4 rounded-xl md:rounded-2xl border border-[#27272A]">
                <Wallet size={16} className="text-[#10B981] mb-1 md:mb-2 md:w-[18px]" />
                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold">Prêmio Líq.</p>
                <div className="flex flex-col">
                  <p className="text-xs md:text-sm text-[#10B981] font-black">R$ {netPrize.toFixed(2)}</p>
                  {totalGross > 0 && (
                    <p className="text-[8px] md:text-[10px] text-zinc-600 line-through">R$ {totalGross.toFixed(2)}</p>
                  )}
                </div>
              </div>
              <div className="bg-[#0A0A0B] p-3 md:p-4 rounded-xl md:rounded-2xl border border-[#27272A]">
                <Users size={16} className="text-[#10B981] mb-1 md:mb-2 md:w-[18px]" />
                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold">Apostas</p>
                <p className="text-xs md:text-sm text-white font-bold">{bets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8">

            {/* MANAGER AREA */}
            {canManage && pool.status === 'open' && (
              <div className="mb-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500 text-black rounded-xl flex items-center justify-center">
                    <Gavel size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Painel do Organizador</h3>
                    <p className="text-xs text-zinc-400">Você tem permissão para encerrar este bolão.</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowFinishModal(true)}
                  disabled={new Date() < new Date(pool.scheduled_at)}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl flex items-center justify-center gap-2 mb-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  title={new Date() < new Date(pool.scheduled_at) ? "Aguarde a data do evento para finalizar" : "Finalizar Bolão"}
                >
                  <Crown size={18} />
                  {new Date() < new Date(pool.scheduled_at) ? 'AGUARDANDO DATA DO JOGO' : 'FINALIZAR BOLÃO E DECLARAR VENCEDOR'}
                </button>

                {isAdmin && (
                  <button
                    onClick={async () => {
                      if (window.confirm("ATENÇÃO: Tem certeza que deseja EXCLUIR este bolão? Todas as apostas serão devolvidas. Essa ação é irreversível.")) {
                        setLoading(true);
                        try {
                          const { error } = await supabase.rpc('delete_pool_with_refund', {
                            p_pool_id: pool.id
                          });

                          if (error) throw error;

                          alert("Bolão excluído e apostas devolvidas.");
                          navigate('/');
                        } catch (err: any) {
                          alert("Erro ao excluir: " + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={18} />
                    EXCLUIR BOLÃO (CANCELAR)
                  </button>
                )}
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" />
              Escolha seu Lado
            </h3>

            <div id="tour-pool-options" className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {pool.options.map((option) => (
                <button
                  key={option}
                  disabled={!!hasBet || pool.status !== 'open' || (pool.bets_deadline && new Date() > new Date(pool.bets_deadline))}
                  onClick={() => setSelectedOption(option)}
                  className={`
                    p-3 md:p-6 rounded-xl md:rounded-2xl border transition-all text-center flex flex-col justify-between h-full min-h-[100px]
                    ${selectedOption === option
                      ? 'border-[#10B981] bg-[#10B981]/5 text-white'
                      : 'border-[#27272A] bg-[#0A0A0B] text-zinc-400 hover:border-zinc-500'}
                    ${hasBet?.selected_option === option ? 'border-[#10B981] bg-[#10B981]/5 text-[#10B981]' : ''}
                  `}
                >
                  <p className="font-bold text-sm md:text-lg break-words leading-tight">{option}</p>
                  <p className="text-[10px] uppercase mt-2 text-zinc-500 bg-zinc-900/50 rounded-lg py-1">
                    {bets.filter(b => b.selected_option === option).length} apostas
                  </p>
                </button>
              ))}
            </div>

            {!hasBet && pool.status === 'open' && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline)) && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  <ShieldCheck size={16} />
                  Ao confirmar, R$ {pool.entry_fee.toFixed(2)} serão debitados imediatamente.
                </div>
                {maintenanceMode && profile?.role !== 'admin' ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl flex gap-3">
                    <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                    <p className="text-sm text-yellow-200 font-bold">
                      Apostas temporariamente suspensas para manutenção.
                    </p>
                  </div>
                ) : (
                  <button
                    id="tour-pool-bet-button"
                    onClick={handlePlaceBetClick}
                    disabled={!selectedOption || betting}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#10B981]/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                  >
                    {betting ? <Loader2 className="animate-spin" /> : 'Confirmar Palpite'}
                  </button>
                )}
              </div>
            )}

            {hasBet && (
              <div className="mt-8 space-y-4">
                <div className="p-6 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#10B981] rounded-xl flex items-center justify-center text-[#0A0A0B]">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Você já apostou neste bolão!</h4>
                    <p className="text-sm text-zinc-400">Seu palpite: <span className="text-[#10B981] font-bold uppercase">{hasBet.selected_option}</span></p>
                    {hasBet.update_count === 0 ? (
                      <p className="text-[10px] text-zinc-500 mt-1">Você ainda pode alterar seu palpite 1 vez.</p>
                    ) : (
                      <p className="text-[10px] text-red-500 mt-1">Limite de alterações atingido.</p>
                    )}
                  </div>
                </div>

                {/* Update Bet Section */}
                {pool.status === 'open' && hasBet.update_count === 0 && (!pool.bets_deadline || new Date() < new Date(pool.bets_deadline)) && (
                  <div className="pt-4 border-t border-[#27272A]">
                    <p className="text-sm text-zinc-400 mb-3">Deseja mudar de ideia?</p>

                    <div className="flex gap-3 items-center">
                      <select
                        value={selectedOption || ''}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="bg-[#0A0A0B] border border-[#27272A] rounded-xl px-4 py-3 text-white flex-1 focus:border-[#10B981] outline-none"
                      >
                        <option value="" disabled>Selecione novo palpite...</option>
                        {pool.options.filter(o => o !== hasBet.selected_option).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>

                      {maintenanceMode && profile?.role !== 'admin' ? (
                        <button disabled className="bg-zinc-800 text-zinc-500 font-bold p-3 rounded-xl cursor-not-allowed">
                          <AlertCircle size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={handleUpdateBet}
                          disabled={!selectedOption || betting || selectedOption === hasBet.selected_option}
                          className="bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold p-3 rounded-xl disabled:opacity-50"
                          title="Alterar Palpite"
                        >
                          {betting ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Participants Side List */}
        <div className="space-y-8">

          {/* Actions for Organizer/Admin */}
          {canManage && (
            <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Gavel className="text-zinc-500" size={18} />
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Gestão do Bolão</h3>
              </div>

              {/* EDIT BUTTON (Only if Open) */}
              {pool?.status === 'open' && (
                <button
                  onClick={() => navigate(`/pools/${pool.id}/edit`)}
                  className="w-full bg-[#27272A] hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  EDITAR BOLÃO
                </button>
              )}

              {/* DECLARE WINNER BUTTON (If bets > 0 and Open) */}
              {bets.length > 0 && pool?.status === 'open' && (
                <button
                  onClick={() => setShowFinishModal(true)}
                  disabled={new Date() < new Date(pool.scheduled_at)}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  title={new Date() < new Date(pool.scheduled_at) ? "Aguarde a data do evento" : "Declarar Vencedor"}
                >
                  <Crown size={18} />
                  DECLARAR VENCEDOR
                </button>
              )}

              {/* ADMIN DELETE BUTTON */}
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (window.confirm('ATENÇÃO: Tem certeza que deseja excluir este bolão? Isso irá REEMBOLSAR automaticamente todos os apostadores e enviará uma notificação informando o cancelamento.')) {
                      try {
                        const { error } = await supabase.rpc('delete_pool_with_refund', {
                          p_pool_id: pool.id
                        });

                        if (error) throw error;

                        alert('Bolão excluído e reembolsos processados com sucesso!');
                        navigate('/');
                      } catch (error: any) {
                        alert('Erro ao excluir e reembolsar: ' + error.message);
                      }
                    }
                  }}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors border border-red-500/20"
                >
                  EXCLUIR BOLÃO
                </button>
              )}
            </div>
          )}


          {/* POOL CHAT */}
          <div id="tour-pool-chat">
            <PoolChat
              poolId={pool.id}
              category={pool.modality}
              hasBet={!!hasBet}
              isAdmin={!!isAdmin}
            />
          </div>

          <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">Apostadores</h3>
            <div className="space-y-4">
              {bets.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">Ainda não há apostadores.</p>
              ) : (
                bets.map((bet) => (
                  <div key={bet.id} className="flex items-center gap-3 p-3 bg-[#0A0A0B] rounded-xl border border-[#27272A]">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-[#27272A] flex items-center justify-center text-xs font-bold text-zinc-400 overflow-hidden">
                      {(bet as any).profiles?.role === 'admin' ? (
                        <div className="bg-[#10B981] w-full h-full flex items-center justify-center text-black">
                          <ShieldCheck size={20} />
                        </div>
                      ) : (bet as any).profiles?.avatar_url ? (
                        <img
                          src={`https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/avatars/${(bet as any).profiles.avatar_url}`}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (bet as any).profiles?.full_name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-xs truncate font-medium ${(bet as any).profiles?.role === 'admin' ? 'text-[#10B981] font-black' : 'text-white'}`}>
                        {(bet as any).profiles?.role === 'admin' ? 'BOLÃO APP' : (bet as any).profiles?.full_name || 'Usuário Desconhecido'}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase">{bet.selected_option}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>



          <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Regras Gerais</h3>
            <ul className="space-y-3 text-xs text-zinc-400 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[#10B981] font-bold">•</span>
                O prêmio total é dividido igualmente entre todos os que acertarem o resultado.
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981] font-bold">•</span>
                Taxa conforme foi acordado por todos os participantes do bolão.
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981] font-bold">•</span>
                Cancelamento só é possível se o evento não ocorrer.
              </li>
            </ul>
          </div>
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
