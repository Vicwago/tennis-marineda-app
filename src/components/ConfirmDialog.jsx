import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * ConfirmDialog — reemplazo de alert() y confirm() nativos.
 *
 * Props:
 *   open        (bool)     — mostrar/ocultar
 *   title       (string)   — titulo del dialogo
 *   message     (string|node) — cuerpo del dialogo
 *   confirmText (string)   — texto del boton de confirmar (default "Aceptar")
 *   cancelText  (string)   — texto del boton de cancelar (default "Cancelar", null para ocultar)
 *   variant     (string)   — "danger" | "warning" | "info" (default "info")
 *   onConfirm   (fn)       — callback al confirmar
 *   onCancel    (fn)       — callback al cancelar / cerrar
 */
export default function ConfirmDialog({
    open,
    title = 'Confirmar',
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    variant = 'info',
    onConfirm,
    onCancel,
}) {
    const dialogRef = useRef(null);

    // Cerrar con Escape
    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onCancel?.();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onCancel]);

    // Focus trap en el dialogo
    useEffect(() => {
        if (open && dialogRef.current) {
            dialogRef.current.focus();
        }
    }, [open]);

    if (!open) return null;

    const variants = {
        danger: {
            accent: '#E53935',
            bg: 'rgba(229,57,53,0.12)',
            border: 'rgba(229,57,53,0.4)',
            btnBg: 'linear-gradient(135deg, #E53935, #B71C1C)',
        },
        warning: {
            accent: '#F59E0B',
            bg: 'rgba(245,158,11,0.1)',
            border: 'rgba(245,158,11,0.35)',
            btnBg: 'linear-gradient(135deg, #F59E0B, #D97706)',
        },
        info: {
            accent: 'var(--cyan)',
            bg: 'rgba(0,212,255,0.08)',
            border: 'rgba(0,212,255,0.3)',
            btnBg: 'linear-gradient(135deg, #0099cc, #00d4ff)',
        },
    };
    const v = variants[variant] || variants.info;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={onCancel}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="rounded-2xl shadow-2xl max-w-sm w-full outline-none animate-in fade-in zoom-in duration-150"
                style={{ background: 'var(--bg-card)', border: `1px solid ${v.border}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 pb-3">
                    <h3 className="text-base font-bold text-white">{title}</h3>
                    <button
                        onClick={onCancel}
                        className="p-1 rounded-lg transition-colors"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = ''; }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5">
                    <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
                        {message}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-5 pb-5 justify-end">
                    {cancelText && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-lg"
                        style={{ background: v.btnBg, border: `1px solid ${v.accent}` }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = ''; }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook useConfirm — simplifica el uso de ConfirmDialog.
 *
 * Uso:
 *   const { confirm, ConfirmDialogEl } = useConfirm();
 *
 *   // En handler:
 *   const ok = await confirm({ title: '...', message: '...' });
 *   if (ok) { /* hacer algo * / }
 *
 *   // En JSX:
 *   return <>{ConfirmDialogEl}</>;
 */
export function useConfirm() {
    const [state, setState] = React.useState({ open: false, props: {}, resolve: null });

    const confirm = useCallback((props) => {
        return new Promise((resolve) => {
            setState({ open: true, props, resolve });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        state.resolve?.(true);
        setState({ open: false, props: {}, resolve: null });
    }, [state.resolve]);

    const handleCancel = useCallback(() => {
        state.resolve?.(false);
        setState({ open: false, props: {}, resolve: null });
    }, [state.resolve]);

    const ConfirmDialogEl = (
        <ConfirmDialog
            open={state.open}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            {...state.props}
        />
    );

    return { confirm, ConfirmDialogEl };
}
