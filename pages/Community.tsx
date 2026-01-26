
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Trophy, Target, TrendingUp } from 'lucide-react';
import { triggerCelebration } from '../src/utils/confetti';

const Community: React.FC = () => {
    const [userCount, setUserCount] = useState(0);
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
                <div className="w-24 h-24 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <Users className="text-[#10B981]" size={48} />
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                    {loading ? '...' : userCount}
                </h1>

                <p className="text-xl md:text-2xl text-zinc-400 font-medium">
                    Apostadores Ativos
                </p>

                <div className="pt-8 max-w-lg mx-auto">
                    <p className="text-center text-zinc-500 text-sm leading-relaxed">
                        Nossa comunidade não para de crescer! Cada novo membro torna os bolões mais disputados e os prêmios maiores.
                    </p>
                </div>
            </div>

            {/* FUTURE STATS GRID (Placeholder for ideas) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 cursor-help" title="Em breve...">
                <div className="bg-[#141417] p-6 rounded-2xl border border-[#27272A] text-center border-dashed">
                    <Target className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-zinc-500 text-xs uppercase font-bold">Bolões Realizados</p>
                    <p className="text-2xl text-zinc-700 font-black">---</p>
                </div>
                <div className="bg-[#141417] p-6 rounded-2xl border border-[#27272A] text-center border-dashed">
                    <Trophy className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-zinc-500 text-xs uppercase font-bold">Prêmios Pagos</p>
                    <p className="text-2xl text-zinc-700 font-black">---</p>
                </div>
                <div className="bg-[#141417] p-6 rounded-2xl border border-[#27272A] text-center border-dashed">
                    <TrendingUp className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-zinc-500 text-xs uppercase font-bold">Maior Prêmio</p>
                    <p className="text-2xl text-zinc-700 font-black">---</p>
                </div>
            </div>

            <p className="text-xs text-zinc-600 mt-4">
                * Estatísticas detalhadas em breve.
            </p>

        </div>
    );
};

export default Community;
