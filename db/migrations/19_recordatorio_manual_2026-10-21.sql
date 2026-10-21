-- 19 · Recordatorio de horas manual que se entiende — 21/10/2026 (Braulio pulsó y salió "0 cuentas")
-- El automático de los miércoles (10:00) no repite en 20 h. El botón de los monitores ahora puede volver
-- a avisar pasadas 3 h desde el último aviso de cada persona, y devuelve el detalle para explicarlo.
set local lock_timeout = '4s';

create or replace function public.send_availability_reminders(p_min_gap interval)
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
       and not exists (select 1 from public.notifications n where n.user_id = acc and n.type = 'availability_reminder' and n.created_at > now() - p_min_gap);
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
  end loop;
  return v_n;
end $function$;

-- El automático (cron) sigue igual: como mucho uno cada 20 h
create or replace function public.send_availability_reminders()
returns int language sql security definer set search_path to 'public', 'pg_temp'
as $$ select public.send_availability_reminders(interval '20 hours') $$;

-- Botón de los monitores: vuelve a avisar si han pasado 3 h, y cuenta lo que queda pendiente
create or replace function public.admin_send_availability_reminders_v2()
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_sent int; v_pending int; v_recent int; v_last timestamptz;
begin
  if not public.is_admin() then raise exception 'Solo los monitores pueden enviar el recordatorio.'; end if;
  v_sent := public.send_availability_reminders(interval '3 hours');
  -- cuentas que siguen sin confirmar (en cualquier ámbito) y cuántas recibieron aviso hace menos de 3 h
  with pend as (
    select distinct acc
      from public.teams t cross join lateral unnest(array[t.user_id, t.user_id_2]) acc
     where acc is not null and coalesce(t.week_off, false) = false
       and (t.availability_confirmed_at is null or (t.availability_confirmed_at at time zone 'Europe/Madrid')::date <
            public.play_week_start(case when t.sport = 'padel' then 'padel' else 'tennis_' || t.category end) - 7)
       and exists (select 1 from auth.users u where u.id = acc))
  select count(*), count(*) filter (where exists (select 1 from public.notifications n where n.user_id = pend.acc and n.type = 'availability_reminder' and n.created_at > now() - interval '3 hours'))
    into v_pending, v_recent from pend;
  select max(created_at) into v_last from public.notifications where type = 'availability_reminder' and created_at < now() - interval '1 minute';
  return jsonb_build_object('sent', v_sent, 'pending', v_pending, 'recent', v_recent, 'last_at', v_last);
end $function$;

revoke execute on function public.send_availability_reminders(interval), public.send_availability_reminders() from public, anon, authenticated;
revoke execute on function public.admin_send_availability_reminders_v2() from public, anon;
grant execute on function public.admin_send_availability_reminders_v2() to authenticated;

notify pgrst, 'reload schema';
