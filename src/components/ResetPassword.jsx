import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';

// Pantalla a la que llega el jugador desde el enlace de "¿Olvidaste tu contraseña?"
export default function ResetPassword({ onDone }) {
    const { updatePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const validate = () => {
        if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'La contraseña debe incluir letras y números.';
        if (password !== confirm) return 'Las contraseñas no coinciden.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validate();
        if (v) { setError(v); return; }
        setError('');
        setLoading(true);
        try {
            await updatePassword(password);
            setDone(true);
        } catch (err) {
            setError(err.message?.includes('same password') ? 'La nueva contraseña no puede ser igual a la anterior.' : (err.message || 'No se pudo cambiar la contraseña.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center cyber-grid-bg px-4 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--cyan)' }} />
            <div className="glass-card w-full max-w-md p-8 rounded-2xl relative fade-up">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl p-2 flex items-center justify-center shrink-0" style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.35)' }}>
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-brand-gradient leading-none">Escuela de Tenis</h1>
                        <p className="text-xs font-bold" style={{ color: 'var(--cyan)' }}>Marineda — Nueva contraseña</p>
                    </div>
                </div>

                {done ? (
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(0,255,135,0.12)', border: '2px solid rgba(0,255,135,0.4)' }}>
                            <CheckCircle size={32} style={{ color: '#00ff87' }} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Contraseña actualizada</h2>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Ya puedes usar la app con tu nueva contraseña.</p>
                        <button onClick={onDone} className="btn-cyber w-full py-3 rounded-xl font-bold">Entrar en la app</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <h2 className="text-2xl font-bold text-white mb-1">Crea tu nueva contraseña</h2>
                        <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>Mínimo 8 caracteres, con letras y números.</p>
                        {error && (
                            <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.3)', color: '#ff8a80' }}>⚠ {error}</div>
                        )}
                        <div>
                            <label htmlFor="new-password" className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Nueva contraseña</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                                <input id="new-password" type={show ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="cyber-input w-full pl-9 pr-10 py-3 rounded-xl text-base" autoComplete="new-password" required />
                                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Repite la contraseña</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
                                <input id="confirm-password" type={show ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} className="cyber-input w-full pl-9 pr-4 py-3 rounded-xl text-base" autoComplete="new-password" required />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-cyber w-full py-3.5 rounded-xl font-bold text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Guardando...</span> : 'Guardar contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
