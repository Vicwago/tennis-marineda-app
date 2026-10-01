# Brag Plan: Escuela de Tenis Marineda

## What is this app?
Una PWA que gestiona el ranking de tenis y pádel de un club real: los jugadores marcan su disponibilidad, el sistema **genera las jornadas solo** (rival, pista y hora, sin repetir rivales y respetando la disponibilidad y las pistas libres), y el ranking se actualiza en directo cuando se registran los resultados.

## The angle
El "trabajo invisible" de un club deportivo — cuadrar quién juega contra quién, cuándo y en qué pista cada semana — reducido a **un botón**. El vídeo no vende "una app de tenis": vende la sensación de pulsar *Generar Jornada* y ver cómo el caos se ordena solo. Cinematográfico en la atmósfera (paleta cyber-neón, scan-lines), limpio y de producto en la demostración (tarjetas de función que entran una a una).

## Hook (first 2-3 seconds)
Pantalla negra espacial con rejilla cian que respira. Slam de tipografía: **"El ranking de tu club, vivo."** con glow cian y una scan-line que baja. Debajo, en mono, `ESCUELA DE TENIS MARINEDA`. Establece paleta, tono y promesa en 2,5s.

## Key moments (the middle)
- **Generar Jornada** — un cursor pulsa el botón rojo del club; tres tarjetas de partido entran una a una con *whoosh*: `Rival · Pista · Hora`. Subtítulo: "Sin repetir rivales. Respetando la disponibilidad."
- **El ranking sube** — tabla real (Pos · Jugador · PJ · Puntos); se registra un resultado, `+4` sube en un contador, una fila salta al top-3 y se pinta de verde neón: **⬆ Asciende de división**.
- **Disponibilidad** (breve) — el candado pasa de `🔓 ABIERTA` a `🔒 BLOQUEADA`: el club decide cuándo se cierra la semana.

## Outro / punchline
Logo del club sobre el fondo cyber. Línea: **"Su club. Su ranking. Su app."** Firma: `NorteIA · victormago.com`. Swell final y fundido.

## User flow worth showing
Entry → key action → result:
1. Jugador marca su **disponibilidad** (grid de horas).
2. Admin pulsa **Generar Jornada** → aparecen los partidos (rival, pista, hora).
3. Se registra el resultado → **el ranking se actualiza** y alguien asciende.
Los datos de jugadores son **ficticios** (nombres inventados) — nada real de la BD sale en pantalla.

## Tone
- Preset: cinematic + app-store (mezcla pedida por el usuario)
- Creative direction: "film de producto premium con estética cyber-neón de club deportivo"
- Interpretation: atmósfera cinematográfica (fondo espacial, glows, swell musical, reveals dramáticos) pero la demostración del producto es app-store: tarjetas limpias que entran ordenadas, sin ruido. Movimiento con clase, no caótico.

## Format: vertical — 1080x1920
(principal para Reels/Stories; luego se re-renderiza 1:1 1080x1080 y 16:9 1920x1080 desde la misma composición para feed y LinkedIn/web)
## Duration: 30s (v2 — antes 20s; se alargó a petición del usuario para que todo se note más y se añadió la escena de notificación al jugador)

## Visual identity (from the project)
- Background: `#060d1a` → `#03060f` (cyber-gradient), grid cian sutil
- Accent: `#00d4ff` (cian eléctrico) + `#00ff87` (verde neón para ascensos)
- Club: `#E53935` (rojo) botón primario; `#FDD835` (amarillo) detalle
- Text: `#ffffff` / mutes azulados
- Display font: Inter (bold/extrabold)
- Body/data font: JetBrains Mono
- Strongest visual element: la tabla de ranking con top-3 verde + el botón rojo "Generar Jornada" y las tarjetas de partido

## Share copy (draft)
Le monté a mi club su propia app: marcas tu disponibilidad, el sistema genera las jornadas solo —rival, pista y hora, sin repetir— y el ranking se actualiza en directo. Hecho con NorteIA.

## Audio direction
- Role: cinematic support — bed con swell inicial y accents motion-matched en cada reveal
- Music: bed cinematográfico/tech, medio tempo; sube en el hook y en "Generar Jornada"
- Music treatment: entra fuerte en el slam del hook, se sostiene bajo la demo, swell final en el outro con fundido
- Music cue guidance: track a elegir en composición; detectar cues con `npx hyperframes beats`. Targets de cue fuerte: (1) ~0.3s slam del hook, (2) el clic de "Generar Jornada", (3) el salto al top-3. Ventana de beat-grid para las 3 tarjetas de partido (una por beat, con hold del set completo después).
- Audio-reactive treatment: subtle — el glow cian del fondo y la "presencia" de las tarjetas respiran con el bass; nada de barras de waveform.
- SFX posture: moderado, motion-matched — *whoosh* de tarjeta ×3, tick del contador `+4`, clic del cursor, un hit seco en el logo final.
- Audio-coupled moments: clic del botón, entrada secuencial de tarjetas, count-up de puntos, candado que se cierra.
- Restraint rule: el audio no debe tapar la lectura; cada línea de texto mantiene su hold aunque el beat vaya más rápido.

## Storyboard (v2 — 30s, 6 escenas, holds más generosos)

### Scene 1 — Hook — 3.5s
Fondo cyber gradiente con rejilla cian que respira; scan-line baja una vez. Slam de "El ranking de tu club, **vivo.**" (Inter extrabold, glow cian). Debajo, en mono: `ESCUELA DE TENIS MARINEDA`. Hold ampliado para que el titular respire.
Sequential/interaction: none
Audio intent: impacto + promesa; el swell entra con el slam.
Audio-coupled idea: hit sincronizado con la aparición del titular.
Music: cinematic, arranque fuerte.
Transition mood: dramatic wipe → Scene 2

### Scene 2 — El lío semanal → la app — 4.5s
Tres burbujas tipo chat desordenadas ("¿a qué hora?", "¿con quién?", "¿qué pista?") aparecen y se desvanecen; entra la tarjeta de login real "Bienvenido · Escuela de Tenis Marineda" con el botón rojo. Texto: "Cada semana, el mismo lío. Hasta ahora."
Sequential/interaction: las 3 burbujas aparecen y se apagan (con más aire entre ellas); luego entra la card de la app.
Audio intent: tensión ligera que se resuelve al aparecer la app.
Audio-coupled idea: pop suave por burbuja; whoosh al entrar la app.
Music: se asienta el bed.
Transition mood: soft crossfade → Scene 3

### Scene 3 — Generar Jornada (centerpiece) — 6s
Vista de "Jornada". Un cursor entra y pulsa el botón rojo **Generar Jornada**. Aparecen **3 tarjetas de partido una a una**: `Jugador A vs Jugador B · Pista N · HH:MM` (datos ficticios, mono). Etiqueta sostenida: "Rival, pista y hora. Sin repetir. Respetando disponibilidad." Hold del set completo ampliado (~2.5s) para leerlo con calma.
Sequential/interaction: yes — cursor clica el botón; 3 tarjetas entran (beats alternos, ~1s) con whoosh; el set completo se sostiene ~2.5s.
Audio intent: satisfacción de "todo encaja solo".
Audio-coupled idea: clic + 3 whooshes en beat + un chime final cuando está el set.
Music: cue fuerte en el clic.
Transition mood: smooth wipe → Scene 4

### Scene 4 — La notificación al jugador (NUEVA) — 5.5s
Cambio de punto de vista: la pantalla de un móvil (marco/estética de la app). Suena y entra una **notificación push/in-app** con la campana y un badge: encabezado "🎾 Nueva jornada" y cuerpo con **rival, pista y hora**: "Juegas vs **Diego S.** · Pista 2 · Sábado 19:30". Debajo aparece una segunda línea/toast más pequeño o el detalle del partido en la app. Etiqueta sostenida: "Y cada jugador recibe el suyo. Sin preguntar a nadie."
Sequential/interaction: yes — la notificación **desliza desde arriba** (con sonido de aviso), asienta y se lee; opcional: la campana muestra el badge "1" antes.
Audio intent: el "ping" satisfactorio de recibir tu partido; cierra el bucle admin→jugador.
Audio-coupled idea: sonido de notificación al deslizar + un tick suave del badge.
Music: sostiene, cálida.
Transition mood: clean slide → Scene 5

### Scene 5 — El ranking sube — 6.5s
Tabla de ranking (Pos · Jugador · PJ · Puntos), estética real. Se marca un resultado; el contador de una fila hace **+4** (count-up en mono), la fila **sube** al top-3 (los números de posición hacen swap correctamente) y se pinta de **verde neón** con `⬆ Asciende de división`. Micro-línea: "Resultados en directo." Hold ampliado tras el ascenso.
Sequential/interaction: yes — count-up de puntos + reordenación de una fila hacia arriba con swap de posición.
Audio intent: recompensa; pequeño clímax.
Audio-coupled idea: ticks del count-up + un ping en el momento del ascenso.
Music: sostiene, empieza a crecer hacia el outro.
Transition mood: clean → Scene 6

### Scene 6 — Outro — 4s
Fondo cyber limpio. Logo/nombre del club centrado. Línea: **"Su club. Su ranking. Su app."** Debajo, firma en mono: `NorteIA · victormago.com`. Glow cian final.
Sequential/interaction: none.
Audio intent: cierre; swell y fundido.
Audio-coupled idea: hit seco en el logo, luego cola musical que se apaga.
Music: swell final + fade-out.
Transition mood: soft fade to end

**Total:** 3.5 + 4.5 + 6 + 5.5 + 6.5 + 4 = 30s
**Music mood for this video:** cinematic
**Audio summary:** bed cinematográfico-tech que arranca fuerte en el hook, se asienta bajo una demo app-store con accents motion-matched (clic, 3 whooshes de tarjeta, ping de notificación, count-up de puntos) y cierra con un swell en el logo del club.
