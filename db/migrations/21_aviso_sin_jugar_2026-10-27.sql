-- 21 · Aviso personal a quien lleva 2 semanas sin jugar — 27/10/2026 (queja de jugadores; Mauro y Braulio de acuerdo)
-- El miércoles a las 10:00, junto al recordatorio de horas, quien no ha tenido partido (jugado o publicado) en las
-- dos semanas anteriores a la semana que se genera recibe un aviso propio: tiene prioridad, pero necesita horas.
-- Ese aviso sustituye al recordatorio normal (una sola notificación por persona) y sale como mucho una vez por semana.
set local lock_timeout = '4s';

create or replace function public.send_idle_reminders()
returns int language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_suffix text; v_start date; v_n int := 0; v_k int; v_week text; v_pl boolean;
  v_months text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin
  foreach v_suffix in array array['padel', 'tennis_adults', 'tennis_juveniles'] loop
    v_start := public.play_week_start(v_suffix);
    v_pl := v_suffix = 'padel';
    v_week := 'del lunes ' || extract(day from v_start)::int || ' al domingo ' || extract(day from v_start + 6)::int
           || ' de ' || v_months[extract(month from v_start + 6)::int];
    insert into public.notifications (user_id, type, message)
    select distinct on (acc) acc, 'idle_reminder',
           case when v_pl then 'Lleváis dos semanas sin partido en la liga. En la jornada ' || v_week || ' tenéis prioridad'
                else 'Llevas dos semanas sin partido en la liga. En la jornada ' || v_week || ' tienes prioridad' end
           || case when n_h = 0 then case when v_pl then ', pero no tenéis ninguna hora marcada. ' else ', pero no tienes ninguna hora marcada. ' end
                   when n_h < 6 then ', pero con solo ' || n_h || case when n_h = 1 then ' hora marcada' else ' horas marcadas' end
                                  || case when v_pl then ' es difícil encontraros rival. ' else ' es difícil encontrarte rival. ' end
                   else case when v_pl then '. Tenéis ' || n_h || ' horas marcadas: cuantas más, más fácil encontraros rival. '
                             else '. Tienes ' || n_h || ' horas marcadas: cuantas más, más fácil encontrarte rival. ' end end
           || case when confirmed
                then case when v_pl then 'Si podéis añadir alguna más, entrad en Mi Disponibilidad y guardadlas antes de que cierre el plazo.'
                          else 'Si puedes añadir alguna más, entra en Mi Disponibilidad y guárdalas antes de que cierre el plazo.' end
                else case when v_pl then 'Entrad en Mi Disponibilidad, marcad todas las que podáis y pulsad "Confirmar mis horas".'
                          else 'Entra en Mi Disponibilidad, marca todas las que puedas y pulsa "Confirmar mis horas".' end end
      from (
        select t.id, acc,
               (select count(*)::int from public.availability av where av.team_id = t.id) as n_h,
               (t.availability_confirmed_at is not null and (t.availability_confirmed_at at time zone 'Europe/Madrid')::date >= v_start - 7) as confirmed
          from public.teams t cross join lateral unnest(array[t.user_id, t.user_id_2]) acc
         where acc is not null and coalesce(t.week_off, false) = false
           and coalesce(t.approved, true) and coalesce(t.group_name, '') <> ''
           and (case when v_pl then t.sport = 'padel' else t.sport = 'tennis' and t.category = replace(v_suffix, 'tennis_', '') end)
           -- sin partido jugado o publicado en las dos semanas anteriores a la que se genera
           and not exists (select 1 from public.matches m
                            where (m.team1_id = t.id or m.team2_id = t.id) and (m.completed or m.published)
                              and m.date >= (v_start - 14)::timestamp at time zone 'Europe/Madrid'
                              and m.date <  v_start::timestamp at time zone 'Europe/Madrid')
           -- quien tiene un partido aplazado sin jugar lo llevan los monitores (el generador no le pone otro)
           and not exists (select 1 from public.matches m
                            where (m.team1_id = t.id or m.team2_id = t.id) and not m.completed and coalesce(m.postponed, false))
           and exists (select 1 from auth.users u where u.id = acc)
           and not exists (select 1 from public.notifications n where n.user_id = acc and n.type = 'idle_reminder' and n.created_at > now() - interval '6 days')
      ) x
     order by acc, n_h;
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
  end loop;
  return v_n;
end $function$;

-- El recordatorio normal no repite a quien acaba de recibir el aviso personal (que ya dice lo mismo y más)
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
       and not exists (select 1 from public.notifications n where n.user_id = acc and n.type in ('availability_reminder', 'idle_reminder') and n.created_at > now() - p_min_gap);
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
  end loop;
  return v_n;
end $function$;

-- El automático de los miércoles: primero el aviso personal, luego el recordatorio normal
create or replace function public.send_availability_reminders()
returns int language sql security definer set search_path to 'public', 'pg_temp'
as $$ select public.send_idle_reminders() + public.send_availability_reminders(interval '20 hours') $$;

-- Título del aviso en el móvil
create or replace function public.notify_push()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
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
      when new.type = 'match_reminder' then 'Mañana tienes partido'
      when new.type in ('match_updated', 'match_cancelled') then 'Cambio en tu partido'
      when new.type in ('result_saved', 'match_result') then 'Resultado registrado'
      when new.type = 'match_comment' then 'Mensaje de tu partido'
      when new.type = 'availability_reminder' then 'Marca tus horas de la semana'
      when new.type = 'idle_reminder' then 'Esta semana tienes prioridad'
      when new.type like 'pair%' then 'Tu pareja de pádel'
      else 'Escuela de Tenis Marineda' end;
    perform net.http_post(
      url := 'https://tennis-padel-app-sigma.vercel.app/api/push',
      body := jsonb_build_object(
        'title', v_title,
        'body', left(coalesce(new.message, ''), 300),
        'url', '/',
        'tag', case when new.type in ('pair_hours', 'availability_reminder', 'idle_reminder') then new.type else null end,
        'subscriptions', v_subs),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      timeout_milliseconds := 10000);
  exception when others then
    raise warning 'notify_push(%): %', new.id, sqlerrm;
  end;
  return new;
end $function$;

revoke execute on function public.send_idle_reminders() from public, anon, authenticated;
revoke execute on function public.send_availability_reminders(interval), public.send_availability_reminders() from public, anon, authenticated;
