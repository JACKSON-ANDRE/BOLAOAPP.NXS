import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Wallet,
  ArrowDownCircle,
  QrCode,
  Copy,
  Upload,
  History,
  Loader2,
  X,
  ArrowUpCircle,
  Trophy,
  AlertCircle,
  Download,
  Calendar,
  PieChart,
  ChevronRight
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateMonthlyReport } from '../utils/ReportGenerator';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import { notifyAdmin } from '../src/utils/adminNotification';

const WalletPage: React.FC = () => {
  const { profile, maintenanceMode } = useAuth();

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // History State
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Filter State
  const [selectedDay, setSelectedDay] = useState(0); // 0 = Todos
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Pix State
  const [pixKey, setPixKey] = useState('');
  const [pixQrImage, setPixQrImage] = useState('');

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Automated Pix State
  const [showAutoPixModal, setShowAutoPixModal] = useState(false);
  const [autoPixAmount, setAutoPixAmount] = useState('');
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; external_reference: string } | null>(null);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'expired'>('pending');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
    fetchPixSettings();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchHistory();

      // Listen for deposit updates in real-time
      const channel = supabase
        .channel('deposit_updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${profile.id}`
        }, (payload) => {
          if (payload.new.status === 'approved') {
            setPaymentStatus('approved');
            fetchHistory(); // Refresh history automatically
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const fetchPixSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (data) {
      if (data.pix_key) setPixKey(data.pix_key);
      if (data.pix_qrcode_url) setPixQrImage(data.pix_qrcode_url);
    }
  };


  const fetchHistory = async () => {
    if (!profile) return;
    setLoadingHistory(true);

    try {
      // 1. Fetch Transactions (Approved stuff)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id);

      // 2. Fetch Pending/Rejected Deposits
      const { data: deposits } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', profile.id)
        .neq('status', 'approved'); // Approved ones are in transactions usually

      // 3. Fetch Pending/Rejected Withdrawals
      const { data: withdraws } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('user_id', profile.id)
        .neq('status', 'approved');

      // 4. Fetch Automated Deposits
      const { data: autoDeposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', profile.id);

      // Merge & Normalize
      const merged = [
        ...(transactions || []).map(t => ({ ...t, source: 'txn', category: t.type === 'deposit' || t.type === 'winning' || t.type === 'bet_credit' ? 'credit' : 'debit' })),
        ...(deposits || []).map(d => ({ ...d, type: 'deposit_request', source: 'req', category: 'credit', created_at: d.created_at })),
        ...(withdraws || []).map(w => ({ ...w, type: 'withdraw_request', source: 'req', category: 'debit', created_at: w.created_at })),
        ...(autoDeposits || []).map(ad => ({ ...ad, type: 'deposit', source: 'auto_dep', category: 'credit', created_at: ad.created_at }))
      ];

      // Sort by date desc
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setHistoryItems(merged);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pixKey);
    alert('Chave PIX copiada');
  };

  const handleManualDeposit = async () => {
    if (!amount || !receiptFile || !profile) {
      alert('Informe o valor e anexe o comprovante');
      return;
    }

    setLoading(true);

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const storagePath = `private/${profile.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('deposit_receipts').upload(storagePath, receiptFile);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('deposit_requests').insert({
        user_id: profile.id,
        amount: Number(amount),
        receipt_path: storagePath,
        status: 'pending',
      });

      if (insertError) throw insertError;

      notifyAdmin("Novo Depósito Manual", `O usuário ${profile.full_name} enviou um comprovante de R$ ${amount}.`);

      setAmount('');
      setReceiptFile(null);
      fetchHistory();
      alert('Depósito enviado para análise');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar depósito');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAutoPix = async () => {
    if (!autoPixAmount || Number(autoPixAmount) < 1) {
      alert('Valor mínimo R$ 1,00');
      return;
    }

    setGeneratingPix(true);
    setPaymentStatus('pending');

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { amount: Number(autoPixAmount) }
      });

      if (error) throw error;
      setPixData(data);
    } catch (err) {
      console.error('Error generating PIX:', err);
      alert('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setGeneratingPix(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!withdrawAmount || !withdrawPixKey || !profile) {
      alert('Informe o valor e a chave PIX');
      return;
    }
    const amountNum = Number(withdrawAmount);
    if (amountNum <= 0) { alert('Valor inválido'); return; }
    if (amountNum > (profile.withdrawable_balance || 0)) { alert('Saldo insuficiente para saque'); return; }

    setWithdrawLoading(true);
    try {
      const { error } = await supabase.from('withdraw_requests').insert({
        user_id: profile.id,
        amount: amountNum,
        pix_key: withdrawPixKey,
        status: 'pending',
      });
      if (error) throw error;

      notifyAdmin("Solicitação de Saque", `O usuário ${profile.full_name} solicitou um saque de R$ ${amountNum}.`);

      setWithdrawAmount('');
      setWithdrawPixKey('');
      setShowWithdrawModal(false);
      fetchHistory();
      alert('Seu saque foi solicitado e aguarda aprovação.');
    } catch (err) {
      console.error(err);
      alert('Erro ao solicitar saque');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    if (type === 'deposit' || type === 'deposit_request') return <ArrowDownCircle size={20} />;
    if (type === 'withdraw' || type === 'withdraw_request') return <ArrowUpCircle size={20} />;
    if (type === 'winning') return <Trophy size={20} />;
    if (type === 'bet_debit') return <Wallet size={20} />;
    return <History size={20} />;
  };

  const getLabelForType = (type: string) => {
    switch (type) {
      case 'deposit': return 'Depósito Aprovado';
      case 'deposit_request': return 'Depósito (Solicitado)';
      case 'withdraw': return 'Saque Aprovado';
      case 'withdrawal': return 'Saque Realizado'; // Legacy or Manual
      case 'withdraw_request': return 'Saque (Solicitado)';
      case 'winning': return 'Prêmio Bolão (Vitória)';
      case 'bet_debit': return 'Aposta Realizada';
      case 'refund': return 'Reembolso';
      default: return type;
    }
  };

  // --- FILTERED DATA LOGIC ---
  const filteredItems = historyItems.filter(item => {
    const d = new Date(item.created_at);
    const dayMatch = selectedDay === 0 || d.getDate() === selectedDay;
    return dayMatch && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDay, selectedMonth, selectedYear]);

  const stats = {
    totalDeposited: filteredItems.filter(i => (i.type === 'deposit' || i.type === 'deposit_request') && i.status === 'approved').reduce((acc, i) => acc + i.amount, 0),
    totalBet: filteredItems.filter(i => i.type === 'bet_debit').reduce((acc, i) => acc + i.amount, 0),
    totalWon: filteredItems.filter(i => i.type === 'winning').reduce((acc, i) => acc + i.amount, 0),
    totalWithdrawn: filteredItems.filter(i => (i.type === 'withdraw' || i.type === 'withdraw_request') && i.status === 'approved').reduce((acc, i) => acc + i.amount, 0),
  };

  const chartData = [
    { name: 'Apostado', value: stats.totalBet, color: '#f59e0b' }, // Yellow/Orange
    { name: 'Ganho', value: stats.totalWon, color: '#10B981' }, // Emerald
  ];

  const handleDownloadReport = () => {
    if (!profile) return;
    generateMonthlyReport(profile.full_name || 'Usuário', selectedMonth, selectedYear, filteredItems, stats);
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      <header className="px-4 md:px-0 mt-4 md:mt-0">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Carteira Digital</h1>
        <p className="text-[10px] md:text-sm text-zinc-500 font-bold uppercase tracking-wider">Gerencie seus saldos e movimentações</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-6">
        {/* SALDO PARA JOGO (Green) - Primary Left (3/5) */}
        <div className="col-span-1 md:col-span-3 bg-gradient-to-br from-[#10B981]/10 via-[#0A0A0B] to-[#0A0A0B] border border-[#10B981]/30 rounded-3xl p-4 md:p-10 relative overflow-hidden group shadow-[0_0_40px_rgba(16,185,129,0.08)] flex flex-col justify-between min-h-[140px] md:min-h-[300px] transition-all hover:border-[#10B981]/60">
          <div className="absolute -top-10 -right-10 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity pointer-events-none rotate-12">
            <Wallet size={240} className="text-[#10B981]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div className="px-2.5 py-0.5 md:px-3 md:py-1 bg-[#10B981] rounded-full">
                <p className="text-[9px] md:text-sm text-[#0A0A0B] font-extrabold md:font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">Saldo Jogo</p>
              </div>
              <div className="h-0.5 md:h-1 flex-1 bg-gradient-to-r from-[#10B981]/50 to-transparent rounded-full opacity-10 md:opacity-20"></div>
            </div>
            <h2 className="text-3xl md:text-6xl font-black text-white mb-1 md:mb-2 tracking-tighter">
              <span className="text-sm md:text-2xl font-bold opacity-30 mr-1 md:mr-2 italic">R$</span>
              {profile?.balance?.toFixed(2) || '0.00'}
            </h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-bold max-w-sm leading-relaxed hidden md:block">
              Saldo disponível para apostas. (Proveniente apenas de depósitos)
            </p>
          </div>

          {/* INTEGRATED PIX BUTTON */}
          <div className="relative z-10 mt-4 md:mt-6">
            <button
              onClick={() => setShowAutoPixModal(true)}
              className="w-full md:w-fit bg-[#10B981] hover:bg-[#10B981] text-[#0A0A0B] font-black py-3 md:py-4 px-6 md:px-8 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.3)] hover:scale-[1.03] active:scale-95 transition-all duration-300 border-none group/btn"
            >
              <QrCode size={20} md:size={24} strokeWidth={3} className="group-hover/btn:rotate-12 transition-transform" />
              <span className="text-xs md:text-lg tracking-tight uppercase">ADICIONAR SALDO VIA PIX</span>
            </button>
            <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex flex-col gap-2">
              <p
                onClick={() => {
                  alert("Para realizar o depósito via PIX manual, entre em contato com o atendimento via WhatsApp enviando o comprovante.");
                }}
                className="text-xs md:text-sm text-zinc-300 hover:text-orange-500 font-black uppercase transition-all cursor-pointer inline-flex items-center gap-2 group/help underline underline-offset-4 decoration-orange-500/30 hover:decoration-orange-500"
              >
                <span className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-orange-500/50 group-hover:help:border-orange-500 flex items-center justify-center text-[10px] md:text-xs">?</span>
                PROBLEMAS PARA REALIZAR PIX ?
              </p>
            </div>
          </div>
        </div>

        {/* SALDO PARA SAQUE (Orange) - Secondary Right (2/5) */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-orange-500/10 via-[#0A0A0B] to-[#0A0A0B] border border-orange-500/20 rounded-3xl p-4 md:p-10 relative overflow-hidden group shadow-[0_0_40px_rgba(249,115,22,0.05)] flex flex-col justify-between min-h-[140px] md:min-h-[300px] transition-all hover:border-orange-500/40">
          <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity pointer-events-none rotate-12">
            <Trophy size={200} className="text-orange-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div className="px-2.5 py-0.5 md:px-3 md:py-1 bg-orange-500 rounded-full">
                <p className="text-[9px] md:text-sm text-[#0A0A0B] font-extrabold md:font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">Saldo Saque</p>
              </div>
              <div className="h-0.5 md:h-1 flex-1 bg-gradient-to-r from-orange-500/50 to-transparent rounded-full opacity-10 md:opacity-20"></div>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-1 md:mb-2 tracking-tighter">
              <span className="text-sm md:text-2xl font-bold opacity-30 mr-1 md:mr-2">R$</span>
              {profile?.withdrawable_balance?.toFixed(2) || '0.00'}
            </h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-bold max-w-sm leading-relaxed hidden md:block">
              Saldo disponível para retirada.
            </p>
          </div>

          <div className="relative z-10 mt-2.5 md:mt-3">
            {maintenanceMode && profile?.role !== 'admin' ? (
              <div className="w-full bg-[#1C1C21] border border-white/5 text-zinc-600 font-bold py-2 md:py-3 rounded-xl flex items-center justify-center gap-2 opacity-50 text-[10px] md:text-xs italic">
                <AlertCircle size={12} md:size={14} />
                SAQUES SUSPENSOS
              </div>
            ) : (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="w-full bg-transparent border-2 border-orange-500/30 hover:border-orange-500 text-orange-500 font-black py-2.5 md:py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-orange-500/10 active:scale-95 text-[10px] md:text-base uppercase"
              >
                <ArrowUpCircle size={16} md:size={18} strokeWidth={2.5} />
                SOLICITAR SAQUE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NEW GRID FOR HISTORY AND REPORT */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* HISTORY COLUMN (3/5) */}
        <div className="md:col-span-3 bg-[#141417] border border-[#27272A] rounded-3xl p-6 md:p-8 flex flex-col min-h-[600px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-8 pb-4 border-b border-[#27272A] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#10B981]/10 rounded-xl flex items-center justify-center">
                <History size={18} className="text-[#10B981]" />
              </div>
              <h3 className="text-sm md:text-base text-white font-black uppercase tracking-tight">Extrato</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-[#0A0A0B] text-[10px] text-white font-bold px-3 py-2 rounded-lg border border-[#27272A] focus:border-[#10B981] outline-none uppercase"
              >
                <option value={0}>DIA</option>
                {Array.from({ length: 31 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#0A0A0B] text-[10px] text-white font-bold px-3 py-2 rounded-lg border border-[#27272A] focus:border-[#10B981] outline-none uppercase"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-[#0A0A0B] text-[10px] text-white font-bold px-3 py-2 rounded-lg border border-[#27272A] focus:border-[#10B981] outline-none"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                onClick={handleDownloadReport}
                className="bg-[#10B981] hover:bg-[#059669] text-[#0A0A0B] p-2 rounded-lg transition-all shadow-lg shadow-[#10B981]/10 active:scale-95"
                title="Baixar Relatório PDF"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
              <Loader2 className="animate-spin text-[#10B981]" size={32} />
              <p className="text-sm">Carregando extrato...</p>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-20 bg-[#0A0A0B] rounded-2xl border border-[#27272A]">
              <History className="mx-auto text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500 text-sm">Nenhuma movimentação neste período.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
                {paginatedItems.map((item: any) => (
                  <div
                    key={`${item.source}-${item.id}`}
                    onClick={() => setSelectedTransaction(item)}
                    className="flex items-center justify-between p-4 bg-[#0A0A0B] border border-[#27272A] rounded-xl hover:border-[#10B981]/50 hover:bg-[#10B981]/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-white/5 ${item.category === 'credit' ? 'bg-[#10B981]/10 text-[#10B981]' :
                        item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                        {getIconForType(item.type)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm group-hover:text-[#10B981] transition-colors">{getLabelForType(item.type)}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] text-zinc-500">{new Date(item.created_at).toLocaleString()}</span>
                          {item.status === 'rejected' && (
                            <span className="text-[10px] text-red-500 flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded">
                              <AlertCircle size={10} /> Recusado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`font-black text-base ${item.category === 'credit' ? 'text-[#10B981]' :
                          item.status === 'rejected' ? 'text-zinc-500 line-through' :
                            item.category === 'debit' ? 'text-white' :
                              'text-white'
                          }`}>
                          {item.category === 'credit' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase inline-block mt-1 ${item.status === 'approved' || item.status === 'completed' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                          {item.status === 'approved' ? 'Aprovado' : item.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-zinc-600 group-hover:text-[#10B981] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* MONTHLY REPORT CARD (2/5) - CLEANED UP */}
        <div className="md:col-span-2 bg-[#141417] border border-[#27272A] rounded-3xl p-8 flex flex-col h-fit">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#27272A] flex-shrink-0">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <PieChart size={20} className="text-orange-400" />
            </div>
            <h3 className="text-white font-black uppercase tracking-tight">Estatísticas</h3>
          </div>

          {/* ESSENTIAL STATS */}
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex justify-between items-center group/stat hover:border-orange-500/30 transition-colors">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Apostado</span>
              <span className="text-sm font-black text-white">R$ {stats.totalBet.toFixed(2)}</span>
            </div>
            <div className="p-4 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex justify-between items-center group/stat hover:border-[#10B981]/30 transition-colors">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Ganho</span>
              <span className="text-sm font-black text-[#10B981]">R$ {stats.totalWon.toFixed(2)}</span>
            </div>
          </div>

          <div className="w-full relative mt-auto mb-4 md:mb-6 flex justify-center min-h-[140px] md:min-h-[220px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : null}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mb-1">Total</p>
              <p className="text-lg font-black text-white">R$ {(stats.totalBet + stats.totalWon).toFixed(0)}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Transaction Details Modal */}
      {
        selectedTransaction && (
          <TransactionDetailsModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        )
      }

      {/* Search Results Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
          <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <button onClick={() => setShowSearchModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X size={28} />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <History className="text-[#10B981]" size={24} />
                <h3 className="text-2xl font-black text-white">Resultados da Busca</h3>
              </div>
              <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">
                {selectedDay > 0 ? `${selectedDay}/` : ''}{selectedMonth + 1}/{selectedYear} • {filteredItems.length} lançamentos encontrados
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center py-20 bg-[#0A0A0B] rounded-2xl border border-[#27272A]">
                  <p className="text-zinc-500">Nenhum registro encontrado para este período.</p>
                </div>
              ) : (
                filteredItems.map((item: any) => (
                  <div
                    key={`${item.source}-${item.id}`}
                    onClick={() => {
                      setSelectedTransaction(item);
                      // Optional: close this modal when opening details?
                    }}
                    className="flex items-center justify-between p-4 bg-[#0A0A0B] border border-[#27272A] rounded-xl hover:border-[#10B981]/50 hover:bg-[#10B981]/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${item.category === 'credit' ? 'bg-[#10B981]/10 text-[#10B981]' :
                        item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                        {getIconForType(item.type)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm group-hover:text-[#10B981] transition-colors">{getLabelForType(item.type)}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${item.category === 'credit' ? 'text-[#10B981]' : 'text-white'}`}>
                        {item.category === 'credit' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <button
                onClick={handleDownloadReport}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all"
              >
                <Download size={20} />
                EXPORTAR ESTE PERÍODO (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8 max-w-md w-full space-y-6 relative">
            <button onClick={() => setShowWithdrawModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X size={24} />
            </button>

            <div>
              <h3 className="text-2xl font-black text-white mb-2">Solicitar Saque</h3>
              <p className="text-sm text-zinc-400">O valor será transferido para a chave PIX informada.</p>
            </div>

            <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A]">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Disponível para Saque</p>
              <p className="text-2xl font-black text-[#10B981]">R$ {profile?.withdrawable_balance?.toFixed(2)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-2 uppercase">Valor (R$)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white focus:border-[#10B981] outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 block mb-2 uppercase">Chave PIX</label>
                <input
                  type="text"
                  placeholder="CPF, e-mail, telefone..."
                  value={withdrawPixKey}
                  onChange={(e) => setWithdrawPixKey(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white focus:border-[#10B981] outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleWithdrawRequest}
              disabled={withdrawLoading}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/10 transition-all"
            >
              {withdrawLoading ? <Loader2 className="animate-spin" /> : 'CONFIRMAR SAQUE'}
            </button>
          </div>
        </div>
      )}
      {/* Automated Pix Modal */}
      {showAutoPixModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6 md:p-8 max-w-md w-full relative space-y-6">
            <button onClick={() => setShowAutoPixModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X size={24} />
            </button>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Adicionar Saldo</h3>
              <p className="text-xs text-zinc-500 font-bold uppercase">PIX Automático - Crédito Instantâneo</p>
            </div>

            {paymentStatus === 'approved' ? (
              <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="text-[#10B981]" size={40} />
                </div>
                <h4 className="text-2xl font-black text-white">💰 PAGAMENTO APROVADO!</h4>
                <p className="text-sm text-zinc-400">O saldo já foi creditado na sua conta.</p>
                <button
                  onClick={() => {
                    setShowAutoPixModal(false);
                    setPaymentStatus('pending');
                    setPixData(null);
                  }}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black py-4 rounded-xl transition-all"
                >
                  VOLTAR PARA CARTEIRA
                </button>
              </div>
            ) : !pixData ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest">Valor do Depósito (R$)</label>
                  <input
                    type="number"
                    placeholder="Min: 1.00"
                    value={autoPixAmount}
                    onChange={(e) => setAutoPixAmount(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white focus:border-[#10B981] outline-none font-black text-xl"
                  />
                </div>
                <button
                  onClick={handleGenerateAutoPix}
                  disabled={generatingPix || !autoPixAmount}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-[#10B981]/10 transition-all disabled:opacity-20"
                >
                  {generatingPix ? <Loader2 className="animate-spin" /> : <><QrCode size={20} /> GERAR QR CODE PIX</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300 text-center">
                <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl shadow-white/5">
                  <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48" />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.qr_code);
                      alert('Copiado!');
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all"
                  >
                    <Copy size={16} /> COPIAR CÓDIGO PIX
                  </button>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase animate-pulse">Aguardando pagamento...</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setPixData(null)}
                    className="text-[10px] text-zinc-400 hover:text-white font-bold uppercase underline underline-offset-4"
                  >
                    Alterar Valor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
