import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Login({ onNavigateToRegister }) {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

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
                            src="/src/assets/logo.png"
                            alt="Escuela de Tenis Marineda"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">Bienvenido</h1>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                        Escuela de Tenis{' '}
                        <span className="text-brand-gradient font-bold">Marineda</span>
                    </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl text-sm text-center fade-up"
                            style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', color: '#fca5a5' }}>
                            {error}
                        </div>
                    )}

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
                </form>

                <div className="mt-6 pt-6 text-center space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                    {onNavigateToRegister && (
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
