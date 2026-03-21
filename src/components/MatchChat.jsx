import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const timeLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) +
        ' · ' + d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function MatchChat({ match, onClose }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const matchLabel = `${match.t1?.name} vs ${match.t2?.name}`;

    // Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('match_comments')
                    .select('*')
                    .eq('match_id', match.id)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setMessages(data || []);
            } catch (err) {
                console.error('Error fetching chat:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [match.id]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`match_chat_${match.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'match_comments',
                    filter: `match_id=eq.${match.id}`
                },
                (payload) => {
                    setMessages(prev => {
                        // Avoid duplicates
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [match.id]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending || !user) return;

        const content = input.trim();
        setInput('');
        setSending(true);

        try {
            const { error } = await supabase.from('match_comments').insert({
                match_id: match.id,
                author_id: user.id,
                author_name: user.name || user.email,
                content
            });
            if (error) throw error;
        } catch (err) {
            console.error('Error sending message:', err);
            setInput(content); // Restore on error
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div
                className="w-full md:w-[480px] md:max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hi)', maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <MessageSquare size={16} style={{ color: '#8b5cf6' }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8b5cf6' }}>Chat del partido</p>
                            <p className="text-sm font-bold text-white truncate max-w-[260px]">{matchLabel}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-2)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'white'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>
                        <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ background: 'var(--bg-deep)' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader size={20} className="animate-spin" style={{ color: 'var(--cyan)' }} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10">
                            <MessageSquare size={36} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                            <p className="text-sm font-medium text-white">Sé el primero en escribir</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Coordina el partido con tu rival aquí.</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.author_id === user?.id;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && (
                                        <span className="text-[11px] font-bold mb-1 px-1" style={{ color: '#8b5cf6' }}>
                                            {msg.author_name}
                                        </span>
                                    )}
                                    <div
                                        className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug"
                                        style={isMe
                                            ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.35), rgba(229,57,53,0.2))', border: '1px solid rgba(229,57,53,0.3)', color: 'white', borderBottomRightRadius: '6px' }
                                            : { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'white', borderBottomLeftRadius: '6px' }
                                        }
                                    >
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-3)' }}>
                                        {isMe ? 'Tú · ' : ''}{timeLabel(msg.created_at)}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                    <div className="flex gap-2 items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            className="cyber-input flex-1 px-4 py-2.5 rounded-xl text-sm"
                            disabled={!user}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending || !user}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.6), rgba(229,57,53,0.4))', border: '1px solid rgba(229,57,53,0.5)', color: 'white' }}
                        >
                            {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                    {!user && (
                        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-3)' }}>Debes iniciar sesión para chatear.</p>
                    )}
                </form>
            </div>
        </div>
    );
}
