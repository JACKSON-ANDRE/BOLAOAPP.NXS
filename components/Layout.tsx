import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
} from 'lucide-react';

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

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
    await supabase
      .from('user_notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      {maintenanceMode && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500/90 text-black z-[100] px-4 py-1 flex items-center justify-center gap-2 font-bold backdrop-blur">
          <ShieldAlert size={18} />
          <span>MODO MANUTENÇÃO ATIVO — Apenas administradores podem realizar ações.</span>
        </div>
      )}
      <button
        className="hidden lg:flex fixed top-4 left-4 z-50 p-2 bg-[#141417] rounded-lg border border-[#27272A]"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <button
        className="fixed top-3 right-3 md:top-4 md:right-4 z-50 p-1.5 md:p-2 bg-[#141417] rounded-lg border border-[#27272A]"
        onClick={() => setNotifOpen(!isNotifOpen)}
      >
        <Bell className="w-4 h-4 md:w-5 md:h-5 text-white" />
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
              <span>Suporte</span>
            </a>

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
