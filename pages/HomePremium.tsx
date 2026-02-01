import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateServiceFee } from '../src/utils/FeeCalculator';
import { Pool } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { PlusSquare, Wallet, Search, Trophy, ChevronRight, Bell, Flame, Activity, Clock, CalendarDays, DollarSign, X, LayoutGrid, List } from 'lucide-react';
import { startOnboardingTour } from '../src/utils/OnboardingTour';

const HomePremium: React.FC = () => {
    const { profile, isProfileComplete } = useAuth();
    const navigate = useNavigate();

    const [activeListTab, setActiveListTab] = useState<'open' | 'waiting'>('open');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [openPools, setOpenPools] = useState<Pool[]>([]);
    const [waitingPools, setWaitingPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPools();
    }, []);

    /*
    useEffect(() => {
        if (profile && !profile.has_completed_tour && !loading) {
            // Pequeno delay para garantir que o layout renderizou
            const timer = setTimeout(() => {
                startOnboardingTour('/', async () => {
                    // Marcar como concluído no banco
                    await supabase
                        .from('profiles')
                        .update({ has_completed_tour: true })
                        .eq('id', profile.id);
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [profile?.id, loading]);
    */

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
            <div id="tour-welcome" className="relative overflow-hidden rounded-[2.5rem] bg-[#141417] border border-white/5 p-4 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
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
                            id="tour-add-balance"
                            onClick={() => navigate('/wallet')}
                            className="flex-1 md:flex-none group relative flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-[#00A335] hover:bg-[#008F2E] rounded-xl md:rounded-2xl shadow-[0_10px_30px_rgba(0,163,53,0.3)] transition-all active:scale-95 border-none"
                        >
                            <Wallet size={16} className="text-white group-hover:scale-110 transition-transform md:w-5 md:h-5" />
                            <span className="text-[10px] md:text-lg font-black text-white uppercase">Adicionar Saldo</span>
                        </button>

                        <button
                            id="tour-new-pool"
                            onClick={handleCreatePool}
                            className="flex-1 md:flex-none group relative flex items-center justify-center gap-2 px-3 py-3 md:px-6 md:py-4 bg-[#10B981] hover:bg-emerald-400 rounded-xl md:rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                        >
                            <PlusSquare size={16} className="text-[#0A0A0B] group-hover:rotate-6 transition-transform md:w-5 md:h-5" />
                            <span className="text-[10px] md:text-lg font-black text-[#0A0A0B] uppercase">Novo Bolão</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SEÇÃO DE SALDOS E STATUS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="grid grid-cols-2 gap-2 p-2 bg-white/5 border border-white/5 rounded-[1.5rem] md:rounded-[2rem]">
                    <div id="tour-balance-game" onClick={() => navigate('/wallet')} className="group relative overflow-hidden bg-[#1D1D21] border border-white/5 rounded-xl p-3 md:p-6 transition-all hover:bg-white/5 cursor-pointer">
                        <p className="text-[8px] md:text-[10px] text-[#10B981] font-black uppercase tracking-widest mb-1">Saldo de Jogo</p>
                        <p className="text-sm md:text-2xl font-black text-white tracking-tight leading-none">R$ {balance.toFixed(2)}</p>
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 text-[#10B981]/20">
                            <Wallet size={12} className="md:w-4 md:h-4" />
                        </div>
                    </div>
                    <div id="tour-balance-withdraw" onClick={() => navigate('/wallet')} className="group relative overflow-hidden bg-[#1D1D21] border border-white/5 rounded-xl p-3 md:p-6 transition-all hover:bg-white/5 cursor-pointer">
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
                        <p className="text-[8px] md:text-[10px] text-zinc-500 font-black uppercase mb-1">Aguardando Encerramento</p>
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
                    <h2 id="tour-pools-list" className="text-base md:text-2xl font-black text-white tracking-tight flex items-center gap-2 md:gap-3 uppercase md:normal-case">
                        <div className="w-1 h-4 md:w-1.5 md:h-6 bg-[#10B981] rounded-full" />
                        BOLÕES DISPONÍVEIS
                    </h2>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* TOGGLE VIEW MODE */}
                        <div className="flex bg-[#141417] p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-[#10B981]' : 'text-zinc-600 hover:text-white'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-[#10B981]' : 'text-zinc-600 hover:text-white'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>

                        <div className="flex bg-[#141417] p-1 rounded-xl md:p-1.5 md:rounded-2xl border border-white/5">
                            <button onClick={() => setActiveListTab('open')} className={`px-3 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-xs font-black uppercase transition-all duration-300 ${activeListTab === 'open' ? 'bg-[#10B981] text-[#0A0A0B]' : 'text-zinc-500 hover:text-white'}`}>Ativos</button>
                            <button onClick={() => setActiveListTab('waiting')} className={`px-3 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[8px] md:text-xs font-black uppercase transition-all duration-300 ${activeListTab === 'waiting' ? 'bg-orange-500 text-[#0A0A0B]' : 'text-zinc-500 hover:text-white'}`}>Aguardando Encerramento</button>
                        </div>

                        <div className={`relative flex items-center transition-all duration-500 ${isSearchVisible ? 'w-32 md:w-64' : 'w-8 md:w-10'}`}>
                            <input ref={searchInputRef} type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full bg-[#141417] border border-white/10 rounded-lg md:rounded-xl py-1.5 md:py-2.5 px-3 md:px-4 text-[10px] md:text-xs text-white focus:outline-none focus:border-[#10B981]/50 ${isSearchVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                            <button onClick={toggleSearch} className={`absolute right-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl transition-all ${isSearchVisible ? 'text-zinc-500' : 'bg-white/5 border border-white/10 text-[#10B981]'}`}>{isSearchVisible ? <X size={14} className="md:w-[18px]" /> : <Search size={14} className="md:w-[18px]" />}</button>
                        </div>
                    </div>
                </div>

                {/* POOLS GRID/LIST */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                        {[1, 2, 4].map(i => <div key={i} className="h-40 md:h-64 bg-[#141417] rounded-xl md:rounded-[2.5rem] animate-pulse border border-white/5"></div>)}
                    </div>
                ) : (activeListTab === 'open' ? openPools : waitingPools)
                    .filter(pool => {
                        const term = searchTerm.toLowerCase();
                        return (pool.title.toLowerCase().includes(term) || pool.modality.toLowerCase().includes(term) || (pool.options && pool.options.some(opt => opt.toLowerCase().includes(term))));
                    }).length > 0 ? (
                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8' : 'flex flex-col gap-3 md:gap-4'}`}>
                        {(activeListTab === 'open' ? openPools : waitingPools)
                            .filter(pool => {
                                const term = searchTerm.toLowerCase();
                                return (pool.title.toLowerCase().includes(term) || pool.modality.toLowerCase().includes(term) || (pool.options && pool.options.some(opt => opt.toLowerCase().includes(term))));
                            }).map((pool: any) => {
                                const betsCount = pool.bets?.[0]?.count || 0;
                                const currentPrize = (pool.entry_fee * betsCount) - calculateServiceFee(pool.entry_fee * betsCount);

                                if (viewMode === 'list') {
                                    return (
                                        <div
                                            key={pool.id}
                                            onClick={() => navigate(`/pools/${pool.id}`)}
                                            className="group relative bg-[#0A0A0B] border border-white/5 rounded-2xl md:rounded-[2rem] p-5 md:p-8 transition-all hover:bg-white/[0.02] hover:border-[#10B981]/40 cursor-pointer flex flex-col md:flex-row md:items-center gap-6 md:gap-10 active:scale-[0.99]"
                                        >
                                            <div className="w-full flex-grow space-y-4 md:space-y-6">
                                                <div className="flex items-center justify-between md:justify-start gap-3">
                                                    <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md bg-white/5 text-zinc-500 border border-white/5">{pool.modality}</span>
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-white/5">
                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeListTab === 'open' ? 'bg-[#10B981]' : 'bg-orange-500'}`} />
                                                        <span className={`text-[8px] md:text-xs font-black uppercase tracking-wider ${activeListTab === 'open' ? 'text-[#10B981]' : 'text-orange-500'}`}>{activeListTab === 'open' ? 'Aberto' : 'Aguardando'}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 md:space-y-4">
                                                    <h3 className="text-2xl md:text-5xl font-black text-white leading-tight md:leading-none uppercase tracking-tighter group-hover:text-[#10B981] transition-colors">{pool.title}</h3>
                                                    {(() => {
                                                        const displayOptions = (pool.options || []).filter((opt: string) => {
                                                            const val = opt.toLowerCase();
                                                            return !val.includes('empate') && !val.includes('draw');
                                                        });

                                                        if (displayOptions.length < 2) return null;

                                                        return (
                                                            <div className="flex items-center gap-3 md:gap-5">
                                                                <p className="text-base md:text-3xl font-bold text-zinc-400 uppercase tracking-tight">
                                                                    {displayOptions[0]} <span className="text-[#10B981] font-black italic mx-1 md:mx-2 uppercase">VS</span> {displayOptions[1]}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-12 pt-4 border-t border-white/[0.03]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[7px] md:text-[10px] text-zinc-600 font-black uppercase tracking-widest">Data do Evento</span>
                                                        <div className="flex items-center gap-2 text-white">
                                                            <CalendarDays size={14} className="text-[#10B981]" />
                                                            <span className="text-[11px] md:text-lg font-black whitespace-nowrap">{new Date(pool.scheduled_at).toLocaleDateString('pt-BR')} {new Date(pool.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[7px] md:text-[10px] text-zinc-600 font-black uppercase tracking-widest">Fim das Apostas</span>
                                                        <div className="flex items-center gap-2 text-orange-500">
                                                            <Clock size={14} className="text-orange-500" />
                                                            <span className="text-[11px] md:text-lg font-black whitespace-nowrap">{pool.bets_deadline ? new Date(pool.bets_deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-auto flex items-end justify-between md:flex-col md:items-end gap-6 md:h-full md:py-4 pt-4 border-t md:border-t-0 border-white/[0.03]">
                                                <div className="flex flex-col md:items-end flex-grow">
                                                    <span className="text-[8px] md:text-xs text-zinc-500 font-black uppercase tracking-widest leading-none mb-2 block">Prêmio Estimado</span>
                                                    <p className="text-3xl md:text-6xl font-black text-[#10B981] leading-none drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">R$ {currentPrize.toFixed(0)}</p>
                                                </div>
                                                <div className="flex items-center gap-6 md:gap-8 text-right md:w-full md:justify-end">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[8px] md:text-[10px] text-zinc-600 font-black uppercase leading-none mb-1">Entrada</span>
                                                        <p className="text-lg md:text-3xl font-black text-white leading-none">R$ {pool.entry_fee.toFixed(0)}</p>
                                                    </div>
                                                    <div className="hidden md:flex w-12 h-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-700 group-hover:text-white group-hover:bg-[#10B981] transition-all shadow-xl">
                                                        <ChevronRight size={32} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={pool.id}
                                        onClick={() => navigate(`/pools/${pool.id}`)}
                                        className={`bg-[#141417] border border-[#27272A] rounded-2xl md:rounded-3xl p-3 md:p-6 transition-all cursor-pointer group relative overflow-hidden ${activeListTab === 'open' ? 'hover:border-[#10B981]' : 'hover:border-orange-500'}`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <div className={`w-24 h-24 rounded-full blur-2xl ${activeListTab === 'open' ? 'bg-[#10B981]' : 'bg-orange-500'}`}></div>
                                        </div>

                                        <div className="flex justify-between items-start mb-2 md:mb-4">
                                            <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 md:px-3 md:py-1 rounded-full ${activeListTab === 'open' ? 'text-[#10B981] bg-[#10B981]/10' : 'text-orange-500 bg-orange-500/10'}`}>
                                                {pool.modality.slice(0, 8)}{pool.modality.length > 8 && '.'}
                                            </span>
                                            {activeListTab === 'open'
                                                ? <span className="text-blue-500 text-[8px] md:text-[10px] font-bold uppercase bg-blue-500/10 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Aberto</span>
                                                : <span className="text-orange-500 text-[8px] md:text-[10px] font-bold uppercase bg-orange-500/10 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Aguardando</span>
                                            }
                                        </div>

                                        <h3 className={`text-sm md:text-xl font-black text-white mb-2 leading-tight truncate transition-colors ${activeListTab === 'open' ? 'group-hover:text-[#10B981]' : 'group-hover:text-orange-500'}`}>{pool.title}</h3>

                                        {/* CREATOR BADGE */}
                                        {pool.creator && (
                                            <div className="flex items-center gap-1 mb-2 md:mb-3">
                                                <span className="text-[8px] md:text-[10px] text-zinc-500 font-medium font-black uppercase">Por:</span>
                                                {(pool.creator as any).role === 'admin' ? (
                                                    <span className="text-[8px] md:text-[10px] text-black font-black bg-[#10B981] px-1.5 py-0.5 rounded-md border border-[#059669] flex items-center gap-1 uppercase tracking-tighter">
                                                        BOLÃO APP <Trophy size={8} className="fill-black md:w-[10px] md:h-[10px]" />
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] md:text-[10px] text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded-md border border-zinc-700 truncate max-w-[80px] uppercase">
                                                        {pool.creator.full_name}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* TEAMS DISPLAY */}
                                        {(() => {
                                            const displayOptions = (pool.options || []).filter((opt: string) => {
                                                const val = opt.toLowerCase();
                                                return !val.includes('empate') && !val.includes('draw');
                                            });

                                            if (displayOptions.length < 2) return null;

                                            return (
                                                <div className="flex items-center justify-between bg-[#0A0A0B] rounded-lg md:rounded-xl p-2 md:p-3 mb-2 md:mb-4 border border-[#27272A]">
                                                    <span className="text-[10px] md:text-xs font-bold text-zinc-100 truncate w-[40%] text-center font-black uppercase tracking-tight">{displayOptions[0]}</span>
                                                    <span className="text-[8px] md:text-[10px] font-black text-[#10B981]">VS</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-zinc-100 truncate w-[40%] text-center font-black uppercase tracking-tight">{displayOptions[1]}</span>
                                                </div>
                                            );
                                        })()}

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

                                        <div className="grid grid-cols-2 gap-2 pt-2 md:pt-4 border-t border-[#27272A]">
                                            <div className="flex flex-col">
                                                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Entrada</p>
                                                <p className="text-sm md:text-xl font-black text-white leading-none">R$ {pool.entry_fee.toFixed(2)}</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Prêmio</p>
                                                <p className="text-sm md:text-xl font-black text-[#10B981] leading-none text-right">R$ {currentPrize.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <button className={`w-full mt-4 py-2.5 md:py-6 rounded-xl md:rounded-[2rem] font-black text-[10px] md:text-[16px] uppercase tracking-[0.1em] md:tracking-[0.25em] transition-all transform active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.2)] ${activeListTab === 'open' ? 'bg-[#10B981] text-[#0A0A0B]' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {activeListTab === 'open' ? 'JOGAR AGORA' : 'VER RESULTADO'}
                                        </button>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center justify-center py-16 md:py-24 bg-[#141417]/30 rounded-[2.5rem] md:rounded-[4rem] border border-dashed border-white/10 gap-4 md:gap-8">
                        <Trophy size={64} className="text-zinc-800 animate-bounce" />
                        <p className="text-zinc-600 font-black uppercase tracking-widest text-center px-8 text-sm md:text-xl">Nenhum bolão encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePremium;
