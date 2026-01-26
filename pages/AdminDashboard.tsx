import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Pool, Bet } from '../types';
import {
  Users,
  LayoutDashboard,
  AlertCircle,
  TrendingUp,
  FileText,
  X,
  Download,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowDownCircle,
  Search,
  Eye,
  QrCode,
  Save,
  Upload,
  Activity,
  Copy,
  CheckCircle2,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

import { SystemHealthService, HealthReport } from '../utils/SystemHealthService';

type AdminTab =
  | 'deposits'
  | 'withdraws'
  | 'users'
  | 'history'
  | 'pix'
  | 'messages'
  | 'fake_users';

type DepositFilter = 'pending' | 'archived' | 'all';
type WithdrawFilter = 'pending' | 'archived' | 'all';

interface AdminMessage {
  id: string;
  message: string;
  created_at: string;
  target_user_id?: string;
  profiles?: { full_name: string };
}

interface DepositRequest {
  id: string;
  amount: number;
  status: string;
  receipt_path: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface WithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    withdrawable_balance: number;
  };
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  balance: number;
  withdrawable_balance: number;
  avatar_url?: string;
  created_at: string;
}

interface UserDetails {
  profile: AdminUser & { pix_key?: string };
  stats: {
    total_deposited: number;
    deposit_count: number;
    total_withdrawn: number;
    withdraw_count: number;
    total_won: number;
    win_count: number;
  };
  history: any[];
}

type ConfirmAction = {
  id: string;
  action: 'approve' | 'reject';
  type: 'deposit' | 'withdraw';
} | null;

import {
  generateAdminPoolsReport,
  generateFinancialListReport
} from '../utils/ReportGenerator';
import { triggerCelebration } from '../src/utils/confetti';
import { notifyAllUsers } from '../src/utils/broadcastNotification';

const AdminDashboard: React.FC = () => {
  const { maintenanceMode, refreshProfile } = useAuth();
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('deposits');
  const [pools, setPools] = useState<Pool[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [depositFilter, setDepositFilter] = useState<DepositFilter>('pending');

  // Report State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Withdrawal state
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>([]);
  const [withdrawFilter, setWithdrawFilter] = useState<WithdrawFilter>('pending');

  // Financial Filters (Global for Deposits/Withdraws)
  const [financialMonth, setFinancialMonth] = useState(new Date().getMonth());
  const [financialYear, setFinancialYear] = useState(new Date().getFullYear());
  const [financialDay, setFinancialDay] = useState<string>(''); // Day as string "1" to "31", empty if all days

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cityStats, setCityStats] = useState<{ name: string; value: number }[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Message Targeting State
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [messageSearch, setMessageSearch] = useState('');

  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFilename, setReceiptFilename] = useState('comprovante');

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(null);

  // Pix Config State
  const [pixKey, setPixKey] = useState('');
  const [pixQrUrl, setPixQrUrl] = useState('');
  const [newQrFile, setNewQrFile] = useState<File | null>(null);
  const [savingPix, setSavingPix] = useState(false);
  const [fakeUserCount, setFakeUserCount] = useState<number>(0);

  // History State
  const [selectedPoolHistory, setSelectedPoolHistory] = useState<{
    pool: Pool & { profiles?: { full_name: string } };
    bets: (Bet & { profiles: { full_name: string } })[];
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchBaseData();
    fetchMessages();
    fetchDeposits();
    fetchWithdraws();
    fetchUsers();
    fetchPixSettings();
    fetchCityStats();
  }, []);

  const handleToggleMaintenance = async () => {
    try {
      setTogglingMaintenance(true);
      const newStatus = !maintenanceMode;

      const { error } = await supabase
        .from('app_settings')
        .update({ maintenance_mode: newStatus })
        .eq('id', 1); // Assuming single row singleton

      if (error) throw error;

      await refreshProfile();
      alert(`Modo manutenção ${newStatus ? 'ATIVADO' : 'DESATIVADO'} com sucesso.`);
    } catch (error) {
      console.error('Error toggling maintenance:', error);
      alert('Erro ao alterar modo manutenção.');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  // --- REPORT LOGIC ---
  // --- REPORT LOGIC ---
  const filteredPools = pools.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
  });

  const poolStats = {
    count: filteredPools.length,
    totalVolume: filteredPools.reduce((acc, p) => acc + ((p.entry_fee || 0) * (p.current_participants || 0)), 0),
    houseFee: filteredPools.reduce((acc, p) => acc + ((p.entry_fee || 0) * (p.current_participants || 0) * 0.10), 0),
    totalPayouts: filteredPools.reduce((acc, p) => acc + ((p.entry_fee || 0) * (p.current_participants || 0) * 0.90), 0) // Net prize basically
  };

  const handleDownloadAdminReport = () => {
    const reportItems = filteredPools.map(p => ({
      name: p.name || 'Bolão sem Nome',
      created_at: p.created_at,
      status: p.status,
      entry_fee: p.entry_fee || 0,
      participants_count: p.current_participants || 0,
      total_amount: (p.entry_fee || 0) * (p.current_participants || 0),
      house_fee: (p.entry_fee || 0) * (p.current_participants || 0) * 0.10,
      net_prize: (p.entry_fee || 0) * (p.current_participants || 0) * 0.90
    }));

    generateAdminPoolsReport(
      reportMonth,
      reportYear,
      reportItems,
      {
        totalPools: poolStats.count,
        totalVolume: poolStats.totalVolume,
        totalHouseEarnings: poolStats.houseFee,
        totalPayouts: poolStats.totalPayouts
      }
    );
  };


  const fetchCityStats = async () => {
    const { data } = await supabase.from('profiles').select('city');
    if (data) {
      const stats: Record<string, number> = {};
      data.forEach((p: any) => {
        const city = p.city ? p.city.trim().toUpperCase() : 'NÃO INFORMADO';
        stats[city] = (stats[city] || 0) + 1;
      });

      const chartData = Object.entries(stats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort by count desc

      setCityStats(chartData);
    }
  };

  const fetchPixSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setPixKey(data.pix_key || '');
      setPixQrUrl(data.pix_qrcode_url || '');
      setFakeUserCount(data.fake_user_count || 0);
    }
  };

  const fetchBaseData = async () => {
    // Fetch pools with creator info and bets count
    const { data } = await supabase
      .from('pools')
      .select('*, profiles!pools_creator_id_fkey(full_name), bets(id)')
      .order('created_at', { ascending: false });

    if (data) {
      // Map data 'title' to 'name' and calculate participants from bets array
      const processedPools = data.map((pool: any) => ({
        ...pool,
        name: pool.title || pool.name || 'Bolão sem Nome',
        current_participants: pool.bets?.length || 0
      }));
      setPools(processedPools);
    }
  };

  const handleViewPoolHistory = async (pool: any) => {
    setLoadingHistory(true);
    const { data: bets } = await supabase
      .from('bets')
      .select('*, profiles!bets_user_id_fkey(full_name)')
      .eq('pool_id', pool.id);

    if (bets) {
      setSelectedPoolHistory({
        pool,
        bets: bets as any
      });
    }
    setLoadingHistory(false);
  };

  const fetchDeposits = async () => {
    const { data, error } = await supabase
      .from('deposit_requests')
      // Ambiguous: could be user_id or admin_id. We want the USER who requested.
      // Hint from error message: deposit_requests_user_id_fkey
      .select('*, profiles!deposit_requests_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching deposits:', error);
    if (data) setDeposits(data as any);
  };

  const fetchWithdraws = async () => {
    const { data } = await supabase
      .from('withdraw_requests')
      // Ambiguous: withdraw_requests_user_id_fkey
      .select('*, profiles!withdraw_requests_user_id_fkey(full_name, withdrawable_balance)')
      .order('created_at', { ascending: false });

    if (data) setWithdraws(data as any);
  };

  // Balance Adjustment State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editType, setEditType] = useState<'balance' | 'withdrawable'>('balance');
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const fetchUsers = async () => {
    const { data, error } = await supabase.rpc('get_admin_users_list');
    if (error) console.error('Error fetching users:', error);
    if (data) setUsers(data as any);
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingUser(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase.rpc('get_user_details_full', {
      p_user_id: userId,
      p_admin_id: user.id
    });

    if (error) {
      alert('Erro ao buscar detalhes: ' + error.message);
    } else {
      setSelectedUser(data as UserDetails);
    }
    setLoadingUser(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('admin_messages')
      .select('*, profiles!admin_messages_target_user_id_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (data) setMessages(data as any);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('admin_messages').insert({
      message: newMessage.trim(),
      target_user_id: targetUser?.id || null
    });

    if (!error) {
      // Broadcast Push Notification if it's a Universal Message
      if (!targetUser) {
        notifyAllUsers("Mensagem do Admin 📢", newMessage.trim());
      }

      setNewMessage('');
      setTargetUser(null); // Reset target
      fetchMessages();
      alert('Mensagem enviada com sucesso!');
    } else {
      alert('Erro ao enviar mensagem: ' + error.message);
    }
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('admin_messages').delete().eq('id', id);
    fetchMessages();
  };

  const handleOpenReceipt = async (path: string) => {
    // Remove bucket name if present in the path to avoid duplication (deposit_receipts/deposit_receipts/...)
    const cleanPath = path.replace(/^deposit_receipts\//, '');
    const filename = cleanPath.split('/').pop() || 'comprovante';
    setReceiptFilename(filename);

    const { data, error } = await supabase.storage
      .from('deposit_receipts')
      .createSignedUrl(cleanPath, 600);

    if (error) {
      alert('Erro ao gerar link do comprovante: ' + error.message);
      console.error(error);
      return;
    }

    if (data?.signedUrl) {
      setReceiptUrl(data.signedUrl);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptUrl) return;

    const response = await fetch(receiptUrl);
    const blob = await response.blob();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = receiptFilename;
    link.click();

    URL.revokeObjectURL(link.href);
  };

  const exportUserHistory = () => {
    if (!selectedUser) return;

    const history = selectedUser.history || [];
    if (history.length === 0) {
      alert('Sem histórico para exportar.');
      return;
    }

    const headers = ['Data', 'Tipo', 'Valor', 'Status', 'Saldo Afetado', 'ID'];
    const csvContent = [
      headers.join(','),
      ...history.map(row => [
        new Date(row.created_at).toLocaleString().replace(',', ''),
        row.type,
        row.amount,
        row.status,
        row.balance_type || '-',
        row.id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `historico_${selectedUser.profile.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFinancialReport = (type: 'deposits' | 'withdraws') => {
    const isDeposits = type === 'deposits';
    const data = isDeposits ? filteredDeposits : filteredWithdraws;

    if (data.length === 0) {
      alert('Não há dados para exportar com os filtros atuais.');
      return;
    }

    const headers = isDeposits
      ? ['ID', 'Data', 'Usuário', 'Email', 'Valor', 'Status', 'Comprovante']
      : ['ID', 'Data', 'Usuário', 'Chave PIX', 'Valor', 'Status'];

    const csvContent = [
      headers.join(','),
      ...data.map((item: any) => {
        const date = new Date(item.created_at).toLocaleString().replace(',', '');
        const user = item.profiles?.full_name || 'Desconhecido';

        if (isDeposits) {
          return [
            item.id,
            date,
            user,
            item.profiles?.email || '',
            item.amount,
            item.status,
            item.receipt_path ? 'Sim' : 'Não'
          ].join(',');
        } else {
          return [
            item.id,
            date,
            user,
            item.pix_key,
            item.amount,
            item.status
          ].join(',');
        }
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateStr = financialDay
      ? `${financialDay}_${financialMonth + 1}_${financialYear}`
      : `${financialMonth + 1}_${financialYear}`;

    link.href = url;
    link.download = `relatorio_${type}_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const executeDepositAction = async () => {
    if (!confirmAction || confirmAction.type !== 'deposit') return;

    const { id, action } = confirmAction;
    setProcessingDepositId(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProcessingDepositId(null);
      setConfirmAction(null);
      return;
    }

    const { error } = await supabase.rpc('process_deposit_request', {
      p_deposit_request_id: id,
      p_admin_id: user.id,
      p_action: action,
      p_reason: action === 'reject' ? 'Rejeitado pelo administrador' : null,
    });

    if (error) {
      alert('Erro ao processar: ' + error.message);
      console.error(error);
    } else {
      setProcessingDepositId(null);
      setConfirmAction(null);
      fetchDeposits();
      if (action === 'approve') triggerCelebration(); // 🎉 WOW Effect
    }
  };

  const executeWithdrawAction = async () => {
    if (!confirmAction || confirmAction.type !== 'withdraw') return;

    const { id, action } = confirmAction;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setConfirmAction(null);
      return;
    }

    const { error } = await supabase.rpc('process_withdraw_request', {
      p_withdraw_id: id,
      p_admin_id: user.id,
      p_action: action,
      p_reason: action === 'reject' ? 'Rejeitado pelo administrador' : null,
    });

    if (error) {
      alert('Erro ao processar saque: ' + error.message);
      console.error(error);
    } else {
      setConfirmAction(null);
      fetchWithdraws();
      if (action === 'approve') triggerCelebration(); // 🎉 WOW Effect
    }
  };

  const handleOpenAdjustment = (user: AdminUser, type: 'balance' | 'withdrawable') => {
    setEditingUser(user);
    setEditType(type);
    setEditAmount(type === 'balance' ? user.balance.toString() : user.withdrawable_balance.toString());
    setEditReason('');
  };

  const handleSaveAdjustment = async () => {
    if (!editingUser || !editAmount || !editReason) return;
    setSavingAdjustment(true);

    try {
      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        p_user_id: editingUser.id,
        p_new_amount: parseFloat(editAmount),
        p_balance_type: editType,
        p_reason: editReason,
        p_admin_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      alert(`Saldo ajustado com sucesso! Diferença: R$ ${data.delta}`);
      setEditingUser(null);
      fetchUsers(); // Refresh
      triggerCelebration();

    } catch (err: any) {
      alert('Erro ao ajustar: ' + err.message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleSavePixSettings = async () => {
    setSavingPix(true);
    try {
      let finalQrUrl = pixQrUrl;

      // 1. Upload Image if Selected
      if (newQrFile) {
        const fileExt = newQrFile.name.split('.').pop();
        const fileName = `qrcode_${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from('app_assets')
          .upload(fileName, newQrFile);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('app_assets')
          .getPublicUrl(fileName);

        finalQrUrl = publicUrl;
      }

      // 2. Update Database
      const { error: dbError } = await supabase
        .from('app_settings')
        .upsert({
          id: 1,
          pix_key: pixKey,
          pix_qrcode_url: finalQrUrl,
          fake_user_count: fakeUserCount,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      setPixQrUrl(finalQrUrl);
      setNewQrFile(null);
      alert('Configurações PIX salvas com sucesso!');

    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar configurações: ' + (err.message || err));
    } finally {
      setSavingPix(false);
    }
  };

  const executeAction = () => {
    if (confirmAction?.type === 'deposit') {
      executeDepositAction();
    } else if (confirmAction?.type === 'withdraw') {
      executeWithdrawAction();
    }
  };

  // Calculate Financials for History Display
  const calculatePoolStats = (pool: Pool, bets: Bet[]) => {
    const totalGross = bets.reduce((acc, b) => acc + b.amount, 0);
    const serviceFee = totalGross * 0.10; // 10% Fee
    const netPrize = totalGross - serviceFee;
    const winners = bets.filter(b => b.status === 'won');
    const losers = bets.filter(b => b.status === 'lost');

    const prizePerWinner = winners.length > 0 ? netPrize / winners.length : 0;

    return { totalGross, serviceFee, netPrize, winners, losers, prizePerWinner };
  };

  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdraws = withdraws.filter(w => w.status === 'pending').length;

  const filteredDeposits = deposits.filter(d => {
    let matchesStatus = true;
    if (depositFilter === 'pending') matchesStatus = d.status === 'pending';
    if (depositFilter === 'archived') matchesStatus = d.status !== 'pending';

    const date = new Date(d.created_at);
    const matchesDate =
      date.getMonth() === financialMonth &&
      date.getFullYear() === financialYear &&
      (financialDay === '' || date.getDate() === Number(financialDay));

    return matchesStatus && matchesDate;
  });

  const filteredWithdraws = withdraws.filter(w => {
    let matchesStatus = true;
    if (withdrawFilter === 'pending') matchesStatus = w.status === 'pending';
    if (withdrawFilter === 'archived') matchesStatus = w.status !== 'pending';

    const date = new Date(w.created_at);
    const matchesDate =
      date.getMonth() === financialMonth &&
      date.getFullYear() === financialYear &&
      (financialDay === '' || date.getDate() === Number(financialDay));

    return matchesStatus && matchesDate;
  });

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Health Check State
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const runHealthCheck = async () => {
    setCheckingHealth(true);

    try {
      // Call Backend RPC for deep analysis
      const { data, error } = await supabase.rpc('check_system_integrity');

      if (error) {
        throw error;
      }

      // Map RPC result to HealthReport interface
      // RPC returns: { status: 'healthy'|'critical', issues: string[], fix_prompt: string, total_loss: number }

      const report: HealthReport = {
        status: data.status === 'critical' ? 'critical' : 'healthy', // Map 'critical' to 'critical'
        issues: data.issues && data.issues.length > 0 ? data.issues : ['Todos os sistemas operacionais e íntegros.'],
        fixPrompt: data.fix_prompt,
        totalLoss: data.total_loss || 0,
        checkedAt: new Date(data.checked_at)
      };

      setHealthReport(report);

    } catch (err: any) {
      console.error(err);
      alert("Erro ao realizar diagnóstico: " + (err.message || "Erro desconhecido"));
    } finally {
      setCheckingHealth(false);
    }
  };

  const copyFixPrompt = () => {
    if (!healthReport) return;
    navigator.clipboard.writeText(healthReport.fixPrompt || '');
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">
            Administração Master
          </h1>
          <p className="text-zinc-500">
            Controle total da plataforma Bolão App
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
          <button
            onClick={handleToggleMaintenance}
            disabled={togglingMaintenance}
            className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition text-xs ${maintenanceMode
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
          >
            {togglingMaintenance ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" />
            ) : (
              <ShieldAlert size={14} />
            )}
            {maintenanceMode ? 'MANUTENÇÃO ON' : 'MANUTENÇÃO'}
          </button>

          <button
            onClick={runHealthCheck}
            disabled={checkingHealth}
            className="bg-[#27272A] hover:bg-[#3F3F46] text-white border border-[#27272A] px-3 py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors text-xs"
          >
            {checkingHealth ? <Activity className="animate-spin text-[#10B981]" size={14} /> : <Activity className="text-[#10B981]" size={14} />}
            {checkingHealth ? 'VERIFICANDO...' : 'INTEGRIDADE'}
          </button>
        </div>
      </header>

      {/* HEALTH DIAGNOSIS SECTION (Shows only if report exists) */}
      {healthReport && (
        <section className={`rounded-2xl border p-6 animate-in fade-in slide-in-from-top-4 ${healthReport.status === 'healthy' ? 'bg-[#10B981]/5 border-[#10B981]/20' :
          healthReport.status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
            'bg-red-500/5 border-red-500/20'
          }`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${healthReport.status === 'healthy' ? 'bg-[#10B981]/10 text-[#10B981]' :
                healthReport.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                {healthReport.status === 'healthy' && <CheckCircle2 size={24} />}
                {healthReport.status === 'warning' && <AlertCircle size={24} />}
                {healthReport.status === 'critical' && <XCircle size={24} />}
              </div>
              <div>
                <h3 className={`font-black uppercase tracking-wide ${healthReport.status === 'healthy' ? 'text-[#10B981]' :
                  healthReport.status === 'warning' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                  {healthReport.status === 'healthy' ? 'Sistema Íntegro' :
                    healthReport.status === 'warning' ? 'Atenção Necessária' :
                      'Erros Críticos Detectados'}
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Diagnóstico realizado em {healthReport.checkedAt.toLocaleTimeString()} e processado pela IA.
                </p>
              </div>
            </div>

            {/* Total Loss Display */}
            {healthReport.totalLoss > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-red-400 font-bold uppercase">Prejuízo Calculado</p>
                <p className="text-xl font-black text-red-500">R$ {healthReport.totalLoss.toFixed(2)}</p>
              </div>
            )}

          </div>
          {healthReport.issues.length > 0 && healthReport.issues[0] !== 'Todos os sistemas operacionais e íntegros.' && (
            <button
              onClick={copyFixPrompt}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-white font-bold hover:bg-[#27272A] transition"
            >
              {copyFeedback ? <CheckCircle2 className="text-[#10B981]" size={18} /> : <Copy size={18} />}
              {copyFeedback ? 'Prompt Copiado!' : 'Copiar Solução (IA)'}
            </button>
          )}


          <div className="space-y-4">
            {healthReport.issues.length === 0 || (healthReport.issues.length === 1 && healthReport.issues[0] === 'Todos os sistemas operacionais e íntegros.') ? (
              <div className="flex items-center gap-2 text-[#10B981]">
                <CheckCircle2 size={18} />
                <span className="font-bold">Nenhuma inconsistência encontrada. O banco de dados está íntegro.</span>
              </div>
            ) : (
              <div className="grid gap-2">
                <p className="text-zinc-300 font-medium">Inconsistências encontradas:</p>
                {healthReport.issues.map((issue, idx) => (
                  <div key={idx} className="bg-[#0A0A0B]/50 p-3 rounded-lg border border-white/5 flex gap-3 items-start">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-white text-sm">{issue}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section >
      )
      }

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-[#141417] border border-[#27272A] rounded-xl p-3 md:p-6">
          <Users className="text-[#10B981] mb-2 md:mb-4 w-5 h-5 md:w-6 md:h-6" />
          <p className="text-zinc-400 text-[10px] md:text-sm uppercase font-bold">Usuários</p>
          <p className="text-xl md:text-2xl font-black text-white">{users.length}</p>
        </div>

        <div className="bg-[#141417] border border-[#27272A] rounded-xl p-3 md:p-6">
          <LayoutDashboard className="text-[#10B981] mb-2 md:mb-4 w-5 h-5 md:w-6 md:h-6" />
          <p className="text-zinc-400 text-[10px] md:text-sm uppercase font-bold">Ativos</p>
          <p className="text-xl md:text-2xl font-black text-white">{pools.filter(p => p.status === 'open').length}</p>
        </div>

        <div className="bg-[#141417] border border-[#27272A] rounded-xl p-3 md:p-6">
          <TrendingUp className="text-[#10B981] mb-2 md:mb-4 w-5 h-5 md:w-6 md:h-6" />
          <p className="text-zinc-400 text-[10px] md:text-sm uppercase font-bold">Depósitos</p>
          <p className="text-xl md:text-2xl font-black text-white">{pendingDeposits}</p>
        </div>

        <div className="bg-[#141417] border border-[#27272A] rounded-xl p-3 md:p-6">
          <ArrowDownCircle className="text-yellow-500 mb-2 md:mb-4 w-5 h-5 md:w-6 md:h-6" />
          <p className="text-zinc-400 text-[10px] md:text-sm uppercase font-bold">Saques</p>
          <p className="text-xl md:text-2xl font-black text-white">{pendingWithdraws}</p>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {[
          ['deposits', 'Depósitos'],
          ['withdraws', 'Saques'],
          ['users', 'Usuários'],
          ['history', 'Histórico de Bolões'],
          ['pwa', 'Ícone do App'],
          ['pix', 'Config. PIX'],
          ['fake_users', 'USU/FAKE'],
          ['messages', 'Mensagens'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as AdminTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${activeTab === id
              ? 'bg-[#10B981] text-[#0A0A0B]'
              : 'bg-[#141417] text-zinc-400 border border-[#27272A]'
              }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="bg-[#141417] border border-[#27272A] rounded-3xl min-h-[400px] p-6">
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-6">

            {/* CITY CHART SECTION */}
            <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="text-[#10B981]" />
                Distribuição de Usuários por Cidade
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityStats}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="value" name="Usuários" radius={[4, 4, 0, 0]}>
                      {cityStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10B981' : '#34D399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 items-center gap-3">
              <Search className="text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-transparent text-white w-full focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase border-b border-[#27272A]">
                    <th className="pb-3 pl-4">Nome</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Saldo Jogo</th>
                    <th className="pb-3">Saldo Saque</th>
                    <th className="pb-3">Cargo</th>
                    <th className="pb-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs md:text-sm text-white divide-y divide-[#27272A]">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-[#0A0A0B] transition">
                      <td className="py-3 pl-4 font-bold max-w-[150px] truncate flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 flex-shrink-0">
                          {u.avatar_url ? (
                            <img
                              src={`https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/avatars/${u.avatar_url}`}
                              alt={u.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-zinc-500 text-xs font-bold">{u.full_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="truncate">{u.full_name}</span>
                      </td>
                      <td className="py-3 text-zinc-400 max-w-[120px] truncate">{u.email}</td>
                      <td className="py-4 text-emerald-400 flex items-center gap-2 group/bal">
                        R$ {u.balance.toFixed(2)}
                        <button
                          onClick={() => handleOpenAdjustment(u, 'balance')}
                          className="opacity-0 group-hover/bal:opacity-100 hover:bg-[#27272A] p-1.5 rounded text-zinc-400 hover:text-white transition"
                          title="Ajustar Saldo de Jogo"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                      <td className="py-4 text-white">
                        <div className="flex items-center gap- group/with">
                          R$ {u.withdrawable_balance.toFixed(2)}
                          <button
                            onClick={() => handleOpenAdjustment(u, 'withdrawable')}
                            className="opacity-0 group-hover/with:opacity-100 hover:bg-[#27272A] p-1.5 rounded text-zinc-400 hover:text-white transition ml-2"
                            title="Ajustar Saldo de Saque"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        <select
                          value={u.role || 'user'}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            if (!window.confirm(`Tem certeza que deseja mudar o cargo de ${u.full_name} para ${newRole.toUpperCase()}?`)) return;

                            try {
                              const { data: { user: currentUser } } = await supabase.auth.getUser();
                              if (!currentUser) return;

                              const { error } = await supabase.rpc('update_user_role', {
                                p_target_user_id: u.id,
                                p_new_role: newRole,
                                p_admin_id: currentUser.id
                              });

                              if (error) throw error;

                              alert('Cargo atualizado com sucesso!');
                              fetchUsers(); // Refresh list
                            } catch (err: any) {
                              alert('Erro ao atualizar cargo: ' + err.message);
                            }
                          }}
                          className={`px-2 py-1 rounded text-xs font-bold uppercase border cursor-pointer outline-none ${u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                        >
                          <option value="user">Usuário</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => fetchUserDetails(u.id)}
                          className="bg-[#27272A] hover:bg-[#3F3F46] text-white p-2 rounded-lg"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p className="text-zinc-500 text-center py-8">Nenhum usuário encontrado.</p>
              )}
            </div>
          </div>
        )}

        {/* DEPOSITS TAB */}


        {activeTab === 'deposits' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-end">
              <div className="flex gap-3">
                {[
                  ['pending', 'Pendentes'],
                  ['archived', 'Arquivadas'],
                  ['all', 'Todas'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setDepositFilter(id as DepositFilter)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${depositFilter === id
                      ? 'bg-[#10B981] text-black'
                      : 'bg-[#0A0A0B] text-zinc-400 border border-[#27272A]'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* DATE FILTERS */}
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <input
                  type="number"
                  placeholder="Dia"
                  min={1}
                  max={31}
                  value={financialDay}
                  onChange={(e) => setFinancialDay(e.target.value)}
                  className="w-14 bg-[#0A0A0B] text-white text-xs font-bold px-2 py-2 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none text-center appearance-none"
                />
                <select
                  value={financialMonth}
                  onChange={(e) => setFinancialMonth(Number(e.target.value))}
                  className="bg-[#0A0A0B] text-white text-xs font-bold px-3 py-2 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none appearance-none"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>
                  ))}
                </select>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(Number(e.target.value))}
                  className="bg-[#0A0A0B] text-white text-xs font-bold px-3 py-2 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none appearance-none"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleDownloadFinancialReport('deposits')}
                  className="bg-[#10B981] hover:bg-[#059669] text-black font-black px-3 py-2 rounded-xl flex items-center gap-2 transition"
                  title="Baixar CSV"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* ... keeping deposits list ... */}
            <div className="space-y-4">
              {filteredDeposits.map(d => (
                <div
                  key={d.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 gap-4"
                >
                  <div className="w-full md:w-auto">
                    <div className="flex justify-between md:block mb-2 md:mb-0">
                      <p className="text-white font-bold text-lg md:text-base">
                        R$ {d.amount.toFixed(2)}
                      </p>
                      <p className={`text-xs font-bold md:mt-1 ${d.status === 'pending' ? 'text-yellow-500' : d.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>
                        {d.status.toUpperCase()}
                      </p>
                    </div>

                    <div className="text-xs text-zinc-400 mt-1">
                      <p className="font-bold text-white">{d.profiles?.full_name || 'Usuário Desconhecido'}</p>
                      <p className="truncate max-w-[200px]">{d.profiles?.email || 'Sem email'}</p>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-3 items-center w-full md:w-auto justify-end border-t border-zinc-800 pt-3 md:border-0 md:pt-0">
                    {d.receipt_path && (
                      <button
                        onClick={() => handleOpenReceipt(d.receipt_path)}
                        className="flex items-center gap-2 text-[#10B981] font-bold text-xs bg-[#10B981]/10 px-3 py-2 rounded-lg"
                      >
                        <FileText size={16} />
                        Ver Comprovante
                      </button>
                    )}

                    {d.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setConfirmAction({ id: d.id, action: 'approve', type: 'deposit' })
                          }
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-500 p-2 rounded-lg transition"
                        >
                          <CheckCircle size={20} />
                        </button>

                        <button
                          onClick={() =>
                            setConfirmAction({ id: d.id, action: 'reject', type: 'deposit' })
                          }
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* WITHDRAWS TAB */}
        {activeTab === 'withdraws' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-end">
              <div className="flex gap-3">
                {[
                  ['pending', 'Pendentes'],
                  ['archived', 'Arquivadas'],
                  ['all', 'Todas'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setWithdrawFilter(id as WithdrawFilter)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${withdrawFilter === id
                      ? 'bg-[#10B981] text-black'
                      : 'bg-[#0A0A0B] text-zinc-400 border border-[#27272A]'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* DATE FILTERS */}
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Dia"
                  min={1}
                  max={31}
                  value={financialDay}
                  onChange={(e) => setFinancialDay(e.target.value)}
                  className="w-16 bg-[#0A0A0B] text-white font-bold px-3 py-2 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none text-center appearance-none"
                />
                <select
                  value={financialMonth}
                  onChange={(e) => setFinancialMonth(Number(e.target.value))}
                  className="bg-[#0A0A0B] text-white font-bold px-4 py-2 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none appearance-none"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                  ))}
                </select>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(Number(e.target.value))}
                  className="bg-[#0A0A0B] text-white font-bold px-4 py-2 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none appearance-none"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleDownloadFinancialReport('withdraws')}
                  className="bg-[#10B981] hover:bg-[#059669] text-black font-black px-3 py-2 rounded-xl flex items-center gap-2 transition"
                  title="Baixar Relatório CSV"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredWithdraws.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">
                  Nenhuma solicitação de saque encontrada
                </p>
              ) : (
                filteredWithdraws.map(w => (
                  <div
                    key={w.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 gap-4"
                  >
                    <div className="w-full md:w-auto">
                      <div className="flex justify-between md:block mb-2 md:mb-0">
                        <p className="text-white font-bold text-lg md:text-base">
                          R$ {w.amount.toFixed(2)}
                        </p>
                        <p className={`text-xs font-bold md:mt-1 ${w.status === 'pending' ? 'text-yellow-500' :
                          w.status === 'approved' ? 'text-green-500' :
                            'text-red-500'
                          }`}>
                          {w.status.toUpperCase()}
                        </p>
                      </div>

                      <p className="text-xs text-zinc-400 mb-1">
                        <span className="text-white font-bold">{w.profiles?.full_name || 'Desconhecido'}</span>
                      </p>
                      <div className="bg-zinc-900 p-2 rounded border border-zinc-800 mb-2">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Chave PIX</p>
                        <p className="text-xs text-white font-mono break-all">{w.pix_key}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(w.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center w-full md:w-auto justify-end border-t border-zinc-800 pt-3 md:border-0 md:pt-0">
                      {w.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              setConfirmAction({ id: w.id, action: 'approve', type: 'withdraw' })
                            }
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-500 p-2 rounded-lg transition"
                            title="Aprovar saque"
                          >
                            <CheckCircle size={20} />
                          </button>

                          <button
                            onClick={() =>
                              setConfirmAction({ id: w.id, action: 'reject', type: 'withdraw' })
                            }
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition"
                            title="Rejeitar saque"
                          >
                            <XCircle size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* PIX TAB */}
        {activeTab === 'pix' && (
          <div className="space-y-8 max-w-2xl">
            <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <QrCode className="text-[#10B981]" />
                Configurar Depósito PIX
              </h3>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-zinc-400 text-sm mb-1 block">Chave PIX (Para Depósitos)</label>
                    <input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Ex: CPF, Email ou Chave Aleatória"
                      className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl px-4 py-3 text-white focus:border-[#10B981] outline-none"
                    />
                  </div>

                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2 font-bold">
                  QR Code (Imagem)
                </label>

                <div className="flex items-start gap-6">
                  <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden border-2 border-dashed border-zinc-600">
                    {newQrFile ? (
                      <img
                        src={URL.createObjectURL(newQrFile)}
                        className="w-full h-full object-contain"
                        alt="Novo QR"
                      />
                    ) : pixQrUrl ? (
                      <img
                        src={pixQrUrl}
                        className="w-full h-full object-contain"
                        alt="QR Atual"
                      />
                    ) : (
                      <span className="text-black text-xs text-center font-bold">Sem QR Code</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="cursor-pointer bg-[#27272A] hover:bg-[#3F3F46] text-white px-4 py-3 rounded-xl flex items-center gap-2 w-fit mb-3 transition">
                      <Upload size={18} />
                      <span className="font-bold text-sm">Selecionar Nova Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setNewQrFile(e.target.files[0]);
                        }}
                      />
                    </label>
                    <p className="text-xs text-zinc-500">
                      Selecione uma imagem quadrada (JPG ou PNG) do QR Code gerado pelo seu banco.
                      Essa imagem aparecerá para os usuários na hora do depósito.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#27272A]">
                <button
                  onClick={handleSavePixSettings}
                  disabled={savingPix}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {savingPix ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save size={20} />
                      SALVAR ALTERAÇÕES
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* PWA ICON TAB */}
        {
          activeTab === 'pwa' && (
            <div className="space-y-8 max-w-2xl">
              <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <LayoutDashboard className="text-[#10B981]" />
                  Personalizar Ícone do App (PWA)
                </h3>

                <div className="space-y-6">
                  <div className="bg-[#141417] p-4 rounded-xl border border-blue-500/20 text-blue-300 text-sm">
                    <p className="flex items-center gap-2 font-bold mb-1">
                      <AlertCircle size={16} />
                      Como funciona
                    </p>
                    Esta imagem será usada como ícone quando os usuários instalarem o app no celular.
                    A atualização pode levar alguns minutos (ou horas) para aparecer para todos devido ao cache dos navegadores.
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 block mb-2 font-bold">
                      Ícone Atual
                    </label>
                    <div className="flex items-start gap-6">
                      <div className="w-32 h-32 bg-black rounded-2xl flex items-center justify-center p-2 overflow-hidden border border-[#27272A] shadow-lg">
                        <img
                          src="/pwa-icon-192.png" // Points to local/public for preview
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/192x192/0A0A0B/FFF?text=Icon')}
                          className="w-full h-full object-contain rounded-xl"
                          alt="Current PWA Icon"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="cursor-pointer bg-[#27272A] hover:bg-[#3F3F46] text-white px-4 py-3 rounded-xl flex items-center gap-2 w-fit mb-3 transition">
                          <Upload size={18} />
                          <span className="font-bold text-sm">Upload Novo Ícone</span>
                          <input
                            type="file"
                            accept="image/png"
                            className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files?.[0]) return;
                              const file = e.target.files[0];
                              if (file.type !== 'image/png') { alert('Por favor, use apenas imagens PNG.'); return; }

                              const confirmUpload = window.confirm("Isso irá substituir o ícone atual. Confirmar?");
                              if (!confirmUpload) return;

                              try {
                                // Upload to Supabase Storage (Public assets bucket)
                                // We use a fixed name 'pwa-icon.png' to keep URL stable for manifest
                                // In a real prod PWA, we'd need to invalidate cache.
                                // Here we upload to 'app_assets' bucket.
                                setSavingPix(true); // Reusing loading state for simplicity or create new one

                                // 1. Upload Original
                                const { error: uploadError } = await supabase.storage
                                  .from('app_assets')
                                  .upload('pwa-icon.png', file, { upsert: true, cacheControl: '0' });

                                if (uploadError) throw uploadError;

                                // 2. Update Settings (Optional, primarily to trigger re-renders if we used state)
                                await supabase.from('app_settings').upsert({ id: 1, pwa_icon_updated_at: new Date().toISOString() });

                                alert('Ícone enviado com sucesso! A atualização pode demorar um pouco para propagar.');
                                // Force reload to try and fetch new icon
                                window.location.reload();

                              } catch (err: any) {
                                alert('Erro ao enviar ícone: ' + (err.message || err.error_description));
                              } finally {
                                setSavingPix(false);
                              }
                            }}
                          />
                        </label>
                        <p className="text-xs text-zinc-500">
                          Recomendado: <strong>PNG Quadrado (512x512)</strong>.<br />
                          O sistema irá redimensionar se necessário (automático para maioria dos dispositivos).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* FAKE USERS TAB */}
        {activeTab === 'fake_users' && (
          <div className="space-y-8 max-w-2xl">
            <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-[#10B981]" />
                Usuário/Fake - Controle de Público
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Contador de Usuários (Fake / Comunidade)</label>
                  <div className="flex gap-2 items-center">
                    <Users size={20} className="text-[#10B981]" />
                    <input
                      type="number"
                      value={fakeUserCount}
                      onChange={(e) => setFakeUserCount(parseInt(e.target.value) || 0)}
                      placeholder="Ex: 50"
                      className="flex-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl px-4 py-3 text-white focus:border-[#10B981] outline-none"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Defina 0 para usar o contador real. Valores acima de 0 substituem o contador da página Comunidade.</p>
                </div>

                <div className="pt-4 border-t border-[#27272A]">
                  <button
                    onClick={handleSavePixSettings}
                    disabled={savingPix}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    {savingPix ? 'Salvando...' : 'SALVAR CONTADOR'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {
          activeTab === 'messages' && (
            <div className="space-y-6">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Mensagem para todos os usuários..."
                className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl px-4 py-4 text-white min-h-[120px]"
              />

              {/* TARGET USER SELECTOR */}
              <div className="relative">
                <label className="text-xs font-bold text-zinc-500 mb-2 block uppercase">Destinatário (Opcional - Vazio = Todos)</label>

                {targetUser ? (
                  <div className="flex items-center gap-3 bg-[#10B981]/10 text-[#10B981] px-4 py-3 rounded-xl border border-[#10B981]/20 animate-in fade-in zoom-in duration-200">
                    <div className="p-2 bg-[#10B981]/20 rounded-lg">
                      <Users size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{targetUser.full_name}</p>
                      <p className="text-xs opacity-70">{targetUser.email}</p>
                    </div>
                    <button
                      onClick={() => setTargetUser(null)}
                      className="p-2 hover:bg-[#10B981]/20 rounded-lg transition"
                      title="Remover destinatário"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#10B981] transition" size={18} />
                    <input
                      type="text"
                      value={messageSearch}
                      onChange={e => setMessageSearch(e.target.value)}
                      placeholder="Buscar usuário para envio direto (Nome ou Email)..."
                      className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl pl-12 pr-4 py-3 text-white focus:border-[#10B981] outline-none transition font-medium"
                    />

                    {/* DROPDOWN RESULTS */}
                    {messageSearch.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#141417] border border-[#27272A] rounded-xl shadow-2xl z-50 max-h-[240px] overflow-y-auto custom-scrollbar">
                        {users.filter(u =>
                          (u.full_name?.toLowerCase() || '').includes(messageSearch.toLowerCase()) ||
                          (u.email?.toLowerCase() || '').includes(messageSearch.toLowerCase())
                        ).length === 0 ? (
                          <div className="px-4 py-3 text-zinc-500 text-sm text-center">Nenhum usuário encontrado</div>
                        ) : (
                          users.filter(u =>
                            (u.full_name?.toLowerCase() || '').includes(messageSearch.toLowerCase()) ||
                            (u.email?.toLowerCase() || '').includes(messageSearch.toLowerCase())
                          ).slice(0, 10).map(u => ( // Limit to 10 results for performance
                            <button
                              key={u.id}
                              onClick={() => { setTargetUser(u); setMessageSearch(''); }}
                              className="w-full text-left px-4 py-3 hover:bg-[#27272A] flex items-center gap-3 border-b border-[#27272A]/50 last:border-0 transition group/item"
                            >
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover/item:bg-[#10B981]/20 group-hover/item:text-[#10B981] transition">
                                {u.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-white font-bold text-sm block">{u.full_name}</span>
                                <span className="text-zinc-500 text-xs block">{u.email}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={sendMessage}
                className="bg-[#10B981] text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <Send size={18} />
                ENVIAR MENSAGEM
              </button>

              <h3 className="text-sm font-bold text-zinc-400 mt-6">
                HISTÓRICO DE MENSAGENS
              </h3>

              <div className="space-y-3">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className="flex justify-between items-start bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-emerald-400 text-xs">
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                        {m.profiles?.full_name ? (
                          <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-blue-500/30">
                            PARA: {m.profiles.full_name}
                          </span>
                        ) : (
                          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-zinc-700">
                            GLOBAL (TODOS)
                          </span>
                        )}
                      </div>
                      <p className="text-white">{m.message}</p>
                    </div>

                    <button
                      onClick={() => deleteMessage(m.id)}
                      className="text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* HISTORY TAB */}
        {/* HISTORY TAB */}
        {
          activeTab === 'history' && (
            <div className="space-y-6">
              <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#27272A] pb-6">
                  <div>
                    <h3 className="text-white font-bold text-xl flex items-center gap-2">
                      <FileText className="text-[#10B981]" />
                      Relatório Mensal de Bolões
                    </h3>
                    <p className="text-zinc-500 text-sm">Selecione o período para gerar os indicadores.</p>
                  </div>

                  <div className="flex gap-3">
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="bg-[#0A0A0B] text-white font-bold px-4 py-3 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none appearance-none"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                      ))}
                    </select>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="bg-[#0A0A0B] text-white font-bold px-4 py-3 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none appearance-none"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <button
                      onClick={handleDownloadAdminReport}
                      className="bg-[#10B981] hover:bg-[#059669] text-black font-black px-4 py-3 rounded-xl flex items-center gap-2 transition"
                    >
                      <Download size={20} />
                      BAIXAR PDF
                    </button>
                  </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A]">
                    <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Bolões Realizados</p>
                    <p className="text-2xl font-black text-white">{poolStats.count}</p>
                  </div>
                  <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A]">
                    <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Volume Total (Entradas)</p>
                    <p className="text-2xl font-black text-blue-400">R$ {poolStats.totalVolume.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A]">
                    <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Lucro da Casa (10%)</p>
                    <p className="text-2xl font-black text-[#10B981]">R$ {poolStats.houseFee.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A]">
                    <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Prêmios Pagos</p>
                    <p className="text-2xl font-black text-purple-400">R$ {poolStats.totalPayouts.toFixed(2)}</p>
                  </div>
                </div>

                {/* TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-zinc-500 text-xs uppercase border-b border-[#27272A]">
                        <th className="pb-3 pl-4">Bolão</th>
                        <th className="pb-3">Criador</th>
                        <th className="pb-3">Data</th>
                        <th className="pb-3">Entrada</th>
                        <th className="pb-3">Part.</th>
                        <th className="pb-3 text-[#10B981]">Taxa Casa</th>
                        <th className="pb-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-white divide-y divide-[#27272A]">
                      {filteredPools.length === 0 ? (
                        <tr><td colSpan={7} className="py-8 text-center text-zinc-500">Nenhum bolão encontrado neste mês.</td></tr>
                      ) : (
                        filteredPools.map(pool => (
                          <tr key={pool.id} className="hover:bg-[#0A0A0B] transition">
                            <td className="py-4 pl-4 font-bold max-w-[200px] truncate">{(pool.name || 'Sem Nome').toUpperCase()}</td>
                            <td className="py-4 text-zinc-400">{(pool as any).profiles?.full_name || 'Admin'}</td>
                            <td className="py-4 text-zinc-500 text-xs">{new Date(pool.created_at).toLocaleDateString()}</td>
                            <td className="py-4">R$ {pool.entry_fee.toFixed(2)}</td>
                            <td className="py-4">{pool.current_participants} / {pool.max_participants}</td>
                            <td className="py-4 font-bold text-[#10B981]">R$ {(pool.entry_fee * pool.current_participants * 0.10).toFixed(2)}</td>
                            <td className="py-4">
                              <button
                                onClick={() => handleViewPoolHistory(pool)}
                                className="bg-[#27272A] hover:bg-[#3F3F46] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                              >
                                Ver Detalhes
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DETAIL MODAL (Existing logic preserved if any, or just expanded row) */}
              {/* DETAIL MODAL (Rich View Restored) */}
              {selectedPoolHistory && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                  <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setSelectedPoolHistory(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition">
                      <X size={24} />
                    </button>

                    {(() => {
                      const { totalGross, serviceFee, netPrize, winners, losers, prizePerWinner } = calculatePoolStats(selectedPoolHistory.pool, selectedPoolHistory.bets);

                      return (
                        <div className="space-y-8">
                          <header>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-3xl font-black text-white">{selectedPoolHistory.pool.name || selectedPoolHistory.pool.title || 'Bolão sem Nome'}</h3>
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${selectedPoolHistory.pool.status === 'finished' ? 'bg-[#10B981] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                {selectedPoolHistory.pool.status === 'finished' ? 'FINALIZADO' : selectedPoolHistory.pool.status}
                              </span>
                            </div>
                            <p className="text-zinc-500">Criado por: <span className="text-white font-bold">{selectedPoolHistory.pool.profiles?.full_name || 'Admin'}</span> • {new Date(selectedPoolHistory.pool.created_at).toLocaleString()}</p>
                          </header>

                          {/* FINANCIAL STATS */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-[#0A0A0B] p-5 rounded-2xl border border-[#27272A]">
                              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Arrecadado</p>
                              <p className="text-2xl font-black text-white">R$ {totalGross.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#0A0A0B] p-5 rounded-2xl border border-[#27272A]">
                              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Taxa Adm (10%)</p>
                              <p className="text-2xl font-black text-[#10B981]">R$ {serviceFee.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#0A0A0B] p-5 rounded-2xl border border-[#27272A]">
                              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Prêmio Líquido</p>
                              <p className="text-2xl font-black text-blue-400">R$ {netPrize.toFixed(2)}</p>
                            </div>
                            <div className="bg-[#0A0A0B] p-5 rounded-2xl border border-[#27272A]">
                              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Participantes</p>
                              <p className="text-2xl font-black text-white">{selectedPoolHistory.bets.length}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* WINNERS */}
                            <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-3xl p-6">
                              <h3 className="text-lg font-bold text-[#10B981] mb-6 flex items-center gap-2">
                                <TrendingUp size={20} />
                                Ganhadores ({winners.length})
                              </h3>
                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {winners.length > 0 ? winners.map(w => (
                                  <div key={w.id} className="flex justify-between items-center p-4 bg-[#0A0A0B] rounded-xl border border-[#10B981]/30">
                                    <div>
                                      <p className="font-bold text-white text-sm">{(w as any).profiles?.full_name}</p>
                                      <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Apostou: {w.selected_option}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[#10B981] font-black text-lg">+ R$ {prizePerWinner.toFixed(2)}</p>
                                    </div>
                                  </div>
                                )) : <p className="text-zinc-500 italic text-center py-4">Nenhum ganhador registrado.</p>}
                              </div>
                            </div>

                            {/* LOSERS */}
                            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6">
                              <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2">
                                <ArrowDownCircle size={20} />
                                Perdedores ({losers.length})
                              </h3>
                              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {losers.length > 0 ? losers.map(l => (
                                  <div key={l.id} className="flex justify-between items-center p-4 bg-[#0A0A0B] rounded-xl border border-red-500/30">
                                    <div>
                                      <p className="font-bold text-white text-sm">{(l as any).profiles?.full_name}</p>
                                      <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Apostou: {l.selected_option}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-red-500 font-bold">- R$ {l.amount.toFixed(2)}</p>
                                    </div>
                                  </div>
                                )) : <p className="text-zinc-500 italic text-center py-4">Nenhum perdedor.</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )
        }

      </section >

      {/* USER DETAILS MODAL */}
      {
        selectedUser && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-[#141417] border border-[#27272A] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 relative">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <header className="mb-8 flex justify-between items-end">
                <div>
                  <p className="text-zinc-500 text-sm mb-1 uppercase tracking-wide font-bold">Detalhes do Usuário</p>
                  <h2 className="text-4xl font-black text-white">{selectedUser.profile.full_name}</h2>
                  <div className="flex gap-4 mt-2 text-zinc-400">
                    <span className="flex items-center gap-1"><FileText size={14} /> {selectedUser.profile.email || 'Sem email'}</span>
                    <span className="bg-[#27272A] px-2 py-0.5 rounded text-xs text-white uppercase">{selectedUser.profile.role}</span>
                  </div>
                </div>
                <button
                  onClick={exportUserHistory}
                  className="bg-[#10B981] hover:bg-[#059669] text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition"
                >
                  <Download size={18} />
                  Exportar Histórico
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-5">
                  <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Saldos</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-white">Jogo: <span className="text-emerald-400 font-bold">R$ {selectedUser.profile.balance.toFixed(2)}</span></p>
                    <p className="text-white">Saque: <span className="text-white font-bold">R$ {selectedUser.profile.withdrawable_balance.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-5">
                  <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Total Movimentado</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-white">Depositado: <span className="text-white font-bold">R$ {selectedUser.stats.total_deposited.toFixed(2)}</span></p>
                    <p className="text-white">Sacado: <span className="text-white font-bold">R$ {selectedUser.stats.total_withdrawn.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="bg-[#0A0A0B] border border-[#27272A] rounded-2xl p-5">
                  <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Atividade</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-white">Vitórias: <span className="text-emerald-400 font-bold">{selectedUser.stats.win_count}</span> (R$ {selectedUser.stats.total_won.toFixed(2)})</p>
                    <p className="text-white">Pix Key: <span className="text-zinc-400">{selectedUser.profile.pix_key || '-'}</span></p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4">Histórico Recente (Últimos 50)</h3>
                <div className="space-y-2">
                  {selectedUser.history.length === 0 ? (
                    <p className="text-zinc-500">Nenhum histórico disponível.</p>
                  ) : (
                    selectedUser.history.map((h: any) => (
                      <div key={h.id} className="flex justify-between items-center bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4">
                        <div>
                          <p className="text-white font-bold">
                            {(() => {
                              switch (h.type) {
                                case 'deposit': return 'Depósito Aprovado';
                                case 'deposit_request': return 'Depósito Solicitado';
                                case 'withdraw': return 'Saque Aprovado';
                                case 'withdrawal': return 'Saque Realizado';
                                case 'withdraw_request': return 'Saque Solicitado';
                                case 'winning': return 'Prêmio (Vitória)';
                                case 'bet_debit': return 'Aposta Realizada';
                                case 'refund': return 'Reembolso';
                                default: return h.type.replace('_', ' ').toUpperCase();
                              }
                            })()}
                          </p>
                          <p className="text-xs text-zinc-500">{new Date(h.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${h.type === 'deposit' || h.type === 'winning' || h.type === 'bet_credit'
                            ? 'text-emerald-400'
                            : 'text-white'
                            }`}>
                            {h.type === 'deposit' || h.type === 'winning' ? '+' : '-'} R$ {h.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-zinc-500">{h.status}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )
      }

      {
        confirmAction && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="bg-[#0A0A0B] rounded-2xl p-6 max-w-sm w-full">
              <h2 className="text-white font-black text-lg mb-3">
                Confirmar {confirmAction.action === 'approve' ? 'aprovação' : 'rejeição'}
              </h2>
              <p className="text-zinc-400 text-sm mb-4">
                Tem certeza que deseja {confirmAction.action === 'approve' ? 'aprovar' : 'rejeitar'} esta solicitação?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-xl bg-[#141417] text-zinc-400"
                >
                  Cancelar
                </button>

                <button
                  onClick={executeAction}
                  className="px-4 py-2 rounded-xl bg-[#10B981] text-black font-bold"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        receiptUrl && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
            onClick={() => setReceiptUrl(null)}
          >
            <div
              className="relative bg-[#0A0A0B] rounded-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setReceiptUrl(null)}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white"
              >
                <X />
              </button>

              <img
                src={receiptUrl}
                alt="Comprovante"
                className="max-w-[90vw] max-h-[90vh] rounded-xl"
              />

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleDownloadReceipt}
                  className="flex items-center gap-2 bg-[#10B981] text-black font-bold px-4 py-2 rounded-xl"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ADJUSTMENT MODAL */}
      {
        editingUser && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
            <div className="bg-[#141417] border border-[#27272A] rounded-2xl p-6 max-w-md w-full animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-white mb-1">Ajuste Manual de Saldo</h3>
              <p className="text-zinc-500 text-sm mb-6">Editando {editType === 'balance' ? 'Saldo de Jogo' : 'Saldo de Saque'} de <span className="text-[#10B981]">{editingUser.full_name}</span></p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Novo Valor (R$)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full bg-[#0A0A0B] text-white font-bold p-3 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none text-lg"
                  />
                  <p className="text-xs text-zinc-500 mt-1 text-right">
                    Diferença: <span className={Number(editAmount) - (editType === 'balance' ? editingUser.balance : editingUser.withdrawable_balance) >= 0 ? 'text-[#10B981]' : 'text-red-500'}>
                      {(Number(editAmount) - (editType === 'balance' ? editingUser.balance : editingUser.withdrawable_balance)).toFixed(2)}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Motivo (Obrigatório)</label>
                  <textarea
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    placeholder="Ex: Correção de erro no sistema..."
                    className="w-full bg-[#0A0A0B] text-white p-3 rounded-xl border border-[#27272A] focus:border-[#10B981] outline-none text-sm h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold py-3 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveAdjustment}
                    disabled={savingAdjustment || !editAmount || !editReason}
                    className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {savingAdjustment ? 'Salvando...' : 'Confirmar Ajuste'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AdminDashboard;
