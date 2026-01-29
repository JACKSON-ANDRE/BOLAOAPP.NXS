import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateServiceFee } from '../src/utils/FeeCalculator';
import { Pool } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { PlusSquare, Wallet, Search, Trophy, ChevronRight, Bell, Flame, Activity, Clock, CalendarDays, DollarSign, X } from 'lucide-react';

const HomePremium: React.FC = () => {
    const { profile, isProfileComplete } = useAuth();
    const navigate = useNavigate();

    const [activeListTab, setActiveListTab] = useState<'open' | 'waiting'>('open');
    const [openPools, setOpenPools] = useState<Pool[]>([]);
    const [waitingPools, setWaitingPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPools();
    }, []);

    const fetchPools = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('pools')
            .select('*, bets(count), creator:profiles(full_name, role)')
            .order('scheduled_at', { ascending: true });

        if (data) {
            const now = new Date();
            setOpenPools(
                data.filter(p => {
                    if (p.status !== 'open') return false;
                    const deadline = p.bets_deadline ? new Date(p.bets_deadline) : new Date(p.scheduled_at);
                    return now < deadline;
                })
            );
            setWaitingPools(
                data.filter(p => {
                    if (p.status !== 'open') return false;
                    const deadline = p.bets_deadline ? new Date(p.bets_deadline) : new Date(p.scheduled_at);
                    return now >= deadline;
                })
            );
        }
        setLoading(false);
    };

    const toggleSearch = () => {
        setIsSearchVisible(!isSearchVisible);
        if (!isSearchVisible) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchTerm('');
        }
    };

    const handleCreatePool = () => {
        if (!isProfileComplete) {
            alert("⚠️ Complete seu cadastro (WhatsApp, Cidade e Estado) para criar bolões.");
            navigate('/profile');
            return;
        }
        navigate('/pools/new');
    };

    const balance = profile?.balance ?? 0;
    const withdrawBalance = profile?.withdrawable_balance ?? 0;

    return (
        <div className="space-y-6 md:space-y-12 pb-10 font-['Inter']">

            {/* PREMIUM BANNER - GLASSMORPHISM */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#141417]/40 backdrop-blur-xl border border-white/5 p-4 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#10B981]/10 rounded-full blur-[80px]" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />

                <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                    <div className="w-full md:w-auto">
                        <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-none mb-2">
                            BEM-<span className="bg-gradient-to-r from-[#10B981] to-emerald-300 bg-clip-text text-transparent">VINDO!</span>
                        </h1>
                        <p className="text-zinc-400 font-medium text-[10px] md:text-xl flex items-center justify-center md:justify-start gap-1 md:gap-2 italic uppercase tracking-wider">
                            <Flame size={16} className="text-orange-500 fill-orange-500" /> Participe ou crie seu próprio bolão
                        </p>
                    </div>

                    <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/wallet')}
                            className="flex-1 md:flex-none group relative flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl border border-white/10 transition-all active:scale-95"
                        >
                            <Wallet size={16} className="text-[#10B981] group-hover:scale-110 transition-transform md:w-5 md:h-5" />
                            <span className="text-[10px] md:text-lg font-black text-white uppercase">Carteira</span>
                        </button>

                        <button
                            onClick={handleCreatePool}
                            className="flex-1 md:flex-none group relative flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-[#10B981] hover:bg-emerald-400 rounded-xl md:rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                        >
                            <PlusSquare size={16} className="text-[#0A0A0B] group-hover:rotate-6 transition-transform md:w-5 md:h-5" />
                            <span className="text-[10px] md:text-lg font-black text-[#0A0A0B] uppercase">Novo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SEÇÃO DE SALDOS E STATUS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="grid grid-cols-2 gap-2 p-2 bg-white/5 border border-white/5 rounded-[1.5rem] md:rounded-[2rem]">
                    <div onClick={() => navigate('/wallet')} className="group relative overflow-hidden bg-[#1D1D21] border border-white/5 rounded-xl p-3 md:p-6 transition-all hover:bg-white/5 cursor-pointer">
                        <p className="text-[8px] md:text-[10px] text-[#10B981] font-black uppercase tracking-widest mb-1">Saldo de Jogo</p>
                        <p className="text-sm md:text-2xl font-black text-white tracking-tight leading-none">R$ {balance.toFixed(2)}</p>
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 text-[#10B981]/20">
                            <Wallet size={12} className="md:w-4 md:h-4" />
                        </div>
                    </div>
                    <div onClick={() => navigate('/wallet')} className="group relative overflow-hidden bg-[#1D1D21] border border-white/5 rounded-xl p-3 md:p-6 transition-all hover:bg-white/5 cursor-pointer">
                        <p className="text-[8px] md:text-[10px] text-orange-400 font-black uppercase tracking-widest mb-1">Saldo de Saque</p>
                        <p className="text-sm md:text-2xl font-black text-white tracking-tight leading-none">R$ {withdrawBalance.toFixed(2)}</p>
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 text-orange-400/20">
                            <Trophy size={12} className="md:w-4 md:h-4" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="bg-[#141417] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6 flex flex-col justify-center">
                        <p className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase mb-1">Abertos</p>
                        <div className="flex items-center gap-1.5 md:gap-2 leading-none">
                            <Activity size={14} className="text-[#10B981] md:w-[18px]" />
                            <p className="text-base md:text-2xl font-black text-white">{String(openPools.length)}</p>
                        </div>
                    </div>
                    <div className="bg-[#141417] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6 flex flex-col justify-center leading-none">
                        <p className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase mb-1">Encerrando</p>
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <Bell size={14} className="text-orange-400 md:w-[18px]" />
                            <p className="text-base md:text-2xl font-black text-white">{String(waitingPools.length)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
                    <h2 className="text-base md:text-2xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 uppercase md:normal-case">
                        <div className="w-1 h-4 md:w-1.5 md:h-6 bg-[#10B981] rounded-full" />
                        BOLÕES DISPONÍVEIS
                    </h2>

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex bg-[#141417]/50 backdrop-blur p-1 rounded-xl md:p-1.5 md:rounded-2xl border border-white/5">
                            <button onClick={() => setActiveListTab('open')} className={`px-3 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-xs font-black uppercase transition-all duration-300 ${activeListTab === 'open' ? 'bg-[#10B981] text-[#0A0A0B]' : 'text-zinc-500 hover:text-white'}`}>Ativos</button>
                            <button onClick={() => setActiveListTab('waiting')} className={`px-3 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-xs font-black uppercase transition-all duration-300 ${activeListTab === 'waiting' ? 'bg-orange-500 text-[#0A0A0B]' : 'text-zinc-500 hover:text-white'}`}>Encerrados</button>
                        </div>

                        <div className={`relative flex items-center transition-all duration-500 ${isSearchVisible ? 'w-32 md:w-64' : 'w-8 md:w-10'}`}>
                            <input ref={searchInputRef} type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full bg-[#141417] border border-white/10 rounded-lg md:rounded-xl py-1.5 md:py-2.5 px-3 md:px-4 text-[10px] md:text-xs text-white focus:outline-none focus:border-[#10B981]/50 ${isSearchVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                            <button onClick={toggleSearch} className={`absolute right-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl transition-all ${isSearchVisible ? 'text-zinc-500' : 'bg-white/5 border border-white/10 text-[#10B981]'}`}>{isSearchVisible ? <X size={14} className="md:w-[18px]" /> : <Search size={14} className="md:w-[18px]" />}</button>
                        </div>
                    </div>
                </div>

                {/* POOLS GRID - MOBILE: 3 POR LINHA */}
                {loading ? (
                    <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-40 md:h-64 bg-[#141417] rounded-xl md:rounded-[2.5rem] animate-pulse border border-white/5"></div>)}
                    </div>
                ) : (activeListTab === 'open' ? openPools : waitingPools)
                    .filter(pool => {
                        const term = searchTerm.toLowerCase();
                        return (pool.title.toLowerCase().includes(term) || pool.modality.toLowerCase().includes(term) || (pool.options && pool.options.some(opt => opt.toLowerCase().includes(term))));
                    }).length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-8">
                        {(activeListTab === 'open' ? openPools : waitingPools)
                            .filter(pool => {
                                const term = searchTerm.toLowerCase();
                                return (pool.title.toLowerCase().includes(term) || pool.modality.toLowerCase().includes(term) || (pool.options && pool.options.some(opt => opt.toLowerCase().includes(term))));
                            }).map((pool: any) => {
                                const betsCount = pool.bets?.[0]?.count || 0;
                                const currentPrize = (pool.entry_fee * betsCount) - calculateServiceFee(pool.entry_fee * betsCount);

                                return (
                                    <div key={pool.id} onClick={() => navigate(`/pools/${pool.id}`)} className="group relative overflow-hidden bg-[#141417] border border-white/5 rounded-xl md:rounded-[2.5rem] p-2 md:p-6 transition-all hover:scale-[1.02] hover:border-white/20 shadow-xl cursor-pointer flex flex-col min-h-[180px] md:min-h-auto">
                                        <div className={`absolute -top-6 -right-6 md:-top-10 md:-right-10 w-16 h-16 md:w-32 md:h-32 blur-[20px] md:blur-[50px] transition-all opacity-50 ${activeListTab === 'open' ? 'bg-[#10B981]/10' : 'bg-orange-500/10'}`} />

                                        <div className="flex justify-between items-center mb-2 md:mb-4">
                                            <span className="text-[6px] md:text-[10px] font-black uppercase px-1.5 py-0.5 md:px-4 md:py-1.5 rounded-full text-zinc-400 bg-white/5 truncate max-w-[50px] md:max-w-none">{pool.modality}</span>
                                            <div className="flex items-center gap-0.5 md:gap-1.5 px-1 py-0.5 md:px-3 md:py-1 bg-white/5 rounded-md">
                                                <div className={`w-0.5 h-0.5 md:w-1.5 md:h-1.5 rounded-full ${activeListTab === 'open' ? 'bg-[#10B981]' : 'bg-orange-400'}`} />
                                                <span className="text-[6px] md:text-[10px] font-bold text-white uppercase">{activeListTab === 'open' ? 'On' : 'Off'}</span>
                                            </div>
                                        </div>

                                        <h3 className="text-[8px] md:text-2xl font-black text-white mb-2 md:mb-4 leading-tight truncate text-left">{pool.title}</h3>

                                        {/* TIMES - REMOVIDO NO MOBILE PARA CABER 3 */}
                                        <div className="hidden md:flex items-center justify-between gap-2 p-3 bg-black/40 border border-white/5 rounded-xl mb-4 relative">
                                            <div className="flex flex-col items-center flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-black text-zinc-400 text-[10px] border border-white/5 mb-1 group-hover:border-[#10B981]/30 transition-colors">A</div>
                                                <span className="text-[10px] font-bold text-zinc-300 truncate w-full text-center uppercase">{pool.options?.[0]}</span>
                                            </div>
                                            <div className="text-[10px] font-black text-zinc-700 italic">VS</div>
                                            <div className="flex flex-col items-center flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-black text-zinc-400 text-[10px] border border-white/5 mb-1 group-hover:border-[#10B981]/30 transition-colors">B</div>
                                                <span className="text-[10px] font-bold text-zinc-300 truncate w-full text-center uppercase">{pool.options?.[1]}</span>
                                            </div>
                                        </div>

                                        {/* DETALHES DE DATAS - ULTRA COMPACTO NO MOBILE */}
                                        <div className="space-y-1 md:space-y-3 mb-2 md:mb-6 p-1 md:p-4 bg-white/5 rounded-lg md:rounded-2xl border border-white/5">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between">
                                                <span className="text-[5px] md:text-[10px] text-zinc-500 font-bold uppercase md:flex items-center gap-1.5 min-w-max"><CalendarDays size={8} className="hidden md:inline text-[#10B981]" /> Dia do evento:</span>
                                                <span className="text-[6px] md:text-[11px] font-black text-white uppercase md:tracking-tight text-right">
                                                    {new Date(pool.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-white/5 pt-1 md:pt-3">
                                                <span className="text-[5px] md:text-[10px] text-orange-400 font-black uppercase md:flex items-center gap-1.5 min-w-max"><Clock size={10} className="hidden md:inline" /> Fim das apostas:</span>
                                                <span className="text-[6px] md:text-[12px] font-black text-orange-500 uppercase leading-none text-right">
                                                    {pool.bets_deadline
                                                        ? `${new Date(pool.bets_deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(pool.bets_deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                                        : '--/--'
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-auto space-y-2 md:space-y-4">
                                            <div className="flex flex-col md:flex-row md:justify-between md:items-end bg-black/20 p-1 md:p-3 rounded-lg md:rounded-2xl border border-white/5">
                                                <div className="mb-1 md:mb-0">
                                                    <span className="text-[5px] md:text-[9px] text-zinc-500 font-black uppercase md:flex items-center gap-1">Entrada</span>
                                                    <p className="text-[8px] md:text-xl font-black text-white tracking-tight leading-none">R${pool.entry_fee.toFixed(0)}</p>
                                                </div>
                                                <div className="flex flex-col items-start md:items-end">
                                                    <span className="text-[5px] md:text-[9px] text-emerald-500 font-black uppercase">Prêmio</span>
                                                    <p className="text-[8px] md:text-2xl font-black text-[#10B981] leading-none">R${currentPrize.toFixed(0)}</p>
                                                </div>
                                            </div>

                                            <button className={`w-full py-1.5 md:py-4 rounded-lg md:rounded-2xl font-black text-[7px] md:text-[12px] uppercase tracking-wider md:tracking-[0.25em] transition-all transform active:scale-95 ${activeListTab === 'open' ? 'bg-[#10B981] text-[#0A0A0B]' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {activeListTab === 'open' ? 'JOGAR' : 'VER'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center justify-center py-16 md:py-24 bg-[#141417]/30 rounded-[2rem] md:rounded-[3rem] border border-dashed border-white/10 gap-4 md:gap-6">
                        <Trophy size={40} className="md:w-16 md:h-16 text-zinc-800 animate-bounce" />
                        <p className="text-zinc-600 font-black uppercase tracking-widest text-center px-8 text-[10px] md:text-sm">Vazio</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
            `}</style>
        </div>
    );
};

export default HomePremium;
