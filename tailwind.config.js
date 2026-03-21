/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Identidad del club (se mantiene) ──────────────────────
                brand: {
                    red: '#E53935',
                    yellow: '#FDD835',
                    dark: '#B71C1C',
                },
                // ── Paleta cyber/futurista ─────────────────────────────────
                cyber: {
                    // Fondos
                    deepest:  '#03060f',   // negro espacio
                    deep:     '#060d1a',   // fondo principal
                    dark:     '#0a1628',   // sidebar / nav
                    card:     '#0d1f38',   // fondo de tarjetas
                    muted:    '#112240',   // tarjetas secundarias
                    // Acentos
                    blue:     '#00d4ff',   // cian eléctrico
                    blueDim:  '#0099cc',   // cian oscuro
                    purple:   '#8b5cf6',   // violeta neón
                    green:    '#00ff87',   // verde neón
                    // Bordes
                    border:   'rgba(0, 212, 255, 0.12)',
                    borderHi: 'rgba(0, 212, 255, 0.35)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            backgroundImage: {
                // Gradiente de fondo general
                'cyber-gradient': 'linear-gradient(135deg, #060d1a 0%, #03060f 50%, #0a0517 100%)',
                // Gradiente para botones primarios
                'btn-primary': 'linear-gradient(135deg, #E53935, #B71C1C)',
                // Brillo sutil en tarjetas
                'card-shine': 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, transparent 60%)',
            },
            boxShadow: {
                'cyber':     '0 0 20px rgba(0, 212, 255, 0.15), 0 4px 24px rgba(0,0,0,0.4)',
                'cyber-sm':  '0 0 10px rgba(0, 212, 255, 0.10)',
                'neon-red':  '0 0 20px rgba(229, 57, 53, 0.30)',
                'neon-blue': '0 0 24px rgba(0, 212, 255, 0.25)',
                'card':      '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
            },
            animation: {
                'scan':       'scan 3s linear infinite',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'float':      'float 6s ease-in-out infinite',
            },
            keyframes: {
                scan: {
                    '0%':   { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 10px rgba(0,212,255,0.2)' },
                    '50%':      { opacity: '0.7', boxShadow: '0 0 24px rgba(0,212,255,0.5)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%':      { transform: 'translateY(-8px)' },
                },
            },
        },
    },
    plugins: [],
}
