import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Share, MoreVertical, PlusSquare, CheckCircle, Smartphone } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import CreditFooter from './CreditFooter';

// Página pública de invitación: /unirse?codigo=XXXX
// Es el enlace que los administradores pasan por WhatsApp. Lleva a crear la cuenta con el
// código ya puesto y explica cómo "instalar" la web como app en el móvil.
export default function Unirse({ onNavigate, isAuthenticated }) {
    const codigo = useMemo(() => (new URLSearchParams(window.location.search).get('codigo') || '').toUpperCase(), []);
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
    const [installPrompt, setInstallPrompt] = useState(window.__pwaInstallPrompt || null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        const onPrompt = (e) => { e.preventDefault(); window.__pwaInstallPrompt = e; setInstallPrompt(e); };
        const onInstalled = () => setInstalled(true);
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
    }, []);

    const install = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        try { const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') setInstalled(true); } catch { /* cancelado */ }
        window.__pwaInstallPrompt = null; setInstallPrompt(null);
    };

    const registerPath = codigo ? `/register?codigo=${encodeURIComponent(codigo)}` : '/register';

    const Step = ({ n, title, text }) => (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: 'rgba(229,57,53,0.18)', color: '#ff6b6b', border: '1px solid rgba(229,57,53,0.4)' }}>{n}</div>
            <div><p className="font-bold text-white leading-tight">{title}</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{text}</p></div>
        </div>
    );

    return (
        <div className="min-h-screen cyber-grid-bg flex items-center justify-center p-4 relative overflow-hidden safe-screen">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(229,57,53,0.14) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)' }} />
            </div>

            <div className="glass-card w-full max-w-md rounded-2xl p-6 sm:p-8 relative z-10 fade-up">
                <div className="text-center mb-6">
                    <div className="inline-block rounded-2xl p-3 mb-4" style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.15), rgba(0,212,255,0.08))', border: '1px solid rgba(229,57,53,0.3)' }}>
                        <img src={logoUrl} alt="Escuela de Tenis Marineda" className="h-14 w-auto" />
                    </div>
                    <h1 className="text-2xl font-bold text-white leading-tight">Únete a la liga</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Rankings de tenis y pádel de la Escuela de Tenis Marineda. Tu partido de cada semana, en el móvil.</p>
                </div>

                <div className="space-y-3 mb-6">
                    <Step n="1" title="Crea tu cuenta" text={codigo ? 'Un minuto. El código de invitación ya va incluido.' : 'Un minuto. Pide el código de invitación a los monitores.'} />
                    <Step n="2" title="Marca tus horas" text={'Cada semana, en "Mi Disponibilidad", las horas a las que puedes jugar.'} />
                    <Step n="3" title="Mira tu partido" text="Rival, día, hora y pista. Te avisa la campana cuando se publica la jornada." />
                </div>

                {isAuthenticated ? (
                    <button onClick={() => onNavigate('/')} className="btn-cyber w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2">
                        Ya tienes cuenta · Entrar en la app <ArrowRight size={18} />
                    </button>
                ) : (
                    <>
                        <button onClick={() => onNavigate(registerPath)} className="btn-cyber w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2">
                            Crear mi cuenta <ArrowRight size={18} />
                        </button>
                        <p className="text-center text-sm mt-3" style={{ color: 'var(--text-3)' }}>
                            ¿Ya tienes cuenta?{' '}
                            <button onClick={() => onNavigate('/')} className="font-bold hover:underline" style={{ color: 'var(--cyan)' }}>Entrar</button>
                        </p>
                    </>
                )}

                {/* Instalar como app */}
                <div className="mt-7 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="font-bold text-white flex items-center gap-2 mb-2"><Smartphone size={18} style={{ color: 'var(--cyan)' }} /> Tenla como una app en tu móvil</p>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>No está en las tiendas: se instala desde el navegador en 10 segundos y queda con su icono, a pantalla completa.</p>

                    {standalone || installed ? (
                        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.25)', color: '#00ff87' }}>
                            <CheckCircle size={16} /> Ya la tienes instalada.
                        </div>
                    ) : installPrompt ? (
                        <button onClick={install} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.4)', color: 'var(--cyan)' }}>
                            <PlusSquare size={18} /> Instalar la app ahora
                        </button>
                    ) : isIOS ? (
                        <ol className="text-sm space-y-1.5" style={{ color: 'var(--text-2)' }}>
                            <li>1. Abre este enlace en <b className="text-white">Safari</b> (no en Instagram ni WhatsApp).</li>
                            <li>2. Pulsa el botón <b className="text-white">Compartir</b> <Share size={14} className="inline" /> (abajo, el cuadrado con la flecha).</li>
                            <li>3. Elige <b className="text-white">"Añadir a pantalla de inicio"</b> y luego <b className="text-white">Añadir</b>.</li>
                        </ol>
                    ) : (
                        <ol className="text-sm space-y-1.5" style={{ color: 'var(--text-2)' }}>
                            <li>1. Abre este enlace en <b className="text-white">Chrome</b> (no dentro de WhatsApp: pulsa los tres puntos y "Abrir en Chrome").</li>
                            <li>2. Pulsa el menú <MoreVertical size={14} className="inline" /> (tres puntos, arriba a la derecha).</li>
                            <li>3. Elige <b className="text-white">"Instalar aplicación"</b> o <b className="text-white">"Añadir a pantalla de inicio"</b>.</li>
                        </ol>
                    )}
                    {!isIOS && !isAndroid && !standalone && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>En el ordenador también funciona: Chrome muestra un icono de "Instalar" en la barra de direcciones.</p>
                    )}
                </div>

                <CreditFooter className="mt-6" />
            </div>
        </div>
    );
}
