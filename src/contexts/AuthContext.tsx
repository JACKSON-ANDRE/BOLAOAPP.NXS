import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, syncProfile } from '../../lib/supabase';
import { Profile } from '../../types';

export interface AuthContextType {
    user: any;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isProfileComplete: boolean;
    maintenanceMode: boolean;
    authError?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);



    // Check if profile has all required fields
    const isProfileComplete = React.useMemo(() => {
        if (!profile) return false;
        return !!(
            profile.whatsapp &&
            profile.whatsapp.length > 8 &&
            profile.city &&
            profile.state &&
            profile.avatar_url // OBRIGATÓRIO: Foto de perfil
        );
    }, [profile]);

    // Expose error for UI debugging
    const [authError, setAuthError] = useState<string | null>(null);

    const fetchProfile = async (u: any) => {
        if (!u) {
            setProfile(null);
            return;
        }

        // 1. TENTA VIA JS CLIENT (COM TIMEOUT DE 2s)
        // Se o Client travar (como estava acontecendo), o timeout aborta
        let clientData = null;
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 6000)
            );

            // Corrida: Quem chegar primeiro ganha. Se o Client demorar > 2s, o Timeout ganha.
            const result: any = await Promise.race([
                supabase.from('profiles').select('*').eq('id', u.id).single(),
                timeoutPromise
            ]);

            clientData = result.data;
        } catch (err) {
            // Silencioso: Se der timeout ou erro, seguimos para o Plano B (REST)
        }

        if (clientData) {
            setProfile({ ...clientData });
            setAuthError(null);
            return;
        }

        // 2. FALLBACK: REST API (Silencioso e Invisível)
        // Busca direta via HTTP para contornar problemas de WebSocket
        try {
            const url = import.meta.env.VITE_SUPABASE_URL;
            const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (url && key) {
                const response = await fetch(`${url}/rest/v1/profiles?id=eq.${u.id}&select=*`, {
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`
                    }
                });

                if (response.ok) {
                    const restData = await response.json();
                    if (restData && restData.length > 0) {
                        setProfile({ ...restData[0] });
                        setAuthError(null);
                        return;
                    }
                }
            }
        } catch (restErr) {
            // Silencioso
        }

        // 3. RECUPERAÇÃO DE CONTA (Sync)
        if (!clientData) {
            const synced = await syncProfile(u);
            if (synced) {
                setProfile({ ...synced });
                setAuthError(null);
            }
        }
    };

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('maintenance_mode')
                .single();

            if (!error && data) {
                setMaintenanceMode(!!data.maintenance_mode);
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    useEffect(() => {
        // 🔒 SAFETY BREAK: Força o fim do loading após 8 segundos caso algo trave
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 8000);

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            try {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user);
                }
                await fetchSettings().catch(console.error);
            } catch (e) {
                console.error("Auth Init Error:", e);
            } finally {
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AUTH] Event: ${event}`, session?.user?.id);

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setLoading(false);
                // localStorage.clear(); // REMOVE: Isso mata o token do Supabase se o evento disparar por engano
                return;
            }

            setUser(session?.user ?? null);

            // SEMPRE busca o perfil se tiver usuário, sem cache/ref
            if (session?.user) {
                await fetchProfile(session.user).catch(console.error);
            }

            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const signOut = async () => {
        try {
            // 🛑 TIMEOUT RACE: Tenta sair, mas se demorar mais que 500ms, força a saída local
            await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
        } catch (error) {
            console.error("Erro ao sair:", error);
        } finally {
            // 🧹 Faxina local
            setUser(null);
            setProfile(null);
            setLoading(false);
            // localStorage.clear(); // REMOVE: Deixa o Supabase limpar o dele
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user);
            await fetchSettings();
        }
    };

    /**
     * ✅ POLLING CONTROLADO DO PROFILE
     * Atualiza saldo e dados globais (ex: após aprovação de depósito)
     */
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            refreshProfile();
        }, 5000);

        return () => clearInterval(interval);
    }, [user]);

    return (
        <AuthContext.Provider
            value={{ user, profile, loading, signOut, refreshProfile, isProfileComplete, maintenanceMode, authError: (authError as any) }}
        >
            {children}
        </AuthContext.Provider>
    );
};
