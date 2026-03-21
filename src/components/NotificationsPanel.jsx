import React, { useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Calendar, Trophy, MessageSquare, X, BellOff } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ahora mismo';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const typeIcon = (type) => {
    switch (type) {
        case 'match_assigned': return <Calendar size={14} />;
        case 'match_result': return <Trophy size={14} />;
        case 'match_comment': return <MessageSquare size={14} />;
        default: return <Bell size={14} />;
    }
};

const typeColor = (type) => {
    switch (type) {
        case 'match_assigned': return 'var(--cyan)';
        case 'match_result': return '#FFC107';
        case 'match_comment': return '#8b5cf6';
        default: return 'var(--text-2)';
    }
};

export default function NotificationsPanel({ onClose }) {
    const { notifications, unreadCount, markAsRead, markAllRead, loading } = useNotifications();
    const panelRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div
            ref={panelRef}
            className="w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hi)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                    <Bell size={16} style={{ color: 'var(--cyan)' }} />
                    <span className="font-bold text-white text-sm">Notificaciones</span>
                    {unreadCount > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#E53935', color: 'white', minWidth: '18px', textAlign: 'center' }}>
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="text-xs flex items-center gap-1 transition-colors"
                            style={{ color: 'var(--cyan)' }}
                            title="Marcar todas como leídas"
                        >
                            <CheckCheck size={14} /> Leer todas
                        </button>
                    )}
                    <button onClick={onClose} style={{ color: 'var(--text-3)' }}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-3)' }}>
                        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs">Cargando...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-10 px-4">
                        <BellOff size={32} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                        <p className="text-sm font-medium text-white">Sin notificaciones</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Aquí aparecerán tus partidos asignados y resultados.</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                            className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                            style={{
                                borderBottom: '1px solid var(--border)',
                                background: notif.is_read ? 'transparent' : 'rgba(0,212,255,0.04)',
                                opacity: notif.is_read ? 0.6 : 1
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(0,212,255,0.04)'}
                        >
                            {/* Icon */}
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: `${typeColor(notif.type)}18`, color: typeColor(notif.type), border: `1px solid ${typeColor(notif.type)}30` }}>
                                {typeIcon(notif.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white leading-snug">{notif.message}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{timeAgo(notif.created_at)}</p>
                            </div>

                            {/* Unread dot */}
                            {!notif.is_read && (
                                <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--cyan)' }} />
                            )}
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''} en total
                    </span>
                </div>
            )}
        </div>
    );
}
