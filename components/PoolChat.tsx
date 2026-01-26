import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { Send, MessageSquare, ShieldCheck, Lock, Trash2 } from 'lucide-react';

interface PoolChatProps {
    poolId: string;
    category: string; // 'Futebol', 'MMA', etc.
    hasBet: boolean;
    isAdmin: boolean;
}

const PoolChat: React.FC<PoolChatProps> = ({ poolId, category, hasBet, isAdmin }) => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const isCombat = ['mma', 'ufc', 'boxe', 'combate'].includes(category.toLowerCase());
    const contextTerm = isCombat ? 'Combate' : 'Jogo';

    useEffect(() => {
        if ((hasBet || isAdmin) && profile) {
            fetchMessages();
            const subscription = subscribeToMessages();
            return () => {
                subscription.unsubscribe();
            };
        } else {
            setLoading(false);
        }
    }, [poolId, hasBet, isAdmin, profile]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('pool_chat_messages')
            .select('*, profiles(full_name, avatar_url, role)')
            .eq('pool_id', poolId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
        }
        setLoading(false);
    };

    const subscribeToMessages = () => {
        return supabase
            .channel(`pool_chat:${poolId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pool_chat_messages',
                    filter: `pool_id=eq.${poolId}`,
                },
                async (payload) => {
                    const { data } = await supabase.from('profiles').select('full_name, avatar_url, role').eq('id', payload.new.user_id).single();
                    const newMsg = {
                        ...payload.new,
                        profiles: data
                    };
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'pool_chat_messages',
                    filter: `pool_id=eq.${poolId}`,
                },
                (payload) => {
                    setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
                }
            )
            .subscribe();
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !profile) return;

        const { error } = await supabase
            .from('pool_chat_messages')
            .insert({
                pool_id: poolId,
                user_id: profile.id,
                content: newMessage.trim()
            });

        if (error) {
            alert('Erro ao enviar mensagem: ' + error.message);
        } else {
            setNewMessage('');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (window.confirm('Apagar esta mensagem?')) {
            const { error } = await supabase
                .from('pool_chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) {
                alert('Erro ao apagar: ' + error.message);
            }
        }
    };

    if (!hasBet && !isAdmin) {
        return (
            <div className="bg-[#141417] border border-[#27272A] rounded-3xl p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                    <Lock size={30} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Chat da Resenha 🔒</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto mt-2">
                        Faça sua aposta neste bolão para liberar o acesso ao chat e comentar sobre esse {contextTerm}.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#141417] border border-[#27272A] rounded-3xl overflow-hidden flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-4 border-b border-[#27272A] bg-[#141417] flex items-center gap-2">
                <MessageSquare className="text-[#10B981]" size={20} />
                <h3 className="font-bold text-white">Chat da Resenha</h3>
                <span className="text-xs text-zinc-500 ml-auto bg-zinc-800 px-2 py-1 rounded-full">{messages.length} msgs</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0B] custom-scrollbar">
                {loading ? (
                    <p className="text-center text-zinc-500 text-xs mt-10">Carregando mensagens...</p>
                ) : messages.length === 0 ? (
                    <div className="text-center text-zinc-600 mt-10 space-y-2">
                        <MessageSquare className="mx-auto opacity-20" size={40} />
                        <p className="text-xs">Seja o primeiro a comentar sobre esse {contextTerm}!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === profile?.id;
                        const isAdminSender = msg.profiles?.role === 'admin';

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>

                                {/* Avatar */}
                                <div className="w-8 h-8 flex-shrink-0">
                                    {isAdminSender ? (
                                        <div className="w-8 h-8 bg-[#10B981] rounded-full flex items-center justify-center text-black shadow-lg shadow-[#10B981]/20" title="Administrador">
                                            <ShieldCheck size={16} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                                            {msg.profiles?.avatar_url ? (
                                                <img src={`https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/avatars/${msg.profiles.avatar_url}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">{msg.profiles?.full_name?.charAt(0) || '?'}</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[80%] space-y-1`}>
                                    <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className={`text-[10px] font-bold ${isAdminSender ? 'text-[#10B981]' : 'text-zinc-400'}`}>
                                            {isAdminSender ? 'BOLÃO APP' : (isMe ? 'Você' : msg.profiles?.full_name)}
                                        </span>
                                        <span className="text-[8px] text-zinc-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    <div className="relative group">
                                        <div className={`p-3 rounded-2xl text-sm leading-relaxed break-words ${isMe
                                            ? 'bg-[#10B981] text-[#0A0A0B] font-medium rounded-tr-none'
                                            : 'bg-[#27272A] text-zinc-200 rounded-tl-none border border-zinc-700'
                                            }`}>
                                            {msg.content}
                                        </div>

                                        {/* Delete Button (Only visible on hover + if isMe) */}
                                        {isMe && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A0A0B] rounded-full border border-[#27272A]"
                                                title="Apagar mensagem"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>

                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#141417] border-t border-[#27272A] flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Deixe sua opinião sobre esse ${contextTerm}...`}
                    className="flex-1 bg-[#0A0A0B] border border-[#27272A] rounded-xl px-4 py-3 text-white focus:border-[#10B981] outline-none text-sm transition-colors"
                    maxLength={500}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-black p-3 rounded-xl transition-all"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default PoolChat;
