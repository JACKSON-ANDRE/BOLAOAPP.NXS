import React, { useEffect, useState } from 'react';
import { FolderOpen, Trophy, ListChecks, Archive, ArrowRight, Loader2, CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { calculateServiceFee } from '../src/utils/FeeCalculator';
import { Pool } from '../types';
import { useNavigate } from 'react-router-dom';

const MyPools: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bets' | 'created' | 'archived'>('bets');
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.id) fetchData();
  }, [profile?.id, activeTab]);

  const fetchData = async () => {
    if (pools.length === 0) setLoading(true);
    let data: any[] | null = null;

    if (activeTab === 'created') {
      const { data: res } = await supabase
        .from('pools')
        .select('*, bets(count)')
        .eq('creator_id', profile?.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      data = res;

    } else if (activeTab === 'bets') {
      const { data: bets } = await supabase
        .from('bets')
        .select('pool_id, pools(*, bets(count))')
        .eq('user_id', profile?.id);

      if (bets) {
        data = bets
          .map((b: any) => b.pools)
          .filter((p: Pool) => p.status === 'open');
        data = Array.from(new Map(data?.map(p => [p.id, p])).values());
      }

    } else if (activeTab === 'archived') {
      const { data: created } = await supabase
        .from('pools')
        .select('*, bets(count)')
        .eq('creator_id', profile?.id)
        .in('status', ['finished', 'canceled']);

      const { data: bets } = await supabase
        .from('bets')
        .select('pool_id, pools(*, bets(count))')
        .eq('user_id', profile?.id);

      const participated = bets
        ? bets.map((b: any) => b.pools).filter((p: Pool) => p.status !== 'open')
        : [];

      const all = [...(created || []), ...participated];
      data = Array.from(new Map(all.map(p => [p.id, p])).values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setPools(data || []);
    setLoading(false);
  };

  const StatusBadge = ({ status, deadline }: { status: string, deadline?: string }) => {
    const now = new Date();
    const dl = deadline ? new Date(deadline) : null;
    const isWaiting = dl && now >= dl && status === 'open';

    if (status === 'finished') return (
      <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-4 md:py-2 bg-white/5 rounded-lg border border-white/5">
        <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-orange-400" />
        <span className="text-[8px] md:text-[12px] font-bold text-white uppercase">Encerrado</span>
      </div>
    );
    if (status === 'canceled') return (
      <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-4 md:py-2 bg-red-500/10 rounded-lg border border-red-500/20">
        <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-red-500" />
        <span className="text-[8px] md:text-[12px] font-bold text-white uppercase">Cancelado</span>
      </div>
    );

    return (
      <div className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-4 md:py-2 bg-white/5 rounded-lg border border-white/5">
        <div className={`w-1 h-1 md:w-2 md:h-2 rounded-full ${isWaiting ? 'bg-orange-400' : 'bg-[#10B981]'}`} />
        <span className="text-[8px] md:text-[12px] font-bold text-white uppercase">{isWaiting ? 'Fin' : 'Aberto'}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20 font-['Inter']">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase italic">Meus <span className="text-[#10B981]">Bolões</span></h1>
          <p className="text-[10px] md:text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Gerencie seus palpites e criações</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 md:gap-3 p-1.5 md:p-2 bg-[#141417] border border-white/5 rounded-2xl md:rounded-[2rem] w-fit">
        <button
          onClick={() => setActiveTab('bets')}
          className={`flex items-center gap-2 px-4 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'bets'
            ? 'bg-[#10B981] text-[#0A0A0B] shadow-[0_10px_20px_rgba(16,185,129,0.2)]'
            : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
        >
          <ListChecks size={16} className={activeTab === 'bets' ? 'text-[#0A0A0B]' : 'text-[#10B981]'} />
          Minhas Apostas
        </button>

        <button
          onClick={() => setActiveTab('created')}
          className={`flex items-center gap-2 px-4 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'created'
            ? 'bg-[#10B981] text-[#0A0A0B] shadow-[0_10px_20px_rgba(16,185,129,0.2)]'
            : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
        >
          <Trophy size={16} className={activeTab === 'created' ? 'text-[#0A0A0B]' : 'text-[#10B981]'} />
          Criados por Mim
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={`flex items-center gap-2 px-4 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'archived'
            ? 'bg-orange-500 text-[#0A0A0B] shadow-[0_10px_20px_rgba(249,115,22,0.2)]'
            : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
        >
          <Archive size={16} className={activeTab === 'archived' ? 'text-[#0A0A0B]' : 'text-orange-500'} />
          Ver Arquivados
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
          {[1, 2, 4].map(i => <div key={i} className="h-64 bg-[#141417] rounded-xl md:rounded-[2.5rem] animate-pulse border border-white/5"></div>)}
        </div>
      ) : pools.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
          {pools.map((pool: any) => {
            const betsCount = pool.bets?.[0]?.count || 0;
            const currentPrize = (pool.entry_fee * betsCount) - calculateServiceFee(pool.entry_fee * betsCount);
            const isFinished = pool.status !== 'open';

            return (
              <div key={pool.id} onClick={() => navigate(`/pools/${pool.id}`)} className={`bg-[#141417] border border-[#27272A] rounded-2xl md:rounded-3xl p-3 md:p-6 transition-all cursor-pointer group relative overflow-hidden ${pool.status === 'open' ? 'hover:border-[#10B981]' : 'hover:border-orange-500'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className={`w-24 h-24 rounded-full blur-2xl ${pool.status === 'open' ? 'bg-[#10B981]' : 'bg-orange-500'}`}></div>
                </div>

                <div className="flex justify-between items-start mb-2 md:mb-4">
                  <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[#10B981] bg-[#10B981]/10`}>
                    {pool.modality.slice(0, 8)}{pool.modality.length > 8 && '.'}
                  </span>
                  <StatusBadge status={pool.status} deadline={pool.bets_deadline} />
                </div>

                <h3 className={`text-sm md:text-xl font-black text-white mb-2 leading-tight truncate transition-colors ${pool.status === 'open' ? 'group-hover:text-[#10B981]' : 'group-hover:text-orange-500'}`}>{pool.title}</h3>

                {/* CREATOR BADGE */}
                {(pool as any).creator && (
                  <div className="flex items-center gap-1 mb-2 md:mb-3">
                    <span className="text-[8px] md:text-[10px] text-zinc-500 font-medium font-black uppercase">Por:</span>
                    {(pool as any).creator.role === 'admin' ? (
                      <span className="text-[8px] md:text-[10px] text-black font-black bg-[#10B981] px-1.5 py-0.5 rounded-md border border-[#059669] flex items-center gap-1 uppercase tracking-tighter">
                        BOLÃO APP <Trophy size={8} className="fill-black md:w-[10px] md:h-[10px]" />
                      </span>
                    ) : (
                      <span className="text-[8px] md:text-[10px] text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded-md border border-zinc-700 truncate max-w-[80px] uppercase">
                        {(pool as any).creator.full_name}
                      </span>
                    )}
                  </div>
                )}

                {/* TEAMS DISPLAY */}
                {pool.options && pool.options.length >= 2 && (
                  <div className="flex items-center justify-between bg-[#0A0A0B] rounded-lg md:rounded-xl p-2 md:p-3 mb-2 md:mb-4 border border-[#27272A]">
                    <span className="text-[10px] md:text-xs font-bold text-zinc-100 truncate w-[40%] text-center font-black uppercase tracking-tight">{pool.options[0]}</span>
                    <span className="text-[8px] md:text-[10px] font-black text-[#10B981]">VS</span>
                    <span className="text-[10px] md:text-xs font-bold text-zinc-100 truncate w-[40%] text-center font-black uppercase tracking-tight">{pool.options[1]}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-4 bg-zinc-900/50 p-2 md:p-4 rounded-xl border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="shrink-0 flex items-center gap-1.5 font-black uppercase text-[8px] md:text-[10px]">
                      <img src="https://em-content.zobj.net/source/apple/354/calendar_1f4c5.png" alt="cal" className="w-3 md:w-4" />
                      {/ufc|mma|boxe|luta|vale\s*tudo/i.test(pool.modality) ? 'Luta' : 'Evento'}:
                    </span>
                    <span className="text-white font-black text-right text-[10px] md:text-sm tracking-tight leading-none uppercase">
                      {new Date(pool.scheduled_at).toLocaleDateString('pt-BR')} <br className="md:hidden" /> {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-white/5 pt-2 mt-1">
                    <span className="shrink-0 text-red-500 font-black uppercase text-[8px] md:text-[10px]">Fim das apostas:</span>
                    <span className="text-white font-black text-right text-[10px] md:text-sm tracking-tight leading-none uppercase">
                      {pool.bets_deadline
                        ? <> {new Date(pool.bets_deadline).toLocaleDateString('pt-BR')} <br className="md:hidden" /> {new Date(pool.bets_deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} </>
                        : <span className="text-zinc-600 italic">--/--</span>}
                    </span>
                  </div>
                </div>

                <div className="mt-auto space-y-3 md:space-y-6">
                  <div className="flex items-center justify-between bg-black/20 p-2 md:p-4 rounded-xl md:rounded-[2rem] border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[7px] md:text-[12px] text-zinc-500 font-black uppercase leading-none mb-1">Entrada</span>
                      <p className="text-[12px] md:text-2xl font-black text-white tracking-tight leading-none text-left">R${pool.entry_fee.toFixed(0)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] md:text-[12px] text-[#10B981] font-black uppercase leading-none mb-1 text-right">Prêmio</span>
                      <p className="text-[14px] md:text-3xl font-black text-[#10B981] leading-none text-right">R${currentPrize.toFixed(0)}</p>
                    </div>
                  </div>

                  <button className={`w-full py-2.5 md:py-6 rounded-xl md:rounded-[2rem] font-black text-[10px] md:text-[16px] uppercase tracking-[0.1em] md:tracking-[0.25em] transition-all transform active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.2)] ${pool.status === 'open' ? 'bg-[#10B981] text-[#0A0A0B]' : 'bg-zinc-800 text-zinc-500'}`}>
                    {pool.status === 'open' ? 'ACESSAR AGORA' : 'VER RESULTADO'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center py-20 bg-[#141417]/30 rounded-[2.5rem] md:rounded-[4rem] border border-dashed border-white/10 gap-4 md:gap-8">
          <FolderOpen size={64} className="text-zinc-800 animate-bounce" />
          <p className="text-zinc-600 font-black uppercase tracking-widest text-center px-8 text-sm md:text-xl">
            Nenhum bolão encontrado nesta categoria
          </p>
        </div>
      )}
    </div>
  );
};

export default MyPools;
