import React, { useCallback, useEffect, useState } from 'react';
import { X, Camera, Send, CheckCircle, LifeBuoy, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// ─── "¿Algo falla?": incidencias que mandan los jugadores desde la app ─────────
// Guardan texto + foto opcional en Supabase (tabla bug_reports, bucket privado bug-photos).
// Las leen los monitores desde "Incidencias" y Víctor las revisa en el briefing diario.

const MAX_SIDE = 1600;

// Reduce la foto antes de subirla (una captura del móvil pesa 3-6 MB; así queda en ~200 KB)
async function compressImage(file) {
    let bitmap = null;
    try { bitmap = await createImageBitmap(file); } catch { bitmap = null; }
    if (!bitmap) {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024) return { blob: file, type: file.type };
        throw new Error('No se pudo leer la foto. Prueba con una captura de pantalla o una foto en JPG.');
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('No se pudo preparar la foto.');
    return { blob, type: 'image/jpeg' };
}

const overlay = { background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' };
const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-hi)' };

// Formulario del jugador. `context` = { sport, screen } para saber dónde estaba.
export function BugReportModal({ onClose, context }) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!file) { setPreview(''); return; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const submit = async () => {
        const text = message.trim();
        if (text.length < 3) { setError('Cuéntanos qué ha pasado (unas palabras bastan).'); return; }
        if (!user?.id) { setError('Inicia sesión para enviar la incidencia.'); return; }
        setSending(true); setError('');
        try {
            let photo_path = null;
            if (file) {
                const { blob, type } = await compressImage(file);
                const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
                const path = `${user.id}/${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from('bug-photos').upload(path, blob, { contentType: type, upsert: false });
                if (upErr) throw new Error('No se pudo subir la foto: ' + upErr.message);
                photo_path = path;
            }
            const { error: insErr } = await supabase.from('bug_reports').insert({
                user_id: user.id,
                message: text,
                photo_path,
                sport: context?.sport || null,
                screen: context?.screen || null,
                app_version: window.__BUILD_VERSION || null,
                user_agent: navigator.userAgent
            });
            if (insErr) throw new Error(insErr.message);
            setDone(true);
        } catch (e) {
            setError(e?.message || 'No se pudo enviar. Inténtalo otra vez.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={overlay} onClick={onClose}>
            <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" style={panel} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><LifeBuoy size={18} style={{ color: 'var(--cyan)' }} /> ¿Algo falla?</h3>
                    <button onClick={onClose} aria-label="Cerrar" style={{ color: 'var(--text-3)' }}><X size={18} /></button>
                </div>

                {done ? (
                    <div className="text-center py-6">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,255,135,0.12)', border: '2px solid rgba(0,255,135,0.4)' }}>
                            <CheckCircle size={28} style={{ color: '#00ff87' }} />
                        </div>
                        <p className="font-bold text-white mb-1">Recibido, gracias</p>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>Lo miramos y, si hace falta, te contestamos por la campana o por WhatsApp.</p>
                        <button onClick={onClose} className="btn-cyber px-6 py-2.5 rounded-xl font-bold text-sm">Cerrar</button>
                    </div>
                ) : (
                    <>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Cuéntanos qué ha pasado o qué echas en falta. Si puedes, añade una captura de pantalla: ayuda mucho.</p>
                        {error && <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.3)', color: '#ff8a80' }}>{error}</div>}
                        <textarea
                            value={message}
                            onChange={e => { setMessage(e.target.value); setError(''); }}
                            maxLength={2000}
                            rows={4}
                            placeholder="Por ejemplo: al pulsar Guardar en Mi Disponibilidad no pasa nada."
                            className="cyber-input w-full px-3 py-2.5 rounded-xl text-sm resize-y"
                            aria-label="Qué ha pasado"
                        />
                        <div className="mt-3">
                            {preview ? (
                                <div className="relative inline-block">
                                    <img src={preview} alt="Foto adjunta" className="max-h-40 rounded-lg" style={{ border: '1px solid var(--border)' }} />
                                    <button onClick={() => setFile(null)} aria-label="Quitar la foto" className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#E53935', color: 'white' }}><X size={14} /></button>
                                </div>
                            ) : (
                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--cyan)' }}>
                                    <Camera size={16} /> Añadir captura o foto
                                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(''); } e.target.value = ''; }} />
                                </label>
                            )}
                        </div>
                        <p className="text-[11px] mt-3" style={{ color: 'var(--text-3)' }}>Se envía con tu nombre, para poder contestarte. Pantalla: {context?.screen || 'inicio'}.</p>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>Cancelar</button>
                            <button onClick={submit} disabled={sending || message.trim().length < 3} className="btn-cyber px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Send size={14} /> {sending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Cuántas incidencias nuevas hay (para la etiqueta del botón de los monitores)
export async function countNewBugReports() {
    const { count, error } = await supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'nuevo');
    return error ? 0 : (count || 0);
}

const statusStyle = {
    nuevo: { background: 'rgba(229,57,53,0.15)', color: '#ff8a80', border: '1px solid rgba(229,57,53,0.35)' },
    visto: { background: 'rgba(255,193,7,0.12)', color: '#FFC107', border: '1px solid rgba(255,193,7,0.35)' },
    resuelto: { background: 'rgba(0,255,135,0.10)', color: '#00ff87', border: '1px solid rgba(0,255,135,0.3)' }
};

const whenLabel = (iso) => {
    try { return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
};

// Lista para los monitores: ver, abrir la foto y marcar visto / resuelto
export function BugReportsAdminModal({ onClose, onChanged }) {
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [photos, setPhotos] = useState({});   // path → url firmada (1 hora)
    const [busy, setBusy] = useState(null);
    const [filter, setFilter] = useState('pendientes');

    const load = useCallback(async () => {
        setError('');
        const { data, error: err } = await supabase.from('bug_reports')
            .select('id, user_name, user_email, sport, screen, app_version, message, photo_path, status, admin_note, created_at')
            .order('created_at', { ascending: false }).limit(200);
        if (err) { setError(err.message); return; }
        setItems(data || []);
        const paths = (data || []).map(r => r.photo_path).filter(Boolean);
        if (paths.length > 0) {
            const { data: signed } = await supabase.storage.from('bug-photos').createSignedUrls(paths, 3600);
            const map = {};
            (signed || []).forEach(s => { if (s?.signedUrl && s.path) map[s.path] = s.signedUrl; });
            setPhotos(map);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const setStatus = async (r, status) => {
        setBusy(r.id);
        const patch = { status, resolved_at: status === 'resuelto' ? new Date().toISOString() : null };
        const { error: err } = await supabase.from('bug_reports').update(patch).eq('id', r.id);
        setBusy(null);
        if (err) { setError(err.message); return; }
        setItems(prev => prev.map(x => x.id === r.id ? { ...x, ...patch } : x));
        onChanged?.();
    };

    const shown = (items || []).filter(r => filter === 'todas' ? true : r.status !== 'resuelto');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={overlay} onClick={onClose}>
            <div className="rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[88vh] overflow-y-auto" style={panel} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><LifeBuoy size={18} style={{ color: 'var(--cyan)' }} /> Incidencias</h3>
                    <button onClick={onClose} aria-label="Cerrar" style={{ color: 'var(--text-3)' }}><X size={18} /></button>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>Lo que mandan los jugadores desde "¿Algo falla?". Marcad "Visto" cuando lo leáis y "Resuelto" cuando esté arreglado.</p>
                <div className="flex gap-2 mb-4">
                    {[['pendientes', 'Pendientes'], ['todas', 'Todas']].map(([k, label]) => (
                        <button key={k} onClick={() => setFilter(k)} className="text-xs px-3 py-1.5 rounded-full font-bold" style={filter === k ? { background: 'rgba(0,212,255,0.15)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.4)' } : { color: 'var(--text-3)', border: '1px solid var(--border)' }}>{label}</button>
                    ))}
                </div>
                {error && <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.3)', color: '#ff8a80' }}>{error}</div>}
                {items === null && !error && <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>Cargando...</p>}
                {items !== null && shown.length === 0 && <p className="text-sm py-6 text-center" style={{ color: 'var(--text-3)' }}>{filter === 'todas' ? 'Nadie ha mandado ninguna incidencia todavía.' : 'No hay incidencias pendientes.'}</p>}
                <div className="space-y-3">
                    {shown.map(r => (
                        <div key={r.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={statusStyle[r.status] || statusStyle.nuevo}>{r.status}</span>
                                <span className="text-sm font-bold text-white">{r.user_name || r.user_email || 'Jugador'}</span>
                                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{whenLabel(r.created_at)} · {r.screen || 'inicio'}{r.app_version ? ` · ${r.app_version}` : ''}</span>
                            </div>
                            <p className="text-sm text-white whitespace-pre-wrap">{r.message}</p>
                            {r.user_email && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{r.user_email}</p>}
                            {r.photo_path && (
                                photos[r.photo_path]
                                    ? <a href={photos[r.photo_path]} target="_blank" rel="noreferrer" className="inline-block mt-2"><img src={photos[r.photo_path]} alt="Captura adjunta" className="max-h-44 rounded-lg" style={{ border: '1px solid var(--border)' }} /></a>
                                    : <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--text-3)' }}><ImageIcon size={12} /> Foto adjunta (cargando...)</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {r.status === 'nuevo' && <button onClick={() => setStatus(r, 'visto')} disabled={busy === r.id} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: '#FFC107', border: '1px solid rgba(255,193,7,0.35)', background: 'rgba(255,193,7,0.08)' }}>Visto</button>}
                                {r.status !== 'resuelto' && <button onClick={() => setStatus(r, 'resuelto')} disabled={busy === r.id} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: '#00ff87', border: '1px solid rgba(0,255,135,0.3)', background: 'rgba(0,255,135,0.08)' }}>Resuelto</button>}
                                {r.status === 'resuelto' && <button onClick={() => setStatus(r, 'visto')} disabled={busy === r.id} className="text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}><Trash2 size={12} /> Reabrir</button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
