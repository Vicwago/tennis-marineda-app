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
| `05_vinculacion_por_nombre_2026-09-22.sql` | Al registrarse, la cuenta se une sola a la ficha manual con su mismo nombre (solo fichas sin partidos) |
| `06_publicar_jornada_pistas_prioridades_2026-09-23.sql` | Jornada en borrador / publicar, horas fijas y especiales, horas preferentes |
| `07_revision_final_2026-09-23.sql` | `admin_link_team`, `set_team_availability`, chat solo para participantes, código de invitación oculto |
| `08_padel_pareja_capitan_2026-10-05.sql` | Pádel: el registro pide el nombre de la pareja y la ficha se llama "Nombre / Pareja" |
| `09_padel_dos_cuentas_por_pareja_2026-10-05.sql` | Pádel: una ficha con hasta dos cuentas (`teams.user_id_2`), solicitudes de unión (`pair_requests`) y RPC `padel_*`; nombre de perfil congelado; `set_team_availability` exige sesión |

`db/tests/09_parejas_prueba_en_seco.sql` comprueba la 09 de punta a punta (tenis intacto + todo el circuito de parejas) y **lo deshace todo** al terminar: se puede lanzar contra producción.

## Tablas (public)
`profiles`, `teams`, `matches`, `availability`, `court_availability`, `app_settings`, `notifications`, `match_comments`, `chronicles`, `pair_requests` — todas con RLS activado. Vista: `matches_readable` (security_invoker).

## Reglas clave
- Solo usuarios **autenticados** leen datos del club (chronicles es pública para `/noticias`).
- Un jugador solo escribe su **disponibilidad** y su **semana libre**, y nunca cuando el admin ha bloqueado su categoría (`app_settings.availability_locked__<ámbito>`).
- **Solo admin** crea/edita/borra partidos, equipos, pistas, noticias e imágenes.
- Nadie puede cambiar su propio `role` (trigger). Los equipos los crea el trigger `handle_new_user` al registrarse.
- **Pádel**: una pareja es una fila de `teams` con hasta dos cuentas (`user_id` = quien la creó, `user_id_2` = su compañero/a). Los dos pueden lo mismo sobre la pareja. La segunda cuenta entra SIEMPRE por solicitud (`pair_requests`) aceptada por quien creó la pareja o por un monitor: el nombre solo sirve para proponer, nunca da acceso. Los asientos solo los mueven los monitores y las RPC `padel_*` / `admin_link_team` / `admin_unlink_team`.
- Nadie puede cambiar su propio `full_name` por la API (es lo que ven los demás en parejas, solicitudes y chat); lo corrige un monitor.
- Un partido no puede ser de un equipo contra sí mismo ni repetirse como pendiente (índice único parcial).

## Cómo volcar el esquema completo
```bash
npx supabase login
npx supabase db dump --project-ref tdmyduolpmxstaaowcpv --schema public -f db/schema_full.sql
```

## Free tier
El plan Free **pausa el proyecto tras ~7 días sin actividad** y limita a 2 proyectos activos por cuenta.
Mitigación: `.github/workflows/keepalive.yml` hace un ping cada 3 días. Para un cliente de pago, lo correcto es Supabase Pro o un proyecto en la cuenta del club.
