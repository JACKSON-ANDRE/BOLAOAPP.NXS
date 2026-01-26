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
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateMonthlyReport } from '../utils/ReportGenerator';
import TransactionDetailsModal from '../components/TransactionDetailsModal';

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
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
    fetchPixSettings();
  }, []);

  useEffect(() => {
    if (profile?.id) fetchHistory();
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

      // Merge & Normalize
      const merged = [
        ...(transactions || []).map(t => ({ ...t, source: 'txn', category: t.type === 'deposit' || t.type === 'winning' || t.type === 'bet_credit' ? 'credit' : 'debit' })),
        ...(deposits || []).map(d => ({ ...d, type: 'deposit_request', source: 'req', category: 'credit', created_at: d.created_at })),
        ...(withdraws || []).map(w => ({ ...w, type: 'withdraw_request', source: 'req', category: 'debit', created_at: w.created_at }))
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

  const handleDeposit = async () => {
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

      setAmount('');
      setReceiptFile(null);
      fetchHistory(); // Refresh history
      alert('Depósito enviado para análise');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar depósito');
    } finally {
      setLoading(false);
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
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const stats = {
    totalDeposited: filteredItems.filter(i => (i.type === 'deposit' || i.type === 'deposit_request') && i.status === 'approved').reduce((acc, i) => acc + i.amount, 0),
    totalBet: filteredItems.filter(i => i.type === 'bet_debit').reduce((acc, i) => acc + i.amount, 0),
    totalWon: filteredItems.filter(i => i.type === 'winning').reduce((acc, i) => acc + i.amount, 0),
    totalWithdrawn: filteredItems.filter(i => (i.type === 'withdraw' || i.type === 'withdraw_request') && i.status === 'approved').reduce((acc, i) => acc + i.amount, 0),
  };

  const chartData = [
    { name: 'Apostado', value: stats.totalBet, color: '#f59e0b' }, // Yellow/Orange
    { name: 'Ganho', value: stats.totalWon, color: '#10B981' }, // Emerald
    { name: 'Depósitos', value: stats.totalDeposited, color: '#3b82f6' }, // Blue
  ];

  const handleDownloadReport = () => {
    if (!profile) return;
    generateMonthlyReport(profile.full_name || 'Usuário', selectedMonth, selectedYear, filteredItems, stats);
  };

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-white">Carteira Digital</h1>
        <p className="text-zinc-500">Gerencie seus saldos e movimentações.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
        {/* SALDO PARA JOGO (Green) - Primary Left (60%) */}
        <div className="col-span-1 md:col-span-3 bg-gradient-to-br from-[#10B981]/20 to-[#0A0A0B] border border-[#10B981]/50 rounded-2xl md:rounded-3xl p-4 md:p-8 relative overflow-hidden group shadow-lg shadow-[#10B981]/10">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-20 group-hover:opacity-30 transition-opacity">
            <Wallet size={60} className="text-[#10B981] md:w-[120px] md:h-[120px]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] md:text-sm text-[#10B981] font-bold uppercase tracking-widest mb-1 md:mb-2">Saldo Jogo</p>
            <h2 className="text-2xl md:text-5xl font-black text-white mb-2 md:mb-6">
              R$ {profile?.balance?.toFixed(2) || '0.00'}
            </h2>
            <p className="text-[10px] md:text-sm text-[#10B981]/80 mb-0 md:mb-6 leading-relaxed font-bold max-w-md hidden md:block">
              Saldo total disponível para apostas. (Inclui depósitos e prêmios)
            </p>
          </div>
        </div>

        {/* SALDO PARA SAQUE (Orange) - Secondary Right (40%) */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-orange-500/10 to-[#0A0A0B] border border-orange-500/20 rounded-2xl md:rounded-3xl p-4 md:p-8 relative overflow-hidden group shadow-lg shadow-orange-500/5 flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Trophy size={60} className="text-orange-500 md:w-[100px] md:h-[100px]" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] md:text-xs text-orange-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1 md:gap-2">
              <Trophy size={12} className="md:w-[14px] md:h-[14px]" />
              Saldo Saque
            </p>
            <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-4">R$ {profile?.withdrawable_balance?.toFixed(2) || '0.00'}</h2>

            {maintenanceMode && profile?.role !== 'admin' ? (
              <button disabled className="w-full bg-[#27272A] text-zinc-500 font-bold py-2 md:py-3 rounded-xl flex items-center justify-center gap-2 border border-white/5 cursor-not-allowed text-[10px] md:text-xs">
                <AlertCircle size={14} className="md:w-4 md:h-4" />
                SUSPENSO
              </button>
            ) : (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-1 md:gap-2 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] text-xs md:text-base"
              >
                <ArrowUpCircle size={14} strokeWidth={2.5} className="md:w-5 md:h-5" />
                SACAR
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DEPOSIT COLUMN */}
        <div id="deposit-area" className="lg:col-span-1 bg-[#141417] border border-[#27272A] rounded-3xl p-8 space-y-6 h-fit">
          <div className="flex items-center gap-2 text-white font-bold pb-4 border-b border-[#27272A]">
            <QrCode size={20} className="text-[#10B981]" />
            Adicionar Saldo (PIX)
          </div>

          <div className="flex justify-center bg-[#0A0A0B] p-4 rounded-2xl border border-[#27272A]">
            {pixQrImage ? (
              <img src={pixQrImage} alt="QR Code PIX" className="w-48 h-48 object-contain rounded-lg" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-zinc-500 text-xs text-center p-4">QR Code indisponível</div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl px-4 py-3">
            <span className="flex-1 text-xs text-zinc-300 font-mono truncate">{pixKey || 'Chave não configurada'}</span>
            <button onClick={copyPix} className="text-[#10B981] hover:text-white"><Copy size={16} /></button>
          </div>

          <div className="space-y-4">
            <input
              type="number"
              placeholder="Valor (R$)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-white text-center font-bold text-lg focus:border-[#10B981] outline-none"
            />

            <label className={`border border-dashed border-[#27272A] rounded-xl p-4 text-center cursor-pointer block hover:bg-[#27272A] transition ${receiptFile ? 'border-[#10B981] bg-[#10B981]/5' : ''}`}>
              <Upload className={`mx-auto mb-2 ${receiptFile ? 'text-[#10B981]' : 'text-zinc-500'}`} size={20} />
              <span className="text-xs text-zinc-400">{receiptFile ? receiptFile.name : 'Anexar Comprovante'}</span>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setReceiptFile(e.target.files[0]); }} />
            </label>
          </div>

          {maintenanceMode && profile?.role !== 'admin' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl flex gap-3">
              <AlertCircle className="text-yellow-500 shrink-0" size={20} />
              <p className="text-xs text-yellow-200 font-bold">
                Depósitos suspensos temporariamente.
              </p>
            </div>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/10 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'ENVIAR DEPÓSITO'}
            </button>
          )}
        </div>
      </div>

      {/* HISTORY & REPORT COLUMN */}
      <div className="lg:col-span-2 space-y-6">

        {/* MONTHLY REPORT CARD */}
        <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-white font-bold">
              <PieChart size={20} className="text-[#10B981]" />
              Resumo Financeiro
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#0A0A0B] text-white text-xs font-bold px-3 py-2 rounded-lg border border-[#27272A] focus:border-[#10B981] outline-none"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-[#0A0A0B] text-white text-xs font-bold px-3 py-2 rounded-lg border border-[#27272A] focus:border-[#10B981] outline-none"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                onClick={handleDownloadReport}
                className="bg-[#27272A] hover:bg-[#3F3F46] text-white p-2 rounded-lg border border-[#27272A] transition-colors"
                title="Baixar Relatório PDF"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          {/* GRAPH & STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total Apostado</span>
                <span className="text-sm font-bold text-orange-400">R$ {stats.totalBet.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex justify-between items-center">
                <span className="text-xs text-zinc-400">Total Ganho</span>
                <span className="text-sm font-bold text-[#10B981]">R$ {stats.totalWon.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex justify-between items-center">
                <span className="text-xs text-zinc-400">Saldo do Mês</span>
                <span className={`text-sm font-bold ${stats.totalWon - stats.totalBet >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {stats.totalWon - stats.totalBet >= 0 ? '+' : ''} R$ {(stats.totalWon - stats.totalBet).toFixed(2)}
                </span>
              </div>
            </div>


            <div className="w-full relative" style={{ height: '160px' }}>
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-8">
          <div className="flex items-center gap-2 text-white font-bold mb-6 pb-4 border-b border-[#27272A]">
            <History size={20} className="text-[#10B981]" />
            Extrato de Movimentações
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
              <Loader2 className="animate-spin text-[#10B981]" size={32} />
              <p className="text-sm">Carregando extrato...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-[#0A0A0B] rounded-2xl border border-[#27272A]">
              <History className="mx-auto text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500 text-sm">Nenhuma movimentação neste período.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredItems.map((item: any) => (
                <div
                  key={`${item.source}-${item.id}`}
                  onClick={() => setSelectedTransaction(item)}
                  className="flex items-center justify-between p-4 bg-[#0A0A0B] border border-[#27272A] rounded-xl hover:border-[#10B981]/50 hover:bg-[#10B981]/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/5 ${item.category === 'credit' ? 'bg-[#10B981]/10 text-[#10B981]' :
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
          )}
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

      {/* Withdrawal Modal */}
      {
        showWithdrawModal && (
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
        )
      }
    </div >
  );
};

export default WalletPage;
