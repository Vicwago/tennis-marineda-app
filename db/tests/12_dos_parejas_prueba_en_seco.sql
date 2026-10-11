-- Prueba en seco de la migración 12 (dos parejas de pádel por cuenta).
-- Uso: en UNA sola consulta, pegar la migración 12 y a continuación este archivo. El bloque
-- termina con RAISE EXCEPTION: enseña el informe y deshace TODO (migración incluida).

create function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
end $f$;
create function pg_temp.chk(ok boolean, label text) returns text language sql as $f$
  select case when coalesce(ok, false) then 'OK    ' else 'FALLO ' end || label || E'\n'
$f$;
create function pg_temp.signup(u uuid, nm text, sp text, partner text, code text) returns void language plpgsql as $f$
begin
  perform pg_temp.as_user(null);
  insert into auth.users (id, email, raw_user_meta_data)
  values (u, 'zz-' || u || '@example.invalid',
          jsonb_build_object('full_name', nm, 'sport', sp, 'category', 'adults', 'invite_code', code) ||
          case when partner is null then '{}'::jsonb else jsonb_build_object('partner_name', partner) end);
end $f$;
create function pg_temp.teams_of(u uuid) returns int language sql as $f$
  select count(*)::int from public.teams where sport = 'padel' and (user_id = u or user_id_2 = u)
$f$;

do $t$
declare
  code text; r text := ''; n int; b boolean; j jsonb; adm uuid; msg text;
  a uuid := gen_random_uuid(); c uuid := gen_random_uuid(); bb uuid := gen_random_uuid();
  f uuid := gen_random_uuid(); g uuid := gen_random_uuid(); tn uuid := gen_random_uuid();
  p1 bigint; p2 bigint; pf bigint; pg1 bigint; pdup bigint; rid bigint;
begin
  select value into code from public.app_settings where key = 'registration_code';
  select id into adm from public.profiles where role = 'admin' order by id limit 1;
  update public.app_settings set value = 'false' where key like 'availability_locked__%';

  -- Tenis sigue igual
  perform pg_temp.signup(tn, 'Zz Tenista Doce', 'tennis', null, code);
  select count(*) into n from public.teams where user_id = tn and sport = 'tennis';
  r := r || pg_temp.chk(n = 1, 'T0 alta de tenis crea su ficha como siempre');

  -- A crea su primera pareja (con B)
  perform pg_temp.signup(a, 'Aaa Zzprueba', 'padel', 'Bbb Zzprueba', code);
  select id into p1 from public.teams where user_id = a and sport = 'padel';
  r := r || pg_temp.chk(p1 is not null, 'P1 A se registra y crea "Aaa / Bbb"');

  -- C se registra con A como pareja: es OTRA pareja (C + A), se crea y A recibe aviso
  perform pg_temp.signup(c, 'Ccc Zzprueba', 'padel', 'Aaa Zzprueba', code);
  select id into p2 from public.teams where user_id = c and sport = 'padel';
  select count(*) into n from public.notifications where user_id = a and type = 'pair' and message like '%te ha apuntado%';
  r := r || pg_temp.chk(p2 is not null and n = 1, format('P2 C crea "Ccc / Aaa" y A recibe el aviso de que le han apuntado (%s)', n));

  -- A pide unirse a la pareja de C teniendo ya otra: se permite
  perform pg_temp.as_user(a); perform set_config('role', 'authenticated', true);
  j := public.padel_join_pair(p2);
  perform set_config('role', 'postgres', true);
  select id into rid from public.pair_requests where user_id = a and team_id = p2;
  r := r || pg_temp.chk(j->>'status' = 'requested' and rid is not null, 'P3 A (ya con pareja) pide unirse a su segunda pareja');

  -- C acepta: A queda en las dos y su primera pareja NO se borra
  perform pg_temp.as_user(c); perform set_config('role', 'authenticated', true);
  j := public.padel_respond_join(rid, true);
  perform set_config('role', 'postgres', true);
  select (user_id_2 = a) into b from public.teams where id = p2;
  r := r || pg_temp.chk(b and pg_temp.teams_of(a) = 2 and exists (select 1 from public.teams where id = p1),
    format('P4 C acepta: A está en 2 parejas (%s) y la primera sigue intacta', pg_temp.teams_of(a)));

  -- A ya tiene 2: no puede crear una tercera ni pedir otra
  perform pg_temp.as_user(a); perform set_config('role', 'authenticated', true);
  begin j := public.padel_create_pair('Ddd Zzprueba'); b := false; exception when others then b := sqlerrm like '%dos parejas%'; end;
  r := r || pg_temp.chk(b, 'P5 tercera pareja: rechazada ("máximo dos")');
  perform set_config('role', 'postgres', true);

  -- B se registra con A: se une a la pareja 1 (A tiene hueco en ella como asiento 2)
  perform pg_temp.signup(bb, 'Bbb Zzprueba', 'padel', 'Aaa Zzprueba', code);
  select id into rid from public.pair_requests where user_id = bb and team_id = p1;
  r := r || pg_temp.chk(rid is not null, 'P6 B se registra con A y queda pidiendo entrar en "Aaa / Bbb" (no en la de C)');

  -- Grupos: las dos parejas de A no pueden ir en el mismo grupo
  perform pg_temp.as_user(adm); perform set_config('role', 'authenticated', true);
  update public.teams set group_name = 'G-Zz1' where id = p1;
  begin update public.teams set group_name = 'G-Zz1' where id = p2; b := false; msg := '';
  exception when others then b := sqlerrm like '%grupos distintos%'; msg := sqlerrm; end;
  r := r || pg_temp.chk(b, 'G1 mismo grupo para las dos parejas de A: rechazado · ' || left(msg, 90));
  update public.teams set group_name = 'G-Zz2' where id = p2;
  select (group_name = 'G-Zz2') into b from public.teams where id = p2;
  r := r || pg_temp.chk(b, 'G2 grupos distintos: permitido');
  perform set_config('role', 'postgres', true);

  -- Mismas dos cuentas en dos parejas: rechazado (A y C ya son pareja en p2)
  perform set_config('app.pair_link', 'on', true);
  begin update public.teams set user_id_2 = c where id = p1; b := false; exception when others then b := sqlerrm like '%ya forman otra pareja%'; end;
  perform set_config('app.pair_link', 'off', true);
  r := r || pg_temp.chk(b, 'S1 las mismas dos personas en otra pareja: rechazado');

  -- Pareja repetida (cada uno se apuntó por su lado): al unirse se borra SOLO la repetida
  perform pg_temp.signup(f, 'Fff Zzprueba', 'padel', 'Ggg Zzprueba', code);
  select id into pf from public.teams where user_id = f and sport = 'padel';
  perform pg_temp.signup(g, 'Ggg Zzprueba', 'padel', 'Hhh Zzprueba', code);
  select id into pg1 from public.teams where user_id = g and sport = 'padel';
  insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
  values ('Ggg Zzprueba / Fff Zzprueba', 'padel', null, null, 0, 0, g) returning id into pdup;
  perform pg_temp.as_user(g); perform set_config('role', 'authenticated', true);
  j := public.padel_join_pair(pf);
  perform set_config('role', 'postgres', true);
  select id into rid from public.pair_requests where user_id = g and team_id = pf;
  perform pg_temp.as_user(f); perform set_config('role', 'authenticated', true);
  j := public.padel_respond_join(rid, true);
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(not exists (select 1 from public.teams where id = pdup) and exists (select 1 from public.teams where id = pg1)
                        and pg_temp.teams_of(g) = 2,
    format('D1 G con 2 parejas se une a la de F: se borra su repetida "Ggg / Fff" y conserva "Ggg / Hhh" (%s parejas)', pg_temp.teams_of(g)));

  -- Monitor: no puede meter una cuenta en una tercera pareja
  perform pg_temp.as_user(adm); perform set_config('role', 'authenticated', true);
  begin perform public.admin_link_team(pg1, a); b := false; exception when others then b := sqlerrm like '%dos parejas%'; end;
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(b, 'M1 monitor vincula a A en una tercera pareja: rechazado');

  -- Disponibilidad: A guarda horas en cada pareja por separado
  perform pg_temp.as_user(a); perform set_config('role', 'authenticated', true);
  perform public.set_team_availability(p1, '[{"day":"Lunes","hour":"10:00"}]'::jsonb);
  perform public.set_team_availability(p2, '[{"day":"Martes","hour":"18:00"},{"day":"Jueves","hour":"19:00"}]'::jsonb);
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk((select count(*) from public.availability where team_id = p1) = 1
                        and (select count(*) from public.availability where team_id = p2) = 2,
    'H1 A marca horas distintas en cada una de sus dos parejas');

  raise exception E'INFORME (todo se deshace):\n%', r;
end $t$;
