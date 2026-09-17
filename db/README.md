# Base de datos — Escuela de Tenis Marineda

Proyecto Supabase: `tdmyduolpmxstaaowcpv` (región eu-west-1, Postgres 17).

## Estado real del esquema
El esquema vivo tiene **13 migraciones registradas en Supabase** (ver `Dashboard → Database → Migrations`).
Este directorio guarda las que definen la seguridad y la integridad, para que el repositorio sea la referencia:

| Archivo | Qué hace |
|---|---|
| `01_create_chronicles.sql` | Tabla de noticias + RLS (histórico; el estado real difiere ligeramente) |
| `02_create_notifications.sql` | Tabla de notificaciones (histórico; la policy INSERT real es `Admins or self`) |
| `03_security_hardening_2026-06-09.sql` | `is_admin()`, triggers anti auto-admin y anti manipulación de puntos, notificaciones de admin |
| `04_hardening_v3_2026-09-17.sql` | Lectura solo autenticados, sin equipos extra, rol protegido en INSERT, bucket solo admin, constraints, índices, bloqueo de disponibilidad en servidor |

## Tablas (public)
`profiles`, `teams`, `matches`, `availability`, `court_availability`, `app_settings`, `notifications`, `match_comments`, `chronicles` — todas con RLS activado. Vista: `matches_readable` (security_invoker).

## Reglas clave
- Solo usuarios **autenticados** leen datos del club (chronicles es pública para `/noticias`).
- Un jugador solo escribe su **disponibilidad** y su **semana libre**, y nunca cuando el admin ha bloqueado su categoría (`app_settings.availability_locked__<ámbito>`).
- **Solo admin** crea/edita/borra partidos, equipos, pistas, noticias e imágenes.
- Nadie puede cambiar su propio `role` (trigger). Los equipos los crea el trigger `handle_new_user` al registrarse.
- Un partido no puede ser de un equipo contra sí mismo ni repetirse como pendiente (índice único parcial).

## Cómo volcar el esquema completo
```bash
npx supabase login
npx supabase db dump --project-ref tdmyduolpmxstaaowcpv --schema public -f db/schema_full.sql
```

## Free tier
El plan Free **pausa el proyecto tras ~7 días sin actividad** y limita a 2 proyectos activos por cuenta.
Mitigación: `.github/workflows/keepalive.yml` hace un ping cada 3 días. Para un cliente de pago, lo correcto es Supabase Pro o un proyecto en la cuenta del club.
