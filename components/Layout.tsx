import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { usePWAInstall } from '../src/hooks/usePWAInstall';
import {
  Home,
  Wallet,
  User,
  PlusSquare,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  TrendingUp,
  MessageCircle,
  Trophy,
  Bell,
  Trash2,
  Users,
  Download,
  HelpCircle,
} from 'lucide-react';
import { startOnboardingTour } from '../src/utils/OnboardingTour';

interface NotificationItem {
  id: string;
  message: string;
  created_at: string;
}

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut, user, maintenanceMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isInstallable, install } = usePWAInstall();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pushStatus, setPushStatus] = useState<PermissionState | 'denied'>('prompt');

  const navItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Comunidade', path: '/community', icon: Users },
    { label: 'Criar Bolão', path: '/pools/new', icon: PlusSquare },
    { label: 'Meus Bolões', path: '/my-pools', icon: Trophy },
    { label: 'Carteira', path: '/wallet', icon: Wallet },
    { label: 'Meu Perfil', path: '/profile', icon: User },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ label: 'Painel Admin', path: '/admin', icon: ShieldAlert });
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_notifications')
      .select(`
        id,
        created_at,
        message
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(
        data.map((n: any) => ({
          id: n.id,
          message: n.message || 'Nova notificação',
          created_at: n.created_at,
        }))
      );
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // 1. Update UI immediately (Optimistic Update)
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      // 2. Perform DB Update (Soft Delete)
      const { error } = await supabase
        .from('user_notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao deletar notificação:', err.message);
      // Se falhar no banco, poderíamos reverter o estado, 
      // mas para o usuário é melhor tentar recarregar no topo.
      fetchNotifications();
    }
  };

  useEffect(() => {
    if (Notification.permission === 'granted') {
      setPushStatus('granted');
    } else if (Notification.permission === 'denied') {
      setPushStatus('denied');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!user) return;
    try {
      const { subscribeToPushNotifications } = await import('../src/utils/pushNotifications');
      const success = await subscribeToPushNotifications(user.id);
      if (success) {
        setPushStatus('granted');
        alert('Notificações ativadas com sucesso!');
      } else {
        alert('Para ativar, autorize as notificações nas configurações do seu navegador.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // REALTIME SUBSCRIPTION
    const channel = supabase
      .channel('user-notifications-realtime') // Nome mais específico
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            // Se foi deletado no banco, removemos da lista local imediatamente
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          } else {
            // INSERT ou UPDATE (como o deleted_at)
            fetchNotifications();
          }
        }
      )
      .subscribe((status) => {
        // Status da conexão Realtime: status
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      {maintenanceMode && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500/90 text-black z-[100] px-4 py-1 flex items-center justify-center gap-2 font-bold backdrop-blur shadow-lg">
          <ShieldAlert size={18} />
          <span className="text-xs md:text-sm">MODO MANUTENÇÃO ATIVO — Apenas administradores podem realizar ações.</span>
        </div>
      )}

      {pushStatus !== 'granted' && (
        <div className={`fixed ${maintenanceMode ? 'top-8' : 'top-0'} left-0 right-0 bg-[#10B981] text-[#0A0A0B] z-[90] px-4 py-2 flex items-center justify-between gap-4 font-black transition-all animate-in slide-in-from-top duration-500`}>
          <div className="flex items-center gap-2">
            <Bell size={18} className="animate-bounce" />
            <span className="text-[10px] md:text-xs uppercase tracking-tight">Ative as notificações para receber avisos de prêmios e resultados!</span>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="bg-white px-3 py-1 rounded-full text-[10px] uppercase shadow-md active:scale-95 transition-transform"
          >
            Ativar Agora
          </button>
        </div>
      )}

      <button
        className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-[#141417] rounded-lg border border-[#27272A]"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {location.pathname !== '/admin' && (
        <button
          className={`fixed ${maintenanceMode || pushStatus !== 'granted' ? 'top-16 md:top-20' : 'top-3 md:top-4'} right-14 md:right-16 z-50 p-1.5 md:p-2 bg-[#141417] rounded-lg border border-[#27272A] hover:border-[#10B981] transition-all duration-300 group`}
          onClick={() => startOnboardingTour(location.pathname)}
          title="Tour Guiado"
        >
          <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 group-hover:text-[#10B981]" />
        </button>
      )}

      <button
        className={`fixed ${maintenanceMode || pushStatus !== 'granted' ? 'top-16 md:top-20' : 'top-3 md:top-4'} right-3 md:right-4 z-50 p-1.5 md:p-2 bg-[#141417] rounded-lg border border-[#27272A] transition-all duration-300 ${pushStatus !== 'granted' ? 'border-[#10B981] shadow-lg shadow-[#10B981]/20' : ''}`}
        onClick={() => setNotifOpen(!isNotifOpen)}
      >
        <Bell className={`w-4 h-4 md:w-5 md:h-5 ${pushStatus !== 'granted' ? 'text-[#10B981] animate-pulse' : 'text-white'}`} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#10B981] text-black text-[8px] md:text-xs font-bold rounded-full px-1">
            {notifications.length}
          </span>
        )}
      </button>

      {isNotifOpen && (
        <div className="fixed top-16 right-4 w-80 bg-[#141417] border border-[#27272A] rounded-2xl p-4 z-50">
          <h3 className="text-white font-bold mb-3">Notificações</h3>

          {notifications.length === 0 && (
            <p className="text-zinc-400 text-sm">
              Nenhuma notificação no momento.
            </p>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="bg-[#1C1C21] rounded-xl p-3 flex justify-between gap-2"
              >
                <p className="text-zinc-200 text-sm">{n.message}</p>

                <button
                  onClick={() => deleteNotification(n.id)}
                  className="text-red-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <aside
        className={`
          hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-[#141417] border-r border-[#27272A]
          transform transition-transform duration-300
          lg:translate-x-0 lg:static flex-shrink-0 flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#10B981] rounded-xl flex items-center justify-center text-[#0A0A0B]">
              <TrendingUp size={24} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold text-white">BOLÃO APP</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${location.pathname === item.path
                  ? 'bg-[#10B981] text-[#0A0A0B] font-semibold'
                  : 'text-zinc-400 hover:bg-[#1C1C21] hover:text-white'
                  }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-[#27272A] space-y-3">
            <a
              href="https://wa.me/5562986216877"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1C1C21] text-[#10B981] font-semibold hover:bg-[#10B981] hover:text-[#0A0A0B]"
            >
              <MessageCircle size={20} />
              <span>Atendimento</span>
            </a>

            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-400 hover:bg-[#1C1C21] hover:text-white"
              >
                <Download size={20} />
                <span>Instalar App</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#141417] border-t border-[#27272A] pb-safe z-50 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-[#10B981]' : 'text-zinc-500'
                }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-[#10B981]/10' : ''}`}>
                <item.icon size={isActive ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto pt-4 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-6xl mx-auto p-4 lg:p-10">
          {children || <Outlet />}
        </div>
      </main>

    </div>
  );
};

export default Layout;
