-- 16 · Auditoría antes del lanzamiento — 14/10/2026
-- Límites contra avisos masivos, recordatorio sin duplicados, validación de horas, permisos de más
-- y limpieza de 4 filas viejas de pistas que la app ya no leía.
set local lock_timeout = '4s';

-- 1) Registro de acciones para limitar frecuencia (solo lo tocan funciones del servidor)
create table if not exists public.action_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_action_log_user_kind on public.action_log (user_id, kind, created_at desc);
alter table public.action_log enable row level security;
revoke all on public.action_log from public, anon, authenticated;

create or replace function public.rate_check(p_kind text, p_max int, p_window interval, p_msg text)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or public.is_admin() then return; end if;   -- servidor, cron y monitores: sin límite
  if (select count(*) from public.action_log where user_id = v_uid and kind = p_kind and created_at > now() - p_window) >= p_max then
    raise exception '%', p_msg using errcode = 'P0001';
  end if;
  insert into public.action_log (user_id, kind) values (v_uid, p_kind);
  delete from public.action_log where created_at < now() - interval '2 days';
end $function$;
revoke execute on function public.rate_check(text, int, interval, text) from public, anon, authenticated;

-- Solicitudes de pareja (cada una avisa a quien creó la pareja): máx. 6 por hora
create or replace function public.rl_pair_requests()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if TG_OP = 'UPDATE' and new.team_id is not distinct from old.team_id then return new; end if;
  perform public.rate_check('pair_request', 6, interval '1 hour', 'Has pedido unirte a varias parejas seguidas. Espera un rato o pide a los monitores que te unan.');
  return new;
end $function$;
drop trigger if exists trg_rl_pair_requests on public.pair_requests;
create trigger trg_rl_pair_requests before insert or update on public.pair_requests
  for each row execute function public.rl_pair_requests();

-- Chat de partido (cada mensaje avisa al rival): máx. 20 cada 10 minutos
create or replace function public.rl_match_comments()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  perform public.rate_check('comment', 20, interval '10 minutes', 'Has mandado muchos mensajes seguidos. Espera un poco.');
  return new;
end $function$;
drop trigger if exists trg_rl_match_comments on public.match_comments;
create trigger trg_rl_match_comments before insert on public.match_comments
  for each row execute function public.rl_match_comments();

-- Un jugador solo puede crearse avisos a sí mismo de tipo "general" (la prueba de avisos), y pocos
drop policy if exists p_notif_insert on public.notifications;
create policy p_notif_insert on public.notifications for insert to authenticated
  with check (public.is_admin() or (user_id = (select auth.uid()) and type = 'general'));
create or replace function public.rl_self_notifications()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is not null and new.user_id = auth.uid() and not public.is_admin() then
    perform public.rate_check('self_notif', 5, interval '10 minutes', 'Ya te hemos mandado varias pruebas. Espera unos minutos.');
  end if;
  return new;
end $function$;
drop trigger if exists trg_rl_self_notifications on public.notifications;
create trigger trg_rl_self_notifications before insert on public.notifications
  for each row execute function public.rl_self_notifications();

revoke execute on function public.rl_pair_requests(), public.rl_match_comments(), public.rl_self_notifications() from public, anon, authenticated;

-- 2) Recordatorio de horas: nunca dos a la misma persona en menos de 20 horas (botón + cron)
create or replace function public.send_availability_reminders()
returns int language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_suffix text; v_start date; v_n int := 0; v_k int; v_txt text;
  v_months text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin
  foreach v_suffix in array array['padel', 'tennis_adults', 'tennis_juveniles'] loop
    v_start := public.play_week_start(v_suffix);
    v_txt := 'Marca o confirma tus horas para la semana del lunes ' || extract(day from v_start)::int
          || ' al domingo ' || extract(day from v_start + 6)::int || ' de ' || v_months[extract(month from v_start + 6)::int]
          || '. Si no lo haces, no entras en la jornada. Entra en Mi Disponibilidad y pulsa "Confirmar mis horas" (aunque no cambies nada).';
    insert into public.notifications (user_id, type, message)
    select distinct acc, 'availability_reminder', v_txt
      from public.teams t cross join lateral unnest(array[t.user_id, t.user_id_2]) acc
     where acc is not null and coalesce(t.week_off, false) = false
       and (case when v_suffix = 'padel' then t.sport = 'padel' else t.sport = 'tennis' and t.category = replace(v_suffix, 'tennis_', '') end)
       and (t.availability_confirmed_at is null or (t.availability_confirmed_at at time zone 'Europe/Madrid')::date < v_start - 7)
       and exists (select 1 from auth.users u where u.id = acc)
       and not exists (select 1 from public.notifications n where n.user_id = acc and n.type = 'availability_reminder' and n.created_at > now() - interval '20 hours');
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
  end loop;
  return v_n;
end $function$;
revoke execute on function public.send_availability_reminders() from public, anon, authenticated;

-- 3) Horas con formato válido (por si alguien escribe directamente en la tabla)
alter table public.availability drop constraint if exists availability_day_chk;
alter table public.availability add constraint availability_day_chk
  check (day in ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'));
alter table public.availability drop constraint if exists availability_hour_chk;
alter table public.availability add constraint availability_hour_chk
  check (hour ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- 4) Un partido siempre está completado o no (el índice de pendientes repetidos usa completed = false)
update public.matches set completed = false where completed is null;
alter table public.matches alter column completed set default false;
alter table public.matches alter column completed set not null;

-- 5) Permisos de más: anon solo lee (y RLS ya solo le deja ver las noticias publicadas)
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke execute on function public.stamp_bug_report() from public, anon;

-- 6) Índice para las incidencias de cada jugador
create index if not exists idx_bug_reports_user on public.bug_reports (user_id);

-- 7) Filas viejas de pistas (22/09) con formato "custom_…": la app no las lee; las buenas son las del 13/10
delete from public.court_availability where slot_id like 'custom\_%';

notify pgrst, 'reload schema';
