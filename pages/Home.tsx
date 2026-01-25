import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateServiceFee } from '../src/utils/FeeCalculator';
import { Pool } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { PlusSquare, Wallet, Search, Trophy } from 'lucide-react';

const Home: React.FC = () => {
  const { user, profile, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  const handleCreatePool = () => {
    if (!isProfileComplete) {
      alert("⚠️ Complete seu cadastro (WhatsApp, Cidade e Estado) para criar bolões.");
      navigate('/profile');
      return;
    }
    navigate('/pools/new');
  };

  const [activeListTab, setActiveListTab] = useState<'open' | 'waiting'>('open');
  const [openPools, setOpenPools] = useState<Pool[]>([]);
  const [waitingPools, setWaitingPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    setLoading(true);
    // Fetch bets count to calculate prize
    const { data } = await supabase
      .from('pools')
      .select('*, bets(count), creator:profiles(full_name)')
      .order('scheduled_at', { ascending: true });

    if (data) {
      const now = new Date();

      setOpenPools(
        data.filter(p => {
          if (p.status !== 'open') return false;
          // Logic: Open only if deadline has NOT passed
          const deadline = p.bets_deadline ? new Date(p.bets_deadline) : new Date(p.scheduled_at);
          return now < deadline;
        })
      );

      setWaitingPools(
        data.filter(p => {
          if (p.status !== 'open') return false;
          // Logic: Waiting if deadline HAS passed (but not finished yet)
          const deadline = p.bets_deadline ? new Date(p.bets_deadline) : new Date(p.scheduled_at);
          return now >= deadline;
        })
      );
    }

    setLoading(false);
  };

  const balance = profile?.balance ?? 0;
  const withdrawBalance = profile?.withdrawable_balance ?? 0;

  return (
    <div className="space-y-12">
      <div className="rounded-[32px] bg-gradient-to-r from-emerald-900/40 via-zinc-900 to-zinc-900 border border-zinc-800 p-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-white">
            SEJA BEM <span className="text-emerald-400">VINDO</span>
          </h1>
          <p className="text-zinc-400 mt-2">Participe dos melhores bolões ou crie o seu!</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/wallet')}
            className="bg-[#27272A] hover:bg-zinc-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Wallet size={20} className="text-[#10B981]" />
            Adicionar Saldo
          </button>

          <button
            onClick={handleCreatePool}
            className="bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-[#10B981]/20"
          >
            <PlusSquare size={20} />
            Criar Bolão
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          onClick={() => navigate('/wallet')}
          className="cursor-pointer bg-gradient-to-br from-[#10B981]/10 to-zinc-900 border border-[#10B981]/20 rounded-2xl p-6 hover:border-[#10B981]/50 transition-all group"
        >
          <p className="text-xs text-[#10B981] uppercase font-black mb-2 flex items-center gap-2">
            <Wallet size={14} /> Saldo para Jogo
          </p>
          <p className="text-2xl font-black text-white group-hover:scale-105 transition-transform">
            R$ {balance.toFixed(2)}
          </p>
        </div>

        <div
          onClick={() => navigate('/wallet')}
          className="cursor-pointer bg-gradient-to-br from-orange-500/10 to-zinc-900 border border-orange-500/20 rounded-2xl p-6 hover:border-orange-500/50 transition-all group"
        >
          <p className="text-xs text-orange-400 uppercase font-black mb-2 flex items-center gap-2">
            <Trophy size={14} /> Saldo para Saque
          </p>
          <p className="text-2xl font-black text-white group-hover:scale-105 transition-transform">
            R$ {withdrawBalance.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-2">
            Bolões Abertos
          </p>
          <p className="text-2xl font-black text-emerald-400">
            {openPools.length}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-2">
            Aguardando Resultado
          </p>
          <p className="text-2xl font-black text-orange-400">
            {waitingPools.length}
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <h2 className="text-sm font-black text-white italic tracking-wider flex items-center gap-2">
          BOLÕES ATIVOS
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveListTab('open')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${activeListTab === 'open'
              ? 'bg-[#10B981] text-[#0A0A0B] shadow-lg shadow-[#10B981]/20'
              : 'bg-[#141417] text-zinc-500 border border-[#27272A] hover:text-white'
              }`}
          >
            Abertos
          </button>
          <button
            onClick={() => setActiveListTab('waiting')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${activeListTab === 'waiting'
              ? 'bg-orange-500 text-[#0A0A0B] shadow-lg shadow-orange-500/20'
              : 'bg-[#141417] text-zinc-500 border border-[#27272A] hover:text-white'
              }`}
          >
            Aguardando Encerramento
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome do evento, time ou modalidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#141417] border border-[#27272A] rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#10B981] transition-all"
          />
        </div>

        {(activeListTab === 'open' ? openPools : waitingPools)
          .filter(pool => {
            const term = searchTerm.toLowerCase();
            return (
              pool.title.toLowerCase().includes(term) ||
              pool.modality.toLowerCase().includes(term) ||
              (pool.options && pool.options.some(opt => opt.toLowerCase().includes(term)))
            );
          }).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeListTab === 'open' ? openPools : waitingPools)
              .filter(pool => {
                const term = searchTerm.toLowerCase();
                return (
                  pool.title.toLowerCase().includes(term) ||
                  pool.modality.toLowerCase().includes(term) ||
                  (pool.options && pool.options.some(opt => opt.toLowerCase().includes(term)))
                );
              }).map((pool: any) => {
                // Calculate Prize: Entry Fee * Bets Count
                // Note: 'bets' comes from the join query as { count: N, ... } or similar depending on query
                // Supabase select('*, bets(count)') returns bets: [{ count: 5 }] (array of one object)
                const betsCount = pool.bets?.[0]?.count || 0;
                const totalGross = pool.entry_fee * betsCount;
                const serviceFee = calculateServiceFee(totalGross);
                const currentPrize = totalGross - serviceFee;

                return (
                  <div
                    key={pool.id}
                    onClick={() => navigate(`/pools/${pool.id}`)}
                    className={`bg-[#141417] border border-[#27272A] rounded-3xl p-6 transition-all cursor-pointer group relative overflow-hidden ${activeListTab === 'open' ? 'hover:border-[#10B981]' : 'hover:border-orange-500'
                      }`}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <div className={`w-24 h-24 rounded-full blur-2xl ${activeListTab === 'open' ? 'bg-[#10B981]' : 'bg-orange-500'
                        }`}></div>
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${activeListTab === 'open' ? 'text-[#10B981] bg-[#10B981]/10' : 'text-orange-500 bg-orange-500/10'
                        }`}>
                        {pool.modality}
                      </span>
                      {activeListTab === 'open'
                        ? <span className="text-blue-500 text-[10px] font-bold uppercase bg-blue-500/10 px-2 py-1 rounded">Aberto</span>
                        : <span className="text-orange-500 text-[10px] font-bold uppercase bg-orange-500/10 px-2 py-1 rounded">Aguardando</span>
                      }
                    </div>

                    <h3 className={`text-xl font-black text-white mb-2 leading-tight transition-colors ${activeListTab === 'open' ? 'group-hover:text-[#10B981]' : 'group-hover:text-orange-500'
                      }`}>{pool.title}</h3>

                    {/* CREATOR BADGE */}
                    {pool.creator && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-[10px] text-zinc-500 font-medium">Criado por:</span>
                        <span className="text-[10px] text-zinc-300 font-bold bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                          {pool.creator.full_name}
                        </span>
                      </div>
                    )}

                    {/* TEAMS DISPLAY */}
                    {pool.options && pool.options.length >= 2 && (
                      <div className="flex items-center justify-between bg-[#0A0A0B] rounded-xl p-3 mb-4 border border-[#27272A]">
                        <span className="text-xs font-bold text-zinc-300 truncate w-[45%] text-center">{pool.options[0]}</span>
                        <span className="text-[10px] font-black text-[#10B981]">VS</span>
                        <span className="text-xs font-bold text-zinc-300 truncate w-[45%] text-center">{pool.options[1]}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="shrink-0">📅 Evento:</span>
                        <span className="text-white font-medium text-right">{new Date(pool.scheduled_at).toLocaleDateString('pt-BR')} • {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="shrink-0">⏳ Encerra Aposta:</span>
                        {pool.bets_deadline ? (
                          <span className="text-orange-400 font-bold text-right">
                            {new Date(pool.bets_deadline).toLocaleDateString('pt-BR')} • {new Date(pool.bets_deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-zinc-600">Sem prazo</span>
                        )}
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#27272A]">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Entrada</p>
                        <p className="text-lg font-black text-white">R$ {pool.entry_fee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold text-right">Prêmio Atual</p>
                        <p className="text-lg font-black text-emerald-400 text-right">R$ {currentPrize.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="w-full h-32 border border-dashed border-[#27272A] rounded-2xl flex items-center justify-center text-zinc-600 text-sm font-bold uppercase tracking-wider">
            Nenhum evento {activeListTab === 'open' ? 'ativo' : 'aguardando'} no momento
          </div>
        )
        }

      </div >
    </div >
  );
};

export default Home;
