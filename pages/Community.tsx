
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Trophy, Target, TrendingUp } from 'lucide-react';
import { triggerCelebration } from '../src/utils/confetti';

interface CommunityStats {
    total_pools: number;
    total_paid: number;
}

const Community: React.FC = () => {
    const [userCount, setUserCount] = useState(0);
    const [stats, setStats] = useState<CommunityStats>({
        total_pools: 0,
        total_paid: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            // 1. Get Real Count
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            let displayCount = count || 0;

            // 2. Check for Fake Count Overlay
            const { data: settings } = await supabase
                .from('app_settings')
                .select('fake_user_count')
                .eq('id', 1)
                .single();

            if (settings?.fake_user_count && settings.fake_user_count > 0) {
                displayCount = settings.fake_user_count; // OVERRIDE
            }

            setUserCount(prev => {
                // Trigger confetti if count increased (real or fake)
                if (displayCount > prev && prev !== 0) {
                    triggerCelebration();
                }
                return displayCount;
            });

            // 3. Get Community Stats using RPC
            const { data: statsData, error: statsError } = await supabase.rpc('get_community_stats');
            if (statsError) {
                console.error('Error fetching community stats:', statsError);
            } else if (statsData) {
                setStats({
                    total_pools: statsData.total_pools || 0,
                    total_paid: statsData.total_paid || 0
                });
            }

        } catch (error) {
            console.error('Erro ao buscar stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        triggerCelebration(); // Confetti on mount!

        // Realtime polling
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 min-h-[60vh] flex flex-col items-center justify-center">

            {/* HERO SECTION */}
            <div className="text-center space-y-4">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <Users className="text-[#10B981] w-8 h-8 md:w-12 md:h-12" />
                </div>

                <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter">
                    {loading ? '...' : userCount}
                </h1>

                <p className="text-lg md:text-2xl text-zinc-400 font-medium">
                    Apostadores Ativos
                </p>

                <div className="pt-4 md:pt-8 max-w-lg mx-auto px-4">
                    <p className="text-center text-zinc-500 text-xs md:text-sm leading-relaxed">
                        Nossa comunidade não para de crescer! Cada novo membro torna os bolões mais disputados e os prêmios maiores.
                    </p>
                </div>
            </div>

            {/* REAL STATS GRID */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mt-8 md:mt-12 px-4">
                <div className="bg-[#141417] p-4 md:p-6 rounded-2xl border border-[#27272A] text-center hover:border-[#10B981]/50 transition duration-300">
                    <Target className="mx-auto text-[#10B981] mb-2 w-5 h-5 md:w-6 md:h-6" />
                    <p className="text-zinc-500 text-[10px] md:text-xs uppercase font-bold">Bolões Realizados</p>
                    <p className="text-lg md:text-2xl text-white font-black">{stats.total_pools}</p>
                </div>
                <div className="bg-[#141417] p-4 md:p-6 rounded-2xl border border-[#27272A] text-center hover:border-[#10B981]/50 transition duration-300">
                    <Trophy className="mx-auto text-yellow-500 mb-2 w-5 h-5 md:w-6 md:h-6" />
                    <p className="text-zinc-500 text-[10px] md:text-xs uppercase font-bold">Prêmios Pagos</p>
                    <p className="text-lg md:text-2xl text-white font-black">R$ {stats.total_paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <p className="text-xs text-zinc-600 mt-4">
                * Dados atualizados em tempo real.
            </p>

        </div>
    );
};

export default Community;
