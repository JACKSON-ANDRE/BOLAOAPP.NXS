import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    X,
    Calendar,
    User,
    Trophy,
    Target,
    FileText,
    CheckCircle2,
    AlertCircle,
    Clock,
    ArrowRight,
    Loader2,
    XCircle
} from 'lucide-react';

interface TransactionDetailsModalProps {
    transaction: any;
    onClose: () => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    isProcessing?: boolean;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
    transaction,
    onClose,
    onApprove,
    onReject,
    isProcessing
}) => {
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [transaction]);

    const fetchDetails = async () => {
        if (!transaction) return;

        // For Pets/Wins, reference_id is usually the pool_id
        if (transaction.type === 'bet_debit' || transaction.type === 'winning' || transaction.type === 'refund') {
            if (transaction.reference_id) {
                setLoading(true);
                // Fetch Pool Details + Creator + Bet Count
                const { data, error } = await supabase
                    .from('pools')
                    .select('*, profiles:creator_id(full_name), bets(count)')
                    .eq('id', transaction.reference_id)
                    .single();

                if (!error && data) {
                    setDetails({
                        poolTitle: data.title,
                        creatorName: data.profiles?.full_name || 'Desconhecido',
                        totalBettors: data.bets[0]?.count || 0,
                        poolId: data.id
                    });
                }
                setLoading(false);
            }
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'approved' || status === 'completed' || status === 'won') return 'text-[#10B981] bg-[#10B981]/10';
        if (status === 'pending') return 'text-yellow-500 bg-yellow-500/10';
        return 'text-red-500 bg-red-500/10';
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovado';
            case 'completed': return 'Concluído';
            case 'pending': return 'Pendente';
            case 'rejected': return 'Rejeitado';
            case 'won': return 'Venceu';
            default: return status;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-[#18181b] border border-[#27272A] rounded-2xl w-full max-w-md relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-[#27272A] flex justify-between items-center bg-[#141417]">
                    <h3 className="text-xl font-bold text-white">Detalhes da Transação</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Amount & Status */}
                    <div className="text-center">
                        <p className="text-sm text-zinc-400 font-bold uppercase mb-1">Valor</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className={`text-4xl font-black ${transaction.category === 'credit' ? 'text-[#10B981]' : 'text-white'}`}>
                                {transaction.category === 'credit' ? '+' : '-'} R$ {Number(transaction.amount).toFixed(2)}
                            </span>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase mt-3 ${getStatusColor(transaction.status)}`}>
                            {transaction.status === 'approved' && <CheckCircle2 size={12} />}
                            {transaction.status === 'pending' && <Clock size={12} />}
                            {transaction.status === 'rejected' && <AlertCircle size={12} />}
                            {getStatusLabel(transaction.status)}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-[#27272A]" />

                    {/* Metadata Grid */}
                    {/* BALANCE HISTORY (New) */}
                    {transaction.balance_before !== null && transaction.balance_after !== null && transaction.balance_before !== undefined && (
                        <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Target size={40} />
                            </div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Histórico de Saldo</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-zinc-600 font-bold mb-0.5">ANTES</p>
                                    <p className="text-sm font-mono text-zinc-400">R$ {Number(transaction.balance_before).toFixed(2)}</p>
                                </div>
                                <ArrowRight size={16} className="text-[#10B981]" />
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-600 font-bold mb-0.5">DEPOIS</p>
                                    <p className="text-xl font-mono font-black text-[#10B981]">R$ {Number(transaction.balance_after).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4">
                        <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A] flex items-center gap-3">
                            <div className="bg-zinc-800/50 p-2 rounded-lg text-zinc-400">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Data & Hora</p>
                                <p className="text-sm font-bold text-zinc-200">
                                    {new Date(transaction.created_at).toLocaleDateString()} às {new Date(transaction.created_at).toLocaleTimeString().slice(0, 5)}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A] flex items-center gap-3">
                            <div className="bg-zinc-800/50 p-2 rounded-lg text-zinc-400">
                                <FileText size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">ID da Transação</p>
                                <p className="text-sm font-mono text-zinc-400 truncate w-48">
                                    {transaction.id}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC DETAILS (If Pool Related) */}
                    {(transaction.type === 'bet_debit' || transaction.type === 'winning' || transaction.type === 'refund') && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-zinc-400 uppercase ml-1">Detalhes do Bolão</p>
                            {loading ? (
                                <div className="h-20 bg-[#0A0A0B] rounded-xl animate-pulse" />
                            ) : details ? (
                                <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 space-y-3">
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Bolão</p>
                                        <p className="text-base font-bold text-white leading-tight">{details.poolTitle}</p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Criado por</p>
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="text-[#10B981]" />
                                                <p className="text-sm text-zinc-300">{details.creatorName}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Participantes</p>
                                            <p className="text-sm font-mono text-zinc-300">{details.totalBettors} apostadores</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 text-xs">Informações do bolão não encontradas (pode ter sido excluído).</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DEPOSIT / WITHDRAW DETAILS */}
                    {(transaction.type === 'withdraw' || transaction.type === 'withdraw_request') && transaction.pix_key && (
                        <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Chave PIX de Destino</p>
                            <p className="text-sm font-mono text-white">{transaction.pix_key}</p>
                        </div>
                    )}

                    {(transaction.type === 'deposit_request') && transaction.receipt_path && (
                        <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Comprovante Anexado</p>
                            <div className="flex items-center gap-2 text-zinc-400 text-xs">
                                <CheckCircle2 size={14} className="text-[#10B981]" /> Enviado com sucesso
                            </div>
                        </div>
                    )}

                    {/* ACTION BUTTONS FOR PENDING/EXPIRED DEPOSITS */}
                    {(onApprove || onReject) && (transaction.status === 'pending' || transaction.status === 'expired') && (
                        <div className="flex gap-3 pt-4 border-t border-[#27272A] mt-4">
                            {onReject && (
                                <button
                                    onClick={() => onReject(transaction.id)}
                                    disabled={isProcessing}
                                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                                    REJEITAR
                                </button>
                            )}
                            {onApprove && (
                                <button
                                    onClick={() => onApprove(transaction.id)}
                                    disabled={isProcessing}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                    APROVAR E ENVIAR PIX
                                </button>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div >
    );
};

export default TransactionDetailsModal;
