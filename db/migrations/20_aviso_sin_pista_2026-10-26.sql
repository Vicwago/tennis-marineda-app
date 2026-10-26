-- 20 · Sin número de pista en el aviso del día antes — 26/10/2026 (petición de Braulio)
-- El nº de pista de la app es solo un orden, no la pista real: la gente iba directa a "la 1".
-- Ahora el aviso dice que pasen por la cafetería, donde les asignan la pista.
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
         || '. Pasad por la cafetería para que os digan la pista. Si no podéis jugar, avisad a los monitores cuanto antes.'
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
