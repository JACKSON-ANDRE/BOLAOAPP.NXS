import { createClient } from '@supabase/supabase-js';

// Vite usa import.meta.env (process.env NÃO funciona no browser)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// 🛡️ CONTROLLED STORAGE PROXY
// Decide entre localStorage (persistente) ou sessionStorage (temporário)
// com base no checkbox "Manter conectado"
const ControlledStorage = {
  getItem: (key: string) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const shouldPersist = localStorage.getItem('bt_remember') === 'true';
    if (shouldPersist) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Sempre habilitado, mas o ControlledStorage decide ONDE salvar
    storage: ControlledStorage as any,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Helper to ensure user profile exists in public.profiles table
 */
/**
 * Helper to ensure user profile exists in public.profiles table
 */
export async function syncProfile(user: any) {
  if (!user) return null;

  // 1. Tenta buscar perfil existente
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) {
    return existing;
  }

  // 2. Se não existir, cria um novo (com role user default)
  const { data, error } = await supabase
    .from('profiles')
    .insert(
      {
        id: user.id,
        full_name:
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Usuário',
        role: 'user', // Só define user na criação!
        updated_at: new Date().toISOString(),
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error syncing profile:', error);
    return null;
  }

  return data;
}
