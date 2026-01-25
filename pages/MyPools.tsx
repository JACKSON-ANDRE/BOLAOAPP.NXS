import React, { useEffect, useState } from 'react';
import { FolderOpen, Trophy, ListChecks, Archive, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Pool } from '../types';
import { useNavigate } from 'react-router-dom';

const MyPools: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bets' | 'created' | 'archived'>('bets');
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    let data: any[] | null = null;

    if (activeTab === 'created') {
      // Fetch pools created by me (excluding finished/canceled unless in Archive tab?)
      // User said "os arquivados vão para 'ver arquivados'". 
      // So 'Created by me' should show active/open pools? Or all non-archived?
      // Let's assume 'Created' = Open/Active pools I made.
      // And 'Archived' = Finished/Canceled pools I made OR participated in? 
      // Usually "Meus Bolões" shows everything active. 
      // Let's filter 'open' for the main tabs, and 'finished/canceled' for Archived.

      const { data: res } = await supabase
        .from('pools')
        .select('*')
        .eq('creator_id', profile?.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      data = res;

    } else if (activeTab === 'bets') {
      // Fetch pools I bet on
      // We need to join with bets.
      const { data: bets } = await supabase
        .from('bets')
        .select('pool_id, pools(*)')
        .eq('user_id', profile?.id);

      // Filter out only Open pools? Or all? 
      // "minhas apostas devem aparecer os bolões que o usuario está participando"
      // If finished, should go to archived?
      // Let's show OPEN pools here.
      if (bets) {
        data = bets
          .map((b: any) => b.pools)
          .filter((p: Pool) => p.status === 'open');
        // Deduplicate if multiple bets in same pool? 
        // (Though current logic restricts to 1 bet per pool mostly)
        // Set confirms uniqueness
        data = Array.from(new Map(data?.map(p => [p.id, p])).values());
      }

    } else if (activeTab === 'archived') {
      // Finished or Canceled pools (Created or Bet)
      // This is trickier. Let's fetch both and combine.

      // 1. Created by me (finished/canceled)
      const { data: created } = await supabase
        .from('pools')
        .select('*')
        .eq('creator_id', profile?.id)
        .in('status', ['finished', 'canceled']);

      // 2. Bet by me (finished/canceled)
      const { data: bets } = await supabase
        .from('bets')
        .select('pool_id, pools(*)')
        .eq('user_id', profile?.id);

      const participated = bets
        ? bets.map((b: any) => b.pools).filter((p: Pool) => p.status !== 'open')
        : [];

      // Combine and dedup
      const all = [...(created || []), ...participated];
      data = Array.from(new Map(all.map(p => [p.id, p])).values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setPools(data || []);
    setLoading(false);
  };

  const StatusBadge = ({ status, deadline }: { status: string, deadline?: string }) => {
    if (status === 'finished') return <span className="text-zinc-500 text-xs font-bold uppercase bg-zinc-800 px-2 py-1 rounded">Finalizado</span>;
    if (status === 'canceled') return <span className="text-red-500 text-xs font-bold uppercase bg-red-500/10 px-2 py-1 rounded">Cancelado</span>;

    const isOpen = !deadline || new Date(deadline) > new Date();
    return isOpen
      ? <span className="text-blue-500 text-xs font-bold uppercase bg-blue-500/10 px-2 py-1 rounded">Aberto</span>
      : <span className="text-orange-500 text-xs font-bold uppercase bg-orange-500/10 px-2 py-1 rounded">Aguardando Resultado</span>;
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Meus Bolões</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab('bets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'bets'
            ? 'bg-[#10B981] text-[#0A0A0B]'
            : 'bg-[#141417] text-zinc-400 hover:text-white'
            }`}
        >
          <ListChecks size={16} />
          Minhas Apostas
        </button>

        <button
          onClick={() => setActiveTab('created')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'created'
            ? 'bg-[#10B981] text-[#0A0A0B]'
            : 'bg-[#141417] text-zinc-400 hover:text-white'
            }`}
        >
          <Trophy size={16} />
          Criados por Mim
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'archived'
            ? 'bg-[#10B981] text-[#0A0A0B]'
            : 'bg-[#141417] text-zinc-400 hover:text-white'
            }`}
        >
          <Archive size={16} />
          Ver Arquivados
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#10B981]" size={32} /></div>
      ) : pools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map(pool => (
            <div
              key={pool.id}
              onClick={() => navigate(`/pools/${pool.id}`)}
              className="bg-[#141417] border border-[#27272A] p-5 rounded-2xl hover:border-zinc-500 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-full">
                  {pool.modality}
                </span>
                <StatusBadge status={pool.status} deadline={pool.bets_deadline} />
              </div>

              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#10B981] transition-colors">{pool.title}</h3>
              <p className="text-xs text-zinc-500 mb-4">
                {new Date(pool.scheduled_at).toLocaleDateString('pt-BR')} • {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Entrada</p>
                  <p className="text-sm font-bold text-white">R$ {pool.entry_fee.toFixed(2)}</p>
                </div>
                <ArrowRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center py-20 rounded-2xl bg-gradient-to-b from-[#0A0A0B] to-[#0E0E10] border border-[#1F1F24]">
          <div className="w-16 h-16 rounded-2xl bg-[#141417] flex items-center justify-center mb-6">
            <FolderOpen size={32} className="text-zinc-500" />
          </div>

          <p className="text-zinc-400 text-sm tracking-wide uppercase font-semibold">
            Nenhum bolão encontrado nesta categoria
          </p>
        </div>
      )}
    </div>
  );
};

export default MyPools;
