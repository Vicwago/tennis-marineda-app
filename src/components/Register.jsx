import React, { useState } from 'react';
import { User, Mail, Lock, Activity, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register({ onNavigateToLogin }) {
    const { register } = useAuth();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        sport: 'tennis',
        category: 'adults'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);

    const isTennis = form.sport === 'tennis';

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const validate = () => {
        if (!form.name.trim()) return 'El nombre completo es obligatorio.';
        if (form.name.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
        if (!form.email.trim()) return 'El email es obligatorio.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'El email no es válido.';
        if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
        if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setIsLoading(true);
        try {
            await register(
                form.name.trim(),
                form.email.trim(),
                form.password,
                form.sport,
                isTennis ? form.category : null
            );
            setSuccess(true);
        } catch (err) {
            if (err.needsConfirmation || err.message === 'CONFIRM_EMAIL') {
                // Cuenta creada pero requiere confirmación de email
                setNeedsConfirmation(true);
            } else if (err.message?.includes('already registered') || err.message?.includes('User already registered')) {
                setError('Este email ya tiene una cuenta. Inicia sesión.');
            } else {
                setError(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Pantalla: confirmación de email requerida por Supabase
    if (needsConfirmation) {
        return (
            <div className="min-h-screen flex items-center justify-center cyber-grid-bg px-4 relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--cyan)' }} />
                <div className="glass-card w-full max-w-md p-10 rounded-2xl relative text-center fade-up">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(0,212,255,0.12)', border: '2px solid rgba(0,212,255,0.4)' }}>
                        <Mail size={40} style={{ color: 'var(--cyan)' }} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Confirma tu email</h2>
                    <p style={{ color: 'var(--text-2)' }} className="mb-2">
                        Te hemos enviado un email a <span className="font-bold text-white">{form.email}</span>.
                    </p>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
                        Abre el enlace del email para activar tu cuenta y luego inicia sesión aquí.
                    </p>
                    <button onClick={onNavigateToLogin} className="btn-cyber w-full py-3 rounded-xl font-bold text-base">
                        Ir al Login
                    </button>
                    <p className="text-xs mt-4" style={{ color: 'var(--text-3)' }}>
                        ¿No recibiste el email? Revisa la carpeta de spam.
                    </p>
                </div>
            </div>
        );
    }

    // Pantalla: registro exitoso (sin confirmación requerida)
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center cyber-grid-bg px-4 relative overflow-hidden">
                {/* Glow orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--cyan)' }} />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8 pointer-events-none" style={{ background: '#E53935' }} />

                <div className="glass-card w-full max-w-md p-10 rounded-2xl relative text-center fade-up">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(0,255,135,0.12)', border: '2px solid rgba(0,255,135,0.4)' }}>
                        <CheckCircle size={40} style={{ color: '#00ff87' }} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">¡Cuenta creada!</h2>
                    <p style={{ color: 'var(--text-2)' }} className="mb-2">
                        Bienvenido/a a <span className="font-bold text-white">Escuela de Tenis Marineda</span>.
                    </p>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
                        Tu perfil y equipo han sido creados. Ya puedes acceder a la app.
                    </p>
                    <button onClick={onNavigateToLogin} className="btn-cyber w-full py-3 rounded-xl font-bold text-base">
                        Ir al Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center cyber-grid-bg px-4 relative overflow-hidden">
            {/* Scan line */}
            <div className="scan-line pointer-events-none" />

            {/* Glow orbs */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: 'var(--cyan)' }} />
            <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-8 pointer-events-none" style={{ background: '#8b5cf6' }} />

            <div className="glass-card w-full max-w-md p-8 rounded-2xl relative fade-up">
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)' }} />

                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl p-2 flex items-center justify-center shrink-0" style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.35)' }}>
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-brand-gradient leading-none">Escuela de Tenis</h1>
                        <p className="text-xs font-bold" style={{ color: 'var(--cyan)' }}>Marineda — Nuevo Jugador</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">Crear cuenta</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Únete a la escuela y gestiona tus partidos.</p>

                {error && (
                    <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.3)', color: '#ff8a80' }}>
                        <span className="text-base">⚠</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Nombre completo</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: form.name ? 'var(--cyan)' : 'var(--text-3)' }} />
                            <input
                                type="text"
                                placeholder="Tu nombre y apellido"
                                value={form.name}
                                onChange={e => handleChange('name', e.target.value)}
                                className="cyber-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" style={{ color: form.email ? 'var(--cyan)' : 'var(--text-3)' }} />
                            <input
                                type="email"
                                placeholder="tu@email.com"
                                value={form.email}
                                onChange={e => handleChange('email', e.target.value)}
                                className="cyber-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Deporte */}
                    <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Deporte</label>
                        <div className="relative">
                            <Activity size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cyan)' }} />
                            <select
                                value={form.sport}
                                onChange={e => handleChange('sport', e.target.value)}
                                className="cyber-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                            >
                                <option value="padel">🏓 Pádel</option>
                                <option value="tennis">🎾 Tenis</option>
                            </select>
                        </div>
                    </div>

                    {/* Categoría (solo tenis) */}
                    {isTennis && (
                        <div>
                            <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Categoría</label>
                            <select
                                value={form.category}
                                onChange={e => handleChange('category', e.target.value)}
                                className="cyber-input w-full px-4 py-3 rounded-xl text-sm"
                            >
                                <option value="adults">Adultos</option>
                                <option value="juveniles">Juveniles</option>
                            </select>
                        </div>
                    )}

                    {/* Contraseña */}
                    <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: form.password ? 'var(--cyan)' : 'var(--text-3)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mínimo 6 caracteres"
                                value={form.password}
                                onChange={e => handleChange('password', e.target.value)}
                                className="cyber-input w-full pl-9 pr-10 py-3 rounded-xl text-sm"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-3)' }}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Confirmar contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: form.confirmPassword && form.confirmPassword === form.password ? '#00ff87' : 'var(--text-3)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Repite la contraseña"
                                value={form.confirmPassword}
                                onChange={e => handleChange('confirmPassword', e.target.value)}
                                className="cyber-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-cyber w-full py-3.5 rounded-xl font-bold text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Creando cuenta...
                            </span>
                        ) : 'Crear cuenta'}
                    </button>
                </form>

                <p className="text-center text-sm mt-6" style={{ color: 'var(--text-3)' }}>
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={onNavigateToLogin} className="font-bold transition-colors hover:underline" style={{ color: 'var(--cyan)' }}>
                        Inicia sesión
                    </button>
                </p>

                <p className="text-center text-xs mt-8" style={{ color: 'var(--text-3)' }}>
                    Escuela de Tenis Marineda © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
