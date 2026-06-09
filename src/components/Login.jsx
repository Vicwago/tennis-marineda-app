import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import logoUrl from '../assets/logo.png';

export default function Login({ onNavigateToRegister }) {
    const { login, resetPassword } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [slowLoad, setSlowLoad] = useState(false);

    // Modo recuperar contraseña
    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Muestra hint de "servidor arrancando" si tarda más de 8s
    useEffect(() => {
        if (!isLoading) { setSlowLoad(false); return; }
        const t = setTimeout(() => setSlowLoad(true), 8000);
        return () => clearTimeout(t);
    }, [isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(username.trim(), password);
        } catch (err) {
            const msg = err.message || '';
            if (msg === 'LOGIN_TIMEOUT') {
                setError('El servidor tardó demasiado en responder (puede estar arrancando). Espera unos segundos e inténtalo de nuevo.');
            } else if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
                setError('Cuenta pendiente de verificación. Revisa tu correo y haz clic en el enlace de confirmación.');
            } else if (
                msg.toLowerCase().includes('invalid login') ||
                msg.toLowerCase().includes('invalid credentials') ||
                msg.toLowerCase().includes('wrong password') ||
                msg.toLowerCase().includes('invalid email or password')
            ) {
                setError('Email o contraseña incorrectos. Comprueba tus datos.');
            } else if (msg.toLowerCase().includes('too many requests')) {
                setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
            } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
                setError('Sin conexión. Comprueba tu red e inténtalo de nuevo.');
            } else {
                setError(msg || 'Error al iniciar sesión. Inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetEmail.trim()) { setError('Introduce tu email.'); return; }
        setError('');
        setResetLoading(true);
        try {
            await resetPassword(resetEmail);
            setResetSent(true);
        } catch (err) {
            const msg = err.message || '';
            if (msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('no user')) {
                setError('No encontramos ninguna cuenta con ese email.');
            } else {
                setError(msg || 'No se pudo enviar el email. Inténtalo de nuevo.');
            }
        } finally {
            setResetLoading(false);
        }
    };

    // ── Pantalla éxito recuperación ──
    if (forgotMode && resetSent) {
        return (
            <div className="min-h-screen cyber-grid-bg flex items-center justify-center p-4 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)' }} />
                </div>
                <div className="glass-card w-full max-w-md rounded-2xl p-8 relative z-10 fade-up text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(0,212,255,0.12)', border: '2px solid rgba(0,212,255,0.4)' }}>
                        <CheckCircle size={32} style={{ color: 'var(--cyan)' }} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Email enviado</h2>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>
                        Si hay una cuenta con <span className="font-bold text-white">{resetEmail}</span>, recibirás un enlace para restablecer tu contraseña.
                    </p>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>Revisa también la carpeta de spam.</p>
                    <button
                        onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); setError(''); }}
                        className="btn-cyber w-full flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={16} /> Volver al login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen cyber-grid-bg flex items-center justify-center p-4 relative overflow-hidden">

            {/* ── Orbes de fondo ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.12) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)' }} />
                <div className="scan-line" />
            </div>

            {/* ── Card principal ── */}
            <div className="glass-card w-full max-w-md rounded-2xl p-8 relative z-10 fade-up">

                {/* Borde superior brillante */}
                <div className="absolute top-0 left-8 right-8 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)' }} />

                {/* Logo + título */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-5 rounded-2xl p-2 shadow-lg relative"
                        style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.15), rgba(0,212,255,0.08))', border: '1px solid rgba(229,57,53,0.3)' }}>
                        <img
                            src={logoUrl}
                            alt="Escuela de Tenis Marineda"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        {forgotMode ? 'Recuperar contraseña' : 'Bienvenido'}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                        Escuela de Tenis{' '}
                        <span className="text-brand-gradient font-bold">Marineda</span>
                    </p>
                </div>

                {error && (
                    <div className="p-3 rounded-xl text-sm text-center fade-up mb-4"
                        style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', color: '#fca5a5' }}>
                        {error}
                    </div>
                )}

                {/* ── Modo recuperar contraseña ── */}
                {forgotMode ? (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Introduce tu email y te enviamos un enlace para crear una nueva contraseña.
                        </p>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider ml-1" style={{ color: 'var(--text-3)' }}>
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: resetEmail ? 'var(--cyan)' : 'var(--text-3)' }} />
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={e => { setResetEmail(e.target.value); setError(''); }}
                                    className="cyber-input"
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={resetLoading}
                            className="btn-cyber w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {resetLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Enviar enlace <ArrowRight className="w-5 h-5" /></>}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setForgotMode(false); setError(''); }}
                            className="w-full flex items-center justify-center gap-2 text-sm font-medium mt-1 py-2 rounded-xl transition-colors"
                            style={{ color: 'var(--text-3)' }}
                        >
                            <ArrowLeft size={16} /> Volver al login
                        </button>
                    </form>
                ) : (
                    /* ── Formulario de login ── */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider ml-1"
                                style={{ color: 'var(--text-3)' }}>
                                Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors"
                                    style={{ color: username ? 'var(--cyan)' : 'var(--text-3)' }} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="cyber-input"
                                    placeholder="tu@email.com"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider ml-1"
                                style={{ color: 'var(--text-3)' }}>
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors"
                                    style={{ color: password ? 'var(--cyan)' : 'var(--text-3)' }} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="cyber-input"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {/* Hint si tarda mucho (Supabase cold start) */}
                        {slowLoad && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs fade-up"
                                style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-2)' }}>
                                <Loader2 className="animate-spin w-4 h-4 shrink-0" style={{ color: 'var(--cyan)' }} />
                                Conectando con el servidor... La primera vez del día puede tardar hasta 30 segundos.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-cyber w-full flex items-center justify-center gap-2 mt-6 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin w-5 h-5" />
                            ) : (
                                <>
                                    Entrar al sistema
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => { setForgotMode(true); setError(''); setResetEmail(username); }}
                                className="text-xs transition-colors hover:underline"
                                style={{ color: 'var(--text-3)' }}
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 pt-6 text-center space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                    {onNavigateToRegister && !forgotMode && (
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                            ¿Eres nuevo?{' '}
                            <button
                                onClick={onNavigateToRegister}
                                className="font-bold transition-colors hover:underline"
                                style={{ color: 'var(--cyan)' }}
                            >
                                Crea tu cuenta aquí
                            </button>
                        </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        Escuela de Tenis Marineda &copy; {new Date().getFullYear()}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        Hecho por{' '}
                        <a href="https://victormago.com" target="_blank" rel="noopener noreferrer"
                            className="font-bold transition-opacity hover:opacity-80"
                            style={{ color: '#76c1ff' }}>
                            Víctor Mago
                        </a>
                        {' · '}
                        <a href="https://norteia.es" target="_blank" rel="noopener noreferrer"
                            className="font-bold transition-opacity hover:opacity-80"
                            style={{ color: '#76c1ff' }}>
                            NorteIA
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
