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

        let newData = null;

        if (clientData) {
            newData = clientData;
        } else {
            // 2. FALLBACK: REST API (Silencioso e Invisível)
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
                            newData = restData[0];
                        }
                    }
                }
            } catch (restErr) { }

            // 3. RECUPERAÇÃO DE CONTA (Sync)
            if (!newData) {
                newData = await syncProfile(u);
            }
        }

        if (newData) {
            // Só atualiza se for diferente para evitar "blink"
            const currentProfileJson = JSON.stringify(profile);
            const nextProfileJson = JSON.stringify(newData);

            if (currentProfileJson !== nextProfileJson) {
                // if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Perfil atualizado (Dados mudaram)");
                setProfile({ ...newData });
                setAuthError(null);
            } else {
                // if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Perfil checado (Sem mudanças)");
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
        // 🔒 SAFETY BREAK: Força o fim do loading após 5 segundos caso algo trave
        const safetyTimeout = setTimeout(() => {
            if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Safety Timeout disparado (5s)");
            setLoading(false);
        }, 5000);

        // Fetch maintenance settings
        fetchSettings().catch(console.error);

        // Supabase onAuthStateChange handles both INITIAL_SESSION and subsequent changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Evento=" + event + " User=" + (currentUser ? "Sim" : "Não"));

            setUser(currentUser);

            if (currentUser) {
                // Ensure profile is fetched 
                await fetchProfile(currentUser).catch(console.error);
            } else {
                setProfile(null);
            }

            // Always clear loading on major state transitions
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const signOut = async () => {
        if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Iniciando logout atômico.");
        try {
            // Tenta sair formalmente
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Erro ao sair:", error);
        } finally {
            // 🧹 FAXINA NUCLEAR: Limpa TUDO no navegador
            localStorage.clear();
            sessionStorage.clear();

            // Tenta limpar IndexedDB (Bancos locais onde o Supabase pode guardar tokens silênciosos)
            if (window.indexedDB && window.indexedDB.databases) {
                window.indexedDB.databases().then(dbs => {
                    dbs.forEach(db => window.indexedDB.deleteDatabase(db.name || ''));
                });
            }

            if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Logout concluído. Memória incinerada.");

            // 🚀 FORCE RELOAD: Mata o processo atual do React e limpa a memória global.
            window.location.href = window.location.origin + window.location.pathname;
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
            // if ((window as any).Forensic) (window as any).Forensic.save("AUTH: Polling de 5s iniciado.");
            refreshProfile();
        }, 5000);

        return () => clearInterval(interval);
    }, [user]);

    const value = React.useMemo(() => ({
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        isProfileComplete,
        maintenanceMode,
        authError: (authError as any)
    }), [user, profile, loading, maintenanceMode, authError, isProfileComplete]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
