import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, BellOff, X, Send, Smartphone, Share, PlusSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// ─── Avisos al móvil (Web Push) ───────────────────────────────────────────────
// Cada aviso de la campana (partido nuevo, cambios, resultados, chat...) llega también como
// notificación al móvil de quien lo active aquí. En iPhone solo funciona con la app instalada
// en la pantalla de inicio (iOS 16.4 o posterior) y abierta desde ese icono.

const VAPID_PUBLIC_KEY = 'BPop90RTFP8PUSSAd8f7inoGQilIZiuei3CekY9mtEKTBqu5zeePpeNjWUztNJtZMYu0jilLF5RJQbZs9JzSSu4';
const SW_URL = '/push-sw.js';

const urlB64ToUint8Array = (b64) => {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const getPushSubscription = async () => {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg || !(reg.active || reg.installing || reg.waiting)?.scriptURL?.includes(SW_URL)) return null;
    return reg.pushManager.getSubscription();
};

const saveSubscription = async (sub) => {
    const j = sub.toJSON();
    const { error } = await supabase.rpc('push_subscribe', {
        p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_user_agent: navigator.userAgent
    });
    if (error) throw new Error(error.message);
};

// Al cerrar sesión: este móvil deja de recibir los avisos de esa cuenta
export const forgetPushForThisDevice = async () => {
    try {
        const sub = await getPushSubscription();
        if (sub) await supabase.rpc('push_unsubscribe', { p_endpoint: sub.endpoint });
    } catch { /* sin conexión: se limpiará cuando el servidor vea el móvil caducado */ }
};

// Estado: 'checking' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'
export const usePushNotifications = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState('checking');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        if (!user?.id) return;
        if (isIOS() && !isStandalone()) { setStatus('ios-install'); return; }
        if (!pushSupported()) { setStatus('unsupported'); return; }
        if (Notification.permission === 'denied') { setStatus('denied'); return; }
        try {
            const sub = Notification.permission === 'granted' ? await getPushSubscription() : null;
            if (sub) {
                // Se vuelve a guardar en cada entrada: si el móvil cambió de cuenta, pasa a la actual
                await saveSubscription(sub);
                setStatus('on');
            } else setStatus('off');
        } catch { setStatus('off'); }
    }, [user?.id]);

    useEffect(() => { refresh(); }, [refresh]);

    const enable = async () => {
        setBusy(true); setError('');
        try {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'off'); return false; }
            const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
            await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
            await saveSubscription(sub);
            setStatus('on');
            return true;
        } catch (e) {
            setError(e?.message || String(e));
            return false;
        } finally { setBusy(false); }
    };

    const disable = async () => {
        setBusy(true); setError('');
        try {
            const sub = await getPushSubscription();
            if (sub) {
                await supabase.rpc('push_unsubscribe', { p_endpoint: sub.endpoint });
                await sub.unsubscribe();
            }
            setStatus('off');
        } catch (e) { setError(e?.message || String(e)); }
        finally { setBusy(false); }
    };

    // Prueba: un aviso para mí (sale en la campana y en este móvil)
    const sendTest = async () => {
        if (!user?.id) return;
        setBusy(true); setError('');
        try {
            const { error: e } = await supabase.from('notifications').insert({ user_id: user.id, type: 'general', message: '¡Listo! Los avisos de la Escuela de Tenis Marineda llegan a este móvil.' });
            if (e) throw new Error(e.message);
        } catch (e) { setError(e?.message || String(e)); }
        finally { setBusy(false); }
    };

    return { status, busy, error, enable, disable, sendTest, refresh };
};

const box = { background: 'var(--bg-card)', border: '1px solid var(--border-hi)' };

// Tarjeta de Inicio: aparece mientras este móvil no tenga los avisos activados
export function PushOptInCard() {
    const { status, busy, error, enable } = usePushNotifications();
    const [hidden, setHidden] = useState(() => { try { return Number(localStorage.getItem('push_card_hidden_until') || 0) > Date.now(); } catch { return false; } });
    if (hidden || status === 'checking' || status === 'on' || status === 'unsupported') return null;
    const hide = () => { try { localStorage.setItem('push_card_hidden_until', String(Date.now() + 3 * 24 * 3600 * 1000)); } catch { /* */ } setHidden(true); };
    return (
        <div className="p-4 rounded-2xl" style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.35)' }}>
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)' }}>
                    <BellRing size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">Entérate en el móvil cuando tengas partido</p>
                    {status === 'ios-install' ? (
                        <>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>En iPhone, los avisos solo llegan si la app está instalada. Hazlo en 3 pasos (en Safari):</p>
                            <ol className="text-xs mt-2 space-y-1.5" style={{ color: 'var(--text-2)' }}>
                                <li>1. Pulsa <Share size={13} className="inline-block align-text-bottom mx-0.5" style={{ color: 'var(--cyan)' }} /> <b className="text-white">Compartir</b> (abajo en la pantalla).</li>
                                <li>2. Elige <PlusSquare size={13} className="inline-block align-text-bottom mx-0.5" style={{ color: 'var(--cyan)' }} /> <b className="text-white">Añadir a pantalla de inicio</b>.</li>
                                <li>3. Abre la app desde el icono nuevo y pulsa aquí <b className="text-white">Activar avisos</b>.</li>
                            </ol>
                        </>
                    ) : status === 'denied' ? (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Los avisos están bloqueados en este móvil. Actívalos en los ajustes: en Android, toca el candado junto a la dirección web &gt; Permisos &gt; Notificaciones; en iPhone, Ajustes &gt; Notificaciones &gt; Marineda.</p>
                    ) : (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Te llega un aviso cuando se publica tu partido, si cambia, y con el resultado. Gratis y sin dar tu teléfono.</p>
                    )}
                    {error && <p className="text-xs mt-2" style={{ color: '#ff8a80' }}>No se pudo activar: {error}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        {status === 'off' && <button onClick={enable} disabled={busy} className="btn-cyber px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">{busy ? 'Activando...' : 'Activar avisos'}</button>}
                        <button onClick={hide} className="text-xs underline" style={{ color: 'var(--text-3)' }}>Ahora no</button>
                    </div>
                </div>
                <button onClick={hide} aria-label="Cerrar" style={{ color: 'var(--text-3)' }}><X size={16} /></button>
            </div>
        </div>
    );
}

// Ventana "Avisos al móvil" (menú): ver estado, activar, probar o desactivar
export function PushSettingsModal({ onClose }) {
    const { status, busy, error, enable, disable, sendTest } = usePushNotifications();
    const [tested, setTested] = useState(false);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
            <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={box} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Smartphone size={18} style={{ color: 'var(--cyan)' }} /> Avisos al móvil</h3>
                    <button onClick={onClose} aria-label="Cerrar" style={{ color: 'var(--text-3)' }}><X size={18} /></button>
                </div>
                {status === 'checking' && <p className="text-sm" style={{ color: 'var(--text-2)' }}>Comprobando...</p>}
                {status === 'on' && (
                    <>
                        <p className="text-sm" style={{ color: '#00ff87' }}>Activados en este móvil.</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Te avisaremos de tus partidos, cambios, resultados y mensajes.</p>
                        {tested && <p className="text-xs mt-2" style={{ color: 'var(--cyan)' }}>Enviado. Debería llegarte en unos segundos (también sale en la campana).</p>}
                        <div className="flex flex-wrap gap-2 mt-4">
                            <button onClick={async () => { await sendTest(); setTested(true); }} disabled={busy} className="btn-cyber px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"><Send size={14} /> Enviarme una prueba</button>
                            <button onClick={disable} disabled={busy} className="px-4 py-2 rounded-lg text-sm flex items-center gap-2" style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}><BellOff size={14} /> Desactivar</button>
                        </div>
                    </>
                )}
                {status === 'off' && (
                    <>
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Recibe un aviso en este móvil cuando tengas partido, si cambia y con el resultado.</p>
                        <button onClick={enable} disabled={busy} className="btn-cyber mt-4 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">{busy ? 'Activando...' : 'Activar avisos'}</button>
                    </>
                )}
                {status === 'ios-install' && (
                    <ol className="text-sm space-y-2" style={{ color: 'var(--text-2)' }}>
                        <li>En iPhone los avisos solo funcionan con la app instalada:</li>
                        <li>1. En Safari, pulsa <Share size={14} className="inline-block align-text-bottom mx-0.5" style={{ color: 'var(--cyan)' }} /> <b className="text-white">Compartir</b>.</li>
                        <li>2. <PlusSquare size={14} className="inline-block align-text-bottom mx-0.5" style={{ color: 'var(--cyan)' }} /> <b className="text-white">Añadir a pantalla de inicio</b>.</li>
                        <li>3. Abre la app desde ese icono y vuelve aquí para activar los avisos.</li>
                    </ol>
                )}
                {status === 'denied' && <p className="text-sm" style={{ color: 'var(--text-2)' }}>Los avisos están bloqueados para esta app. Actívalos en los ajustes del móvil (Notificaciones) y vuelve a entrar.</p>}
                {status === 'unsupported' && <p className="text-sm" style={{ color: 'var(--text-2)' }}>Este navegador no admite avisos. Abre la app en Chrome (Android) o instálala en la pantalla de inicio (iPhone).</p>}
                {error && <p className="text-xs mt-3" style={{ color: '#ff8a80' }}>{error}</p>}
            </div>
        </div>
    );
}

// Monitores: aviso a todas las cuentas
export function BroadcastModal({ onClose }) {
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const send = async () => {
        setBusy(true); setError('');
        try {
            const { data, error: e } = await supabase.rpc('admin_broadcast', { p_message: msg });
            if (e) throw new Error(e.message);
            setResult(`Enviado a ${data} cuentas. Sale en la campana de todos y en el móvil de quien tenga los avisos activados.`);
            setMsg('');
        } catch (e) { setError(e?.message || String(e)); }
        finally { setBusy(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
            <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={box} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Send size={18} style={{ color: 'var(--cyan)' }} /> Aviso a todos</h3>
                    <button onClick={onClose} aria-label="Cerrar" style={{ color: 'var(--text-3)' }}><X size={18} /></button>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-2)' }}>Llega a todas las cuentas (tenis y pádel). Úsalo para cosas importantes: si se abusa, la gente desactiva los avisos.</p>
                <textarea value={msg} onChange={e => { setMsg(e.target.value); setResult(''); }} rows={4} maxLength={500} placeholder="Por ejemplo: esta semana no hay jornada por el torneo del club." className="cyber-input w-full px-3 py-2.5 rounded-xl text-sm" />
                {result && <p className="text-xs mt-2" style={{ color: '#00ff87' }}>{result}</p>}
                {error && <p className="text-xs mt-2" style={{ color: '#ff8a80' }}>{error}</p>}
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>Cerrar</button>
                    <button onClick={send} disabled={busy || msg.trim().length < 3} className="btn-cyber px-5 py-2 rounded-lg font-bold text-sm disabled:opacity-50">{busy ? 'Enviando...' : 'Enviar a todos'}</button>
                </div>
            </div>
        </div>
    );
}
