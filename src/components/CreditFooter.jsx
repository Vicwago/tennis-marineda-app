import React from 'react';

// Crédito del autor: visible en login, registro, menú lateral y menú móvil.
// Enlaces a la web y redes de Víctor Mago y a NorteIA.
const LINKS = [
    { label: 'victormago.com', href: 'https://victormago.com', title: 'Web de Víctor Mago' },
    { label: '@vicwago', href: 'https://www.instagram.com/vicwago', title: 'Instagram de Víctor Mago' },
    { label: 'NorteIA', href: 'https://norteia.es', title: 'NorteIA · IA para negocios' },
];

const CreditFooter = ({ compact = false, className = '' }) => (
    <div className={`text-center ${className}`}>
        <p className="text-xs" style={{ color: 'var(--text-3, #94a3b8)' }}>
            Hecho por{' '}
            <a href="https://victormago.com" target="_blank" rel="noopener noreferrer"
                className="font-bold transition-opacity hover:opacity-80" style={{ color: '#76c1ff' }}>
                Víctor Mago
            </a>
            {compact && <>{' · '}<a href="https://norteia.es" target="_blank" rel="noopener noreferrer" className="font-bold transition-opacity hover:opacity-80" style={{ color: '#76c1ff' }}>NorteIA</a></>}
        </p>
        {!compact && (
            <p className="text-[11px] mt-1 flex flex-wrap justify-center gap-x-2" style={{ color: 'var(--text-3, #94a3b8)' }}>
                {LINKS.map((l, i) => (
                    <React.Fragment key={l.href}>
                        {i > 0 && <span>·</span>}
                        <a href={l.href} target="_blank" rel="noopener noreferrer" title={l.title}
                            className="transition-opacity hover:opacity-80" style={{ color: '#76c1ff' }}>{l.label}</a>
                    </React.Fragment>
                ))}
            </p>
        )}
    </div>
);

export default CreditFooter;
