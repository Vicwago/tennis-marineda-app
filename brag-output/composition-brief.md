# Hyperframes Composition Brief: Escuela de Tenis Marineda

## Objective
Create a short launch-style brag video for the Escuela de Tenis Marineda app.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: vertical — 1080x1920 (principal). Después re-render 1:1 1080x1080 y 16:9 1920x1080 desde la misma composición.
- Duration: 20 seconds

## Source Material
- Project root: `C:\Users\victor\.gemini\antigravity\scratch\tennis-padel-app`
- Primary files read: `index.html`, `tailwind.config.js`, `src/components/PadelMatchApp.jsx` (ranking + generador), `src/components/Login.jsx`
- Product name: Escuela de Tenis Marineda (app de ranking de tenis y pádel)
- Tagline / strongest claim: "El ranking de tu club, vivo." + "Genera las jornadas solo: rival, pista y hora, sin repetir."
- Key UI to recreate: (1) tarjeta de login "Bienvenido · Escuela de Tenis Marineda" con botón rojo; (2) botón rojo **Generar Jornada** + tarjetas de partido `A vs B · Pista N · HH:MM`; (3) tabla de ranking `Pos · Jugador · PJ · Puntos` con top-3 en verde neón `⬆ Asciende de división`.
- Copy that must appear verbatim:
  - "El ranking de tu club, vivo."
  - "Generar Jornada"
  - "Rival, pista y hora. Sin repetir."
  - "⬆ Asciende de división"
  - "Su club. Su ranking. Su app."
  - "NorteIA · victormago.com"

## Creative Direction
- Tone preset: cinematic + app-store (mezcla)
- Creative direction: "film de producto premium con estética cyber-neón de club deportivo"
- Interpretation: atmósfera cinematográfica (fondo espacial, glows cian, swell, reveals con clase) + demo app-store (tarjetas limpias que entran ordenadas). Movimiento con clase, nunca caótico. Holds legibles.
- Angle: El trabajo invisible de un club —cuadrar rival, pista y hora cada semana sin repetir— reducido a un botón. El vídeo vende la sensación de pulsar "Generar Jornada" y ver el caos ordenarse solo.
- Hook: fondo cyber con rejilla cian que respira + scan-line; slam de "El ranking de tu club, vivo." con glow cian; debajo en mono `ESCUELA DE TENIS MARINEDA`.
- Outro / punchline: logo/nombre del club + "Su club. Su ranking. Su app." + firma `NorteIA · victormago.com`.
- Avoid:
  - Generic SaaS language ("streamline your workflow", etc.)
  - Abstract filler visuals / partículas genéricas / barras de waveform
  - Rediseñar la marca del club (respeta su paleta)
  - **Nombres reales de jugadores** — usa datos FICTICIOS plausibles (p.ej. "Álvaro C.", "Marta R.", "Diego S.", "Lucía P.", "Iván M.", "Nerea G.")

## Visual Identity
- Background: `#060d1a` → `#03060f` (cyber-gradient, linear 135deg), grid cian sutil `rgba(0,212,255,0.12)`
- Text: `#ffffff` + mutes azulados `rgba(255,255,255,0.6)`
- Accent: `#00d4ff` (cian eléctrico) — glows, bordes; `#00ff87` (verde neón) para ascensos/positivo
- Club: botón primario gradiente `#E53935 → #B71C1C`; amarillo `#FDD835` como detalle puntual
- Display font: Inter (700/800). Body/data font: JetBrains Mono (500). Ambas por Google Fonts o fallback system.
- Visual references: sombras neón (`0 0 24px rgba(0,212,255,0.25)`), tarjetas glass con borde cian, animación scan-line vertical, tabla de ranking con fila top-3 resaltada en verde.

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.5s — slam "El ranking de tu club, vivo." + `ESCUELA DE TENIS MARINEDA`, grid cian + scan-line.
2. El lío → la app — 3.5s — 3 burbujas de duda que se apagan → tarjeta de login real con botón rojo. "Cada semana, el mismo lío. Hasta ahora."
3. Generar Jornada (centerpiece) — 5s — cursor pulsa botón rojo; 3 tarjetas de partido entran una a una (`A vs B · Pista N · HH:MM`); label "Rival, pista y hora. Sin repetir."
4. El ranking sube — 5s — tabla ranking; count-up `+4`; una fila salta al top-3 y se pinta verde `⬆ Asciende de división`. "Resultados en directo."
5. Outro — 4s — logo/nombre club + "Su club. Su ranking. Su app." + `NorteIA · victormago.com`, glow cian y fade.

Durations sum = 20s.

## Audio
- Audio role: cinematic support con arranque fuerte, bed app-store bajo la demo
- Audio arc: slam inicial fuerte → bed sostenido bajo la demo con accents motion-matched → swell final en el logo con fade-out
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120 BPM, cues en `assets/music/cues/`)
- Music treatment: entra en el hook; volumen medio bajo durante la demo (que no tape lectura); swell + fade-out en el outro
- Music cue guidance: cue file bundled (ver `.music-cues.md`). Beat grid cada ~0.5s desde 3.02s. Para las 3 tarjetas de la escena 3, snap a beats ALTERNOS (~1s aparte) para que se lean; strong cues fuertes 16-24s. Lock 1-3 strong cues: (a) slam del hook, (b) clic de "Generar Jornada", (c) salto al top-3.
- Audio-reactive treatment: subtle — el glow cian del fondo y la "presencia" de las tarjetas respiran con el bass; NADA de waveform/equalizer/partículas.
- Audio-coupled moments:
  - Escena 3 clic del botón + 3 whooshes de tarjeta (beat-grid alterno) + chime al completar el set
  - Escena 4 ticks del count-up `+4` + ping en el ascenso
  - Escena 5 hit seco en el logo, cola musical que se apaga
- SFX selection guidance: usa `assets/sfx/` (interface/ui para clic y whoosh de tarjeta, impact para el logo). Motion-matched, restraint.
- SFX analysis guidance: `assets/sfx/sfx-analysis.md` — prefiere sonidos de bajo riesgo de alta frecuencia para lo repetido.
- Exact SFX choice: Hyperframes elige archivos, timestamps, densidad y volumen según la animación real.
- Audio files: copiar música (y SFX elegidos) a `brag-output/composition/assets/`.

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. This is the /brag workflow — do NOT enter the hyperframes entry-point intent interview or the generic promo/launch-video workflow.

Requirements:
- Show at least one real UI/copy/visual from the project (login card + ranking table + Generar Jornada button all qualify).
- Keep all text readable (respect reading-time floors; holds over fast beats).
- 15-25s total (target 20s).
- Include the music/SFX layer; at least one element subtly audio-reactive (or document extraction failure).
- Beat-lock 1-3 major tweens to strong cues (±0.15s), mark `// beat-locked`. Sequential cards snap to alternate beats (±0.10s), mark `// beat-grid`.
- Run `npx hyperframes lint`, `validate`, `inspect` (all 0 errors) before any render. Render is user-gated: produce a DRAFT for review first.
