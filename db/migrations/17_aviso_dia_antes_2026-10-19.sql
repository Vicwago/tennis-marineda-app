-- 17 · Aviso el día antes del partido — 19/10/2026 (petición de Víctor)
-- Además del aviso al publicar la jornada ("¡Tienes partido!"), cada tarde se avisa (campana + móvil)
-- a quien juega AL DÍA SIGUIENTE. Nunca dos veces el mismo aviso para el mismo partido y persona.
set local lock_timeout = '4s';

create or replace function public.send_match_reminders()
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_tomorrow date := (now() at time zone 'Europe/Madrid')::date + 1;
  v_days text[] := array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  v_n int;
begin
  insert into public.notifications (user_id, match_id, type, message)
  select distinct on (acc, m.id) acc, m.id, 'match_reminder',
         'Mañana juegas: ' || me.name || ' vs ' || rv.name || ' — '
         || v_days[extract(dow from x.d)::int + 1] || ' ' || extract(day from x.d)::int
         || ' a las ' || to_char(x.d, 'HH24:MI')
         || coalesce(', pista ' || nullif(trim(m.court), ''), '')
         || '. Si no podéis jugar, avisad a los monitores cuanto antes.'
    from public.matches m
    cross join lateral (select m.date at time zone 'Europe/Madrid' as d) x
    cross join lateral (values (m.team1_id, m.team2_id), (m.team2_id, m.team1_id)) p(me_id, rv_id)
    join public.teams me on me.id = p.me_id
    join public.teams rv on rv.id = p.rv_id
    cross join lateral unnest(array[me.user_id, me.user_id_2]) acc
   where not m.completed and m.published and not coalesce(m.postponed, false)
     and m.date is not null and x.d::date = v_tomorrow
     and acc is not null
     and exists (select 1 from auth.users u where u.id = acc)
     and not exists (select 1 from public.notifications n
                      where n.user_id = acc and n.match_id = m.id and n.type = 'match_reminder');
  get diagnostics v_n = row_count;
  return v_n;
end $function$;
revoke execute on function public.send_match_reminders() from public, anon, authenticated;

-- Título del aviso en el móvil (igual que en la 15 + el recordatorio del día antes)
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
      when new.type = 'match_reminder' then 'Mañana tienes partido'
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

-- Cada día a las 17:00 UTC (19:00 en horario de verano, 18:00 en invierno, hora de Madrid)
select cron.unschedule(jobid) from cron.job where jobname = 'aviso-partido-manana';
select cron.schedule('aviso-partido-manana', '0 17 * * *', 'select public.send_match_reminders()');

notify pgrst, 'reload schema';
