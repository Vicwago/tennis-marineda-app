-- 15 · Disponibilidad que caduca + recordatorio semanal — 14/10/2026 (petición de Mauro y Braulio)
-- Cada ficha guarda cuándo confirmó sus horas por última vez (availability_confirmed_at). Para la
-- "semana de juego" W (lunes), las horas valen si se confirmaron desde el lunes anterior (W − 7).
-- El generador solo mete a quien las tiene al día (los monitores pueden desactivarlo).
-- Cada miércoles por la mañana se avisa (campana + móvil) a quien aún no las ha confirmado.
set local lock_timeout = '4s';

alter table public.teams add column if not exists availability_confirmed_at timestamptz;
-- Relleno: la última vez que cada ficha guardó sus horas (las filas se reescriben al guardar)
update public.teams t set availability_confirmed_at = a.last
  from (select team_id, max(created_at) last from public.availability group by team_id) a
 where a.team_id = t.id and t.availability_confirmed_at is null;

-- enforce_team_update (igual que en la 12) + la fecha de confirmación solo la pone el servidor
create or replace function public.enforce_team_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_key text; v_locked boolean; v_uid uuid; v_other uuid; v_who text;
begin
  if coalesce(current_setting('app.signup_link', true), '') = 'on'
     and old.user_id is null and new.user_id is not null
     and new.user_id_2 is not distinct from old.user_id_2
     and new.name is not distinct from old.name
     and new.sport is not distinct from old.sport
     and new.category is not distinct from old.category
     and new.points is not distinct from old.points
     and new.matches_played is not distinct from old.matches_played then
    return new;
  end if;

  if coalesce(current_setting('app.pair_link', true), '') = 'on' then
    if old.sport <> 'padel' then raise exception 'Operación de pareja fuera de pádel.' using errcode = 'P0001'; end if;
    new.points := old.points; new.matches_played := old.matches_played; new.group_name := old.group_name;
    new.name := old.name; new.sport := old.sport; new.category := old.category; new.week_off := old.week_off;
  elsif not public.is_admin() then
    new.points := old.points; new.matches_played := old.matches_played; new.group_name := old.group_name;
    new.name := old.name; new.sport := old.sport; new.category := old.category; new.user_id := old.user_id;
    if coalesce(current_setting('app.avail_confirm', true), '') <> 'on' then
      new.availability_confirmed_at := old.availability_confirmed_at;
    end if;
    if not (old.user_id_2 is not null and new.user_id_2 is null
            and not exists (select 1 from auth.users u where u.id = old.user_id_2)) then
      new.user_id_2 := old.user_id_2;
    end if;
    if new.week_off is distinct from old.week_off then
      v_key := public.availability_scope_key(old.id);
      select (value = 'true') into v_locked from public.app_settings where key = v_key;
      if coalesce(v_locked, false) then
        raise exception 'La disponibilidad está bloqueada por el administrador para esta categoría.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if old.sport = 'padel' and new.week_off is distinct from old.week_off then
    v_uid := auth.uid();
    if v_uid is not null then
      v_other := case when old.user_id = v_uid then old.user_id_2 when old.user_id_2 = v_uid then old.user_id end;
      if v_other is not null then
        begin
          select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;
          insert into public.notifications (user_id, type, message)
          values (v_other, 'pair', coalesce(v_who, 'Tu pareja') || case when new.week_off
                    then ' ha avisado de que esta semana no jugáis (pareja "' || old.name || '").'
                    else ' ha vuelto a apuntaros para jugar esta semana (pareja "' || old.name || '").' end);
        exception when others then null;
        end;
      end if;
    end if;
  end if;

  if new.user_id is null and new.user_id_2 is not null then
    new.user_id := new.user_id_2; new.user_id_2 := null;
  end if;
  if new.user_id_2 is not null and new.user_id_2 = new.user_id then
    new.user_id_2 := null;
  end if;
  return new;
end;
$function$;

-- set_team_availability (igual que en la 09) + sella la confirmación
create or replace function public.set_team_availability(p_team_id bigint, p_slots jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_owner uuid; v_owner2 uuid; v_sport text; v_key text; v_locked boolean;
        v_uid uuid := auth.uid(); v_other uuid; v_who text;
begin
  if v_uid is null then raise exception 'Inicia sesión para cambiar la disponibilidad.'; end if;
  select user_id, user_id_2, sport into v_owner, v_owner2, v_sport from public.teams where id = p_team_id;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  if not public.is_admin() and v_owner is distinct from v_uid and v_owner2 is distinct from v_uid then
    raise exception 'No puedes cambiar la disponibilidad de otro jugador.';
  end if;
  if not public.is_admin() then
    v_key := public.availability_scope_key(p_team_id);
    select (value = 'true') into v_locked from public.app_settings where key = v_key;
    if coalesce(v_locked, false) then
      raise exception 'La disponibilidad está bloqueada por el administrador para esta categoría.' using errcode = 'P0001';
    end if;
  end if;
  delete from public.availability where team_id = p_team_id;
  insert into public.availability (team_id, day, hour)
  select p_team_id, x->>'day', x->>'hour'
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) x
  where coalesce(x->>'day', '') <> '' and coalesce(x->>'hour', '') <> '';

  perform set_config('app.avail_confirm', 'on', true);
  update public.teams set availability_confirmed_at = now() where id = p_team_id;
  perform set_config('app.avail_confirm', 'off', true);

  if v_sport = 'padel' and (v_owner = v_uid or v_owner2 = v_uid) then
    v_other := case when v_owner = v_uid then v_owner2 else v_owner end;
    if v_other is not null then
      begin
        select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;
        delete from public.notifications where user_id = v_other and type = 'pair_hours' and is_read = false;
        insert into public.notifications (user_id, type, message)
        values (v_other, 'pair_hours', coalesce(v_who, 'Tu pareja') || ' ha guardado vuestras horas de pádel. Míralas en Mi Disponibilidad.');
      exception when others then null;
      end;
    end if;
  end if;
end $function$;

-- Semana de juego de un ámbito (misma regla que la app: ajuste guardado si aún no ha terminado;
-- si no, el lunes siguiente a hoy). Hora de Madrid.
create or replace function public.play_week_start(p_suffix text)
returns date
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_raw text; v_start date; v_today date := (now() at time zone 'Europe/Madrid')::date;
begin
  select value into v_raw from public.app_settings where key = 'play_week_start__' || p_suffix;
  if v_raw ~ '^\d{4}-\d{2}-\d{2}$' then
    v_start := v_raw::date;
    v_start := v_start - ((extract(isodow from v_start)::int) - 1);   -- lunes de esa semana
    if v_start + 6 >= v_today then return v_start; end if;
  end if;
  return v_today + (8 - extract(isodow from v_today)::int);           -- lunes siguiente
end $function$;

-- Recordatorio: a cada cuenta cuya ficha no tenga las horas confirmadas para la semana de juego
create or replace function public.send_availability_reminders()
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_suffix text; v_start date; v_n int := 0; v_k int; v_txt text;
  v_months text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin
  foreach v_suffix in array array['padel', 'tennis_adults', 'tennis_juveniles'] loop
    v_start := public.play_week_start(v_suffix);
    v_txt := 'Marca o confirma tus horas para la semana del lunes ' || extract(day from v_start)::int
          || ' al domingo ' || extract(day from v_start + 6)::int || ' de ' || v_months[extract(month from v_start + 6)::int]
          || '. Si no lo haces, no entras en la jornada. Entra en Mi Disponibilidad y pulsa Guardar (aunque no cambies nada).';
    insert into public.notifications (user_id, type, message)
    select distinct acc, 'availability_reminder', v_txt
      from public.teams t
      cross join lateral unnest(array[t.user_id, t.user_id_2]) acc
     where acc is not null
       and coalesce(t.week_off, false) = false
       and (case when v_suffix = 'padel' then t.sport = 'padel'
                 else t.sport = 'tennis' and t.category = replace(v_suffix, 'tennis_', '') end)
       and (t.availability_confirmed_at is null
            or (t.availability_confirmed_at at time zone 'Europe/Madrid')::date < v_start - 7)
       and exists (select 1 from auth.users u where u.id = acc);
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
  end loop;
  return v_n;
end $function$;

-- Los monitores pueden lanzarlo cuando quieran
create or replace function public.admin_send_availability_reminders()
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_admin() then raise exception 'Solo los monitores pueden enviar el recordatorio.'; end if;
  return public.send_availability_reminders();
end $function$;

revoke execute on function public.play_week_start(text), public.send_availability_reminders() from public, anon, authenticated;
revoke execute on function public.admin_send_availability_reminders() from public, anon;
grant execute on function public.admin_send_availability_reminders() to authenticated;

-- Título del aviso en el móvil para el recordatorio
create or replace function public.notify_push()
returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_subs jsonb; v_secret text; v_title text;
begin
  begin
    select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      into v_subs from public.push_subscriptions s where s.user_id = new.user_id;
    if v_subs is null then return new; end if;
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_hook_secret';
    if v_secret is null then return new; end if;
    v_title := case
      when new.type = 'match_assigned' then '¡Tienes partido!'
      when new.type in ('match_updated', 'match_cancelled') then 'Cambio en tu partido'
      when new.type in ('result_saved', 'match_result') then 'Resultado registrado'
      when new.type = 'match_comment' then 'Mensaje de tu partido'
      when new.type = 'availability_reminder' then 'Marca tus horas de la semana'
      when new.type like 'pair%' then 'Tu pareja de pádel'
      else 'Escuela de Tenis Marineda' end;
    perform net.http_post(
      url := 'https://tennis-padel-app-sigma.vercel.app/api/push',
      body := jsonb_build_object(
        'title', v_title,
        'body', left(coalesce(new.message, ''), 300),
        'url', '/',
        'tag', case when new.type in ('pair_hours', 'availability_reminder') then new.type else null end,
        'subscriptions', v_subs),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      timeout_milliseconds := 10000);
  exception when others then
    raise warning 'notify_push(%): %', new.id, sqlerrm;
  end;
  return new;
end $function$;

-- Cada miércoles a las 08:00 UTC (10:00 en horario de verano, 09:00 en invierno, hora de Madrid)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'recordatorio-disponibilidad';
select cron.schedule('recordatorio-disponibilidad', '0 8 * * 3', 'select public.send_availability_reminders()');

notify pgrst, 'reload schema';
