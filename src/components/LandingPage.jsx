import React from 'react';
import { useGame } from '../context/GameContext';
import { ShieldCheck, User, Zap, Activity, BarChart2, Calendar } from 'lucide-react';

// Mini tarjeta de feature
const Feature = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--cyan)' }} />
        <span>{text}</span>
    </div>
);

export default function LandingPage() {
    const { selectMode } = useGame();

    return (
        <div className="min-h-screen cyber-grid-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* ── Orbes decorativos ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full -translate-y-1/2"
                    style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full translate-y-1/2"
                    style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)' }} />
                <div className="scan-line" />
            </div>

            {/* ── Header ── */}
            <div className="mb-12 text-center z-10 fade-up">
                <div className="w-28 h-28 mx-auto mb-6 rounded-2xl p-2 shadow-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.15), rgba(0,212,255,0.08))', border: '1px solid rgba(229,57,53,0.25)' }}>
                    <img
                        src="/logo.png"
                        alt="Escuela de Tenis Marineda"
                        className="w-full h-full object-contain"
                    />
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                    Escuela de Tenis{' '}
                    <span className="text-brand-gradient">Marineda</span>
                </h1>
                <p className="text-lg" style={{ color: 'var(--text-2)' }}>
                    Sistema de Gestión de Rankings y Torneos
                </p>

                {/* Línea decorativa */}
                <div className="w-32 h-px mx-auto mt-5" style={{ background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)' }} />
            </div>

            {/* ── Cards de selección de modo ── */}
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6 z-10">

                {/* ── Organizador / Admin ── */}
                <div
                    className="glass-card-hover rounded-2xl p-8 cursor-pointer group relative overflow-hidden"
                    onClick={() => selectMode('padel', 'admin')}
                >
                    {/* Glow de fondo en hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(229,57,53,0.08) 0%, transparent 70%)' }} />

                    {/* Borde superior rojo */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(229,57,53,0.8), transparent)' }} />

                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                        style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)' }}>
                        <ShieldCheck className="w-7 h-7" style={{ color: '#E53935' }} />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Soy Organizador</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                        Acceso completo para gestionar torneos, generar jornadas, editar resultados y configurar pistas.
                    </p>

                    <div className="space-y-2 mb-6">
                        <Feature icon={Calendar} text="Generar jornadas automáticamente" />
                        <Feature icon={BarChart2} text="Gestionar ranking y resultados" />
                        <Feature icon={Activity} text="Configurar pistas y horarios" />
                    </div>

                    <div className="space-y-2">
                        <button
                            className="btn-cyber w-full flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('padel', 'admin'); }}
                        >
                            <Zap className="w-4 h-4" /> Gestionar Pádel
                        </button>
                        <button
                            className="btn-cyber-outline w-full flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('tennis', 'admin'); }}
                        >
                            <Zap className="w-4 h-4" /> Gestionar Tenis
                        </button>
                    </div>
                </div>

                {/* ── Jugador ── */}
                <div className="glass-card-hover rounded-2xl p-8 cursor-pointer group relative overflow-hidden">

                    {/* Glow de fondo cian en hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'radial-gradient(circle at 70% 30%, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />

                    {/* Borde superior cian */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)' }} />

                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                        style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                        <User className="w-7 h-7" style={{ color: 'var(--cyan)' }} />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Soy Jugador</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
                        Consulta tus próximos partidos, actualiza tu disponibilidad y revisa tu posición en el ranking.
                    </p>

                    <div className="space-y-2 mb-6">
                        <Feature icon={Calendar} text="Ver tus próximos partidos" />
                        <Feature icon={BarChart2} text="Consultar tu ranking" />
                        <Feature icon={Activity} text="Actualizar disponibilidad" />
                    </div>

                    <div className="space-y-2">
                        <button
                            className="btn-cyber w-full flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('padel', 'player'); }}
                        >
                            <Zap className="w-4 h-4" /> Ver Pádel
                        </button>
                        <button
                            className="btn-cyber-outline w-full flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('tennis', 'player'); }}
                        >
                            <Zap className="w-4 h-4" /> Ver Tenis
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <p className="mt-10 text-xs z-10" style={{ color: 'var(--text-3)' }}>
                Escuela de Tenis Marineda &copy; {new Date().getFullYear()}
            </p>
        </div>
    );
}
