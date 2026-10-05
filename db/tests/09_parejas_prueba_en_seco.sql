-- Prueba en seco de las migraciones 09 y 10 (parejas de pádel con dos cuentas).
-- Uso: en UNA sola consulta, pegar la migración 09 y a continuación este archivo. El último
-- bloque termina con RAISE EXCEPTION: enseña el informe y deshace TODO (migración incluida).
-- Si la 09 ya está aplicada, se puede ejecutar este archivo solo: también lo deshace todo.

create function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
end $f$;
create function pg_temp.chk(ok boolean, label text) returns text language sql as $f$
  select case when coalesce(ok, false) then 'OK    ' else 'FALLO ' end || label || E'\n'
$f$;

do $t$
declare
  code text; r text := ''; n int; n2 int; n3 int; n4 int; v text; b boolean; b2 boolean; b3 boolean; j jsonb; j2 jsonb;
  adm uuid; p1 uuid; p2 uuid; tm1 bigint; tm2 bigint; mid bigint; tman bigint; tman2 bigint; th bigint; tb bigint;
  a uuid := gen_random_uuid(); bb uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  d uuid := gen_random_uuid(); e uuid := gen_random_uuid(); g uuid := gen_random_uuid();
  tn uuid := gen_random_uuid(); tn2 uuid := gen_random_uuid(); bad uuid := gen_random_uuid();
  ta bigint; td bigint; te bigint; ttn bigint; rid bigint; nadm int;
begin
  select value into code from public.app_settings where key = 'registration_code';
  select count(*) into nadm from public.profiles where role = 'admin';
  select id into adm from public.profiles where role = 'admin' order by id limit 1;
  select t.id, t.user_id into tm1, p1 from public.teams t join public.profiles p on p.id = t.user_id
   where t.sport = 'tennis' and p.role = 'player' order by t.id limit 1;
  select t.id, t.user_id into tm2, p2 from public.teams t join public.profiles p on p.id = t.user_id
   where t.sport = 'tennis' and p.role = 'player' and t.id <> tm1
     and t.category is not distinct from (select category from public.teams where id = tm1) order by t.id limit 1;
  -- los candados abiertos durante la prueba (se deshace)
  update public.app_settings set value = 'false' where key like 'availability_locked__%';

  -- ═══════════ TENIS (no debe cambiar nada) ═══════════
  perform pg_temp.as_user(null);
  begin perform public.set_team_availability(tm1, '[]'::jsonb); b := false; exception when others then b := true; end;
  r := r || pg_temp.chk(b, 'T1a disponibilidad sin sesión: rechazada');
  perform pg_temp.as_user(p2);
  begin perform public.set_team_availability(tm1, '[]'::jsonb); b := false; exception when others then b := true; end;
  r := r || pg_temp.chk(b, 'T1b disponibilidad de otro jugador: rechazada');
  perform pg_temp.as_user(p1);
  perform set_config('role', 'authenticated', true);
  perform public.set_team_availability(tm1, '[{"day":"Lunes","hour":"10:00"},{"day":"Martes","hour":"18:00"}]'::jsonb);
  select count(*) into n from public.availability where team_id = tm1;
  select count(*) into n2 from public.availability where team_id = tm2;
  perform set_config('role', 'postgres', true);
  select count(*) into n3 from public.notifications where type in ('pair', 'pair_hours');
  r := r || pg_temp.chk(n = 2 and n2 = 0 and n3 = 0, format('T1c el dueño guarda sus horas (%s), no ve las de otro (%s) y tenis no genera avisos de pareja (%s)', n, n2, n3));

  perform set_config('role', 'authenticated', true);
  update public.teams set week_off = not coalesce(week_off, false), points = 999, name = 'hack', user_id_2 = p2 where id = tm1;
  get diagnostics n = row_count;
  update public.teams set week_off = true where id = tm2;
  get diagnostics n2 = row_count;
  perform set_config('role', 'postgres', true);
  select (points is distinct from 999 and name <> 'hack' and user_id_2 is null) into b from public.teams where id = tm1;
  r := r || pg_temp.chk(n = 1 and b and n2 = 0, 'T2 semana libre propia sí; puntos, nombre y asiento 2 congelados; ficha ajena intocable');

  perform pg_temp.as_user(null);
  insert into auth.users (id, email, raw_user_meta_data) values (tn, 'zz-tn@example.invalid', jsonb_build_object('full_name', 'Zz Tenista Nuevo', 'sport', 'tennis', 'category', 'adults', 'invite_code', code));
  select id into ttn from public.teams where user_id = tn and sport = 'tennis' and category = 'adults' and name = 'Zz Tenista Nuevo';
  r := r || pg_temp.chk(ttn is not null, 'T3a alta de tenis: crea su ficha');
  insert into public.teams (name, sport, category, group_name, points, matches_played) values ('Zz Manuel Tenis', 'tennis', 'adults', 'Grupo 9', 0, 0) returning id into tman;
  insert into auth.users (id, email, raw_user_meta_data) values (tn2, 'zz-tn2@example.invalid', jsonb_build_object('full_name', 'zz manuel tenis', 'sport', 'tennis', 'category', 'adults', 'invite_code', code));
  select (user_id = tn2) into b from public.teams where id = tman;
  select count(*) into n from public.teams where user_id = tn2;
  r := r || pg_temp.chk(b and n = 1, 'T3b alta de tenis con el nombre de una ficha manual: se vincula sola');
  begin
    insert into auth.users (id, email, raw_user_meta_data) values (bad, 'zz-bad@example.invalid', jsonb_build_object('full_name', 'Zz Malo', 'sport', 'tennis', 'invite_code', 'NOPE'));
    b := false; v := '';
  exception when others then b := sqlerrm like '%INVITE_CODE_INVALID%'; v := sqlerrm; end;
  r := r || pg_temp.chk(b, 'T3c código de invitación malo: rechazado (' || v || ')');

  insert into public.matches (team1_id, team2_id, sport, category, slot_id, published, completed, played, postponed)
  values (ttn, tman, 'tennis', 'adults', 'lun_10:00', true, false, false, false) returning id into mid;
  perform pg_temp.as_user(tn);
  perform set_config('role', 'authenticated', true);
  insert into public.match_comments (match_id, author_id, content) values (mid, tn, 'hola');
  select count(*) into n from public.match_comments where match_id = mid;
  perform set_config('role', 'postgres', true);
  select count(*) into n2 from public.notifications where user_id = tn2 and match_id = mid and type = 'match_comment';
  r := r || pg_temp.chk(n = 1 and n2 = 1, 'T5a chat de tenis: el jugador escribe y su rival recibe el aviso');
  perform pg_temp.as_user(p1);
  perform set_config('role', 'authenticated', true);
  begin insert into public.match_comments (match_id, author_id, content) values (mid, p1, 'intruso'); b := false; exception when others then b := true; end;
  select count(*) into n from public.match_comments where match_id = mid;
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(b and n = 0, 'T5b un tercero ni escribe ni lee ese chat');
  delete from public.matches where id = mid;

  perform pg_temp.as_user(adm);
  perform set_config('role', 'authenticated', true);
  update public.teams set user_id = null where id = tman;                      -- desvincular del cliente antiguo
  get diagnostics n = row_count;
  perform public.admin_link_team(tman, tn2);
  begin perform public.admin_link_team(tman, tn); b := false; exception when others then b := true; end;
  begin perform public.admin_link_team(tm1, tn2); b2 := false; exception when others then b2 := true; end;
  perform public.admin_unlink_team(tman, tn2);
  perform set_config('role', 'postgres', true);
  select (user_id is null and user_id_2 is null) into b3 from public.teams where id = tman;
  r := r || pg_temp.chk(n = 1 and b and b2 and b3, 'T4 monitores en tenis: vincular, no duplicar cuenta ni ficha, desvincular');

  perform pg_temp.as_user(p1);
  perform set_config('role', 'authenticated', true);
  update public.profiles set full_name = 'Suplantador', role = 'admin' where id = p1;
  perform set_config('role', 'postgres', true);
  select (full_name is distinct from 'Suplantador' and role = 'player') into b from public.profiles where id = p1;
  perform pg_temp.as_user(adm);
  perform set_config('role', 'authenticated', true);
  update public.profiles set full_name = 'Zz Renombrado' where id = tn;
  perform set_config('role', 'postgres', true);
  select (full_name = 'Zz Renombrado') into b2 from public.profiles where id = tn;
  r := r || pg_temp.chk(b and b2, 'T6 un jugador no se cambia el nombre ni el rol por la API; un monitor sí corrige nombres');

  -- ═══════════ PÁDEL ═══════════
  perform pg_temp.as_user(null);
  insert into auth.users (id, email, raw_user_meta_data) values (a, 'zz-a@example.invalid', jsonb_build_object('full_name', 'Zz Ana López', 'sport', 'padel', 'partner_name', 'Zz Bea Ruiz', 'invite_code', code));
  select id, name into ta, v from public.teams where user_id = a;
  r := r || pg_temp.chk(v = 'Zz Ana López / Zz Bea Ruiz', 'P1 alta de pádel: crea la pareja "' || coalesce(v, '-') || '"');

  -- quien crea la pareja nombra a alguien que YA tiene cuenta (un tenista): a esa cuenta le llega el aviso
  insert into auth.users (id, email, raw_user_meta_data) values (g, 'zz-g@example.invalid', jsonb_build_object('full_name', 'Zz Fede Sol', 'sport', 'padel', 'partner_name', 'Zz Manuel Tenis', 'invite_code', code));
  select count(*) into n from public.notifications where user_id = tn2 and type = 'pair' and message like 'Zz Fede Sol te ha apuntado%';
  select count(*) into n2 from public.teams where user_id = g and name = 'Zz Fede Sol / Zz Manuel Tenis';
  r := r || pg_temp.chk(n = 1 and n2 = 1, format('P1b nombra a alguien que ya tenía cuenta: se crea la pareja (%s) y a esa persona le llega el aviso (%s)', n2, n));

  insert into auth.users (id, email, raw_user_meta_data) values (bb, 'zz-b@example.invalid', jsonb_build_object('full_name', 'zz bea ruiz garcia', 'sport', 'padel', 'partner_name', 'Zz Ana', 'invite_code', code));
  select count(*) into n from public.teams where user_id = bb or user_id_2 = bb;
  select count(*) into n2 from public.pair_requests where user_id = bb and team_id = ta;
  select count(*) into n3 from public.notifications where user_id = a and type = 'pair';
  r := r || pg_temp.chk(n = 0 and n2 = 1 and n3 = 1, format('P2 se apunta su compañera: sin pareja repetida (%s), solicitud (%s) y aviso a quien creó la pareja (%s)', n, n2, n3));
  select id into rid from public.pair_requests where user_id = bb;

  perform pg_temp.as_user(bb);
  perform set_config('role', 'authenticated', true);
  begin perform public.set_team_availability(ta, '[]'::jsonb); b := false; exception when others then b := true; end;
  begin perform public.padel_respond_join(rid, true); b2 := false; exception when others then b2 := true; end;
  select count(*) into n from public.pair_requests;
  select count(*) into n2 from public.availability where team_id = ta;
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(b and b2 and n = 1, 'P3 hasta que la acepten no toca las horas ni se acepta a sí misma; solo ve su solicitud');

  perform pg_temp.as_user(p1);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.pair_requests;
  begin perform public.padel_respond_join(rid, true); b := false; exception when others then b := true; end;
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(n = 0 and b, 'P3b una cuenta ajena no ve la solicitud ni puede aceptarla');

  perform pg_temp.as_user(g);
  perform set_config('role', 'authenticated', true);
  perform public.padel_join_pair(ta);
  perform set_config('role', 'postgres', true);

  perform pg_temp.as_user(a);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.pair_requests;
  j := public.padel_respond_join(rid, true);
  perform set_config('role', 'postgres', true);
  select (user_id = a and user_id_2 = bb) into b from public.teams where id = ta;
  select count(*) into n2 from public.pair_requests where team_id = ta;
  select count(*) into n3 from public.notifications where user_id = bb and type = 'pair';
  r := r || pg_temp.chk(n = 2 and b and n2 = 0 and n3 = 1 and j->>'status' = 'accepted', 'P4 quien creó la pareja acepta: segunda cuenta dentro y avisada');
  select count(*) into n from public.notifications where user_id = g and type = 'pair' and message like '%ya tiene sus dos cuentas%';
  select count(*) into n2 from public.teams where user_id = g;
  r := r || pg_temp.chk(n = 1 and n2 = 1, format('P4b quien también lo había pedido se entera de que la pareja ya está completa (%s) y conserva la suya (%s)', n, n2));

  perform pg_temp.as_user(bb);
  perform set_config('role', 'authenticated', true);
  perform public.set_team_availability(ta, '[{"day":"Lunes","hour":"10:00"}]'::jsonb);
  select count(*) into n from public.availability where team_id = ta;
  update public.teams set week_off = true, user_id = bb, name = 'x' where id = ta;
  get diagnostics n2 = row_count;
  perform set_config('role', 'postgres', true);
  select (week_off and user_id = a and user_id_2 = bb and name <> 'x') into b from public.teams where id = ta;
  select count(*) into n3 from public.notifications where user_id = a and type = 'pair_hours';
  select count(*) into n4 from public.notifications where user_id = a and type = 'pair' and message like '%no jugáis%';
  r := r || pg_temp.chk(n = 1 and n2 = 1 and b and n3 = 1 and n4 = 1, format('P5 la segunda cuenta guarda horas (%s) y semana libre; la primera recibe los avisos (%s, %s); asientos y nombre congelados', n, n3, n4));
  perform public.set_team_availability(ta, '[{"day":"Lunes","hour":"10:00"},{"day":"Lunes","hour":"12:00"}]'::jsonb);
  select count(*) into n3 from public.notifications where user_id = a and type = 'pair_hours';
  r := r || pg_temp.chk(n3 = 1, 'P5b guardar otra vez no llena la campana: sigue habiendo un solo aviso de horas');
  perform pg_temp.as_user(adm);
  update public.profiles set role = 'admin' where id = a;
  perform pg_temp.as_user(a);
  perform set_config('role', 'authenticated', true);
  update public.teams set week_off = false where id = ta;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.notifications where user_id = bb and type = 'pair' and message like '%ha vuelto a apuntaros%';
  perform pg_temp.as_user(adm);
  update public.profiles set role = 'player' where id = a;
  r := r || pg_temp.chk(n = 1, 'P5d si quien cambia "esta semana no" es un monitor que juega, su pareja también recibe el aviso');

  -- chat de pádel con cuatro cuentas (dos parejas)
  perform pg_temp.as_user(null);
  insert into auth.users (id, email, raw_user_meta_data) values (d, 'zz-d@example.invalid', jsonb_build_object('full_name', 'Zz Dani Mora', 'sport', 'padel', 'partner_name', 'Zz Eva Gil', 'invite_code', code));
  insert into auth.users (id, email, raw_user_meta_data) values (e, 'zz-e@example.invalid', jsonb_build_object('full_name', 'Zz Evita Gil', 'sport', 'padel', 'partner_name', 'Zz Daniel Mora', 'invite_code', code));
  select id into td from public.teams where user_id = d;
  select id into te from public.teams where user_id = e;
  r := r || pg_temp.chk(td is not null and te is not null and td <> te, 'P8a nombres que no encajan (Dani/Daniel, Eva/Evita): salen dos parejas, sin solicitud a ciegas');
  insert into public.matches (team1_id, team2_id, sport, category, slot_id, published, completed, played, postponed)
  values (ta, td, 'padel', null, 'lun_10:00', true, false, false, false) returning id into mid;
  perform pg_temp.as_user(bb);
  perform set_config('role', 'authenticated', true);
  insert into public.match_comments (match_id, author_id, content) values (mid, bb, 'hola pareja y rivales');
  select count(*) into n from public.match_comments where match_id = mid;
  perform set_config('role', 'postgres', true);
  select count(*) into n2 from public.notifications where match_id = mid and type = 'match_comment' and user_id in (a, d);
  select count(*) into n3 from public.notifications where match_id = mid and type = 'match_comment' and user_id = bb;
  r := r || pg_temp.chk(n = 1 and n2 = 2 and n3 = 0, format('P5c chat de pádel: la segunda cuenta escribe; reciben aviso su pareja y el rival (%s), ella no (%s)', n2, n3));

  -- con partidos de por medio, la pareja repetida ya no se puede juntar sola
  perform pg_temp.as_user(e);
  perform set_config('role', 'authenticated', true);
  perform public.set_team_availability(te, '[{"day":"Lunes","hour":"10:00"},{"day":"Jueves","hour":"19:00"}]'::jsonb);
  j := public.padel_join_pair(td);
  perform set_config('role', 'postgres', true);
  select id into rid from public.pair_requests where user_id = e;
  insert into public.matches (team1_id, team2_id, sport, category, slot_id, published, completed, played, postponed)
  values (te, ta, 'padel', null, 'mar_10:00', false, false, false, false);
  perform pg_temp.as_user(d);
  perform set_config('role', 'authenticated', true);
  begin perform public.padel_respond_join(rid, true); b := false; v := ''; exception when others then b := true; v := sqlerrm; end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.teams where id = te;
  r := r || pg_temp.chk(b and n = 1, 'P8b si la pareja repetida ya tiene partido (aunque sea borrador) no se borra: ' || v);
  delete from public.matches where team1_id = te or team2_id = te;

  -- con el plazo cerrado tampoco (borrar la ficha borra sus horas)
  insert into public.app_settings (key, value) values ('availability_locked__padel', 'true')
  on conflict (key) do update set value = 'true';
  perform set_config('role', 'authenticated', true);
  begin perform public.padel_respond_join(rid, true); b := false; v := ''; exception when others then b := true; v := sqlerrm; end;
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(b, 'P8c con el plazo de pádel cerrado no se juntan parejas: ' || v);
  update public.app_settings set value = 'false' where key = 'availability_locked__padel';

  perform set_config('role', 'authenticated', true);
  j2 := public.padel_respond_join(rid, true);
  perform set_config('role', 'postgres', true);
  select (user_id = d and user_id_2 = e) into b from public.teams where id = td;
  select count(*) into n from public.teams where id = te;
  select count(*) into n2 from public.availability where team_id = te;
  r := r || pg_temp.chk(j->>'status' = 'requested' and j2->>'status' = 'accepted' and b and n = 0 and n2 = 0, 'P8d parejas repetidas: se juntan en una y la sobrante se borra con sus horas');
  delete from public.matches where id = mid;

  -- tercera cuenta con los mismos nombres de una pareja ya completa
  perform pg_temp.as_user(null);
  insert into auth.users (id, email, raw_user_meta_data) values (c, 'zz-c@example.invalid', jsonb_build_object('full_name', 'Zz Ana Lopez', 'sport', 'padel', 'partner_name', 'Zz Bea Ruiz', 'invite_code', code));
  select count(*) into n from public.teams where user_id = c or user_id_2 = c;
  select count(*) into n2 from public.pair_requests where user_id = c;
  perform pg_temp.as_user(c);
  perform set_config('role', 'authenticated', true);
  begin perform public.padel_join_pair(ta); b := false; exception when others then b := true; end;
  begin perform public.padel_unlink_partner(ta); b2 := false; exception when others then b2 := true; end;
  begin perform public.set_team_availability(ta, '[]'::jsonb); b3 := false; exception when others then b3 := true; end;
  perform set_config('role', 'postgres', true);
  r := r || pg_temp.chk(n = 0 and n2 = 0 and b and b2 and b3, 'P6 pareja completa: una tercera cuenta no crea, no entra, no quita a nadie ni toca las horas');

  -- quitar, volver a pedir, rechazar, aceptar y salirse
  perform pg_temp.as_user(a);
  perform set_config('role', 'authenticated', true);
  perform public.padel_unlink_partner(ta);
  perform set_config('role', 'postgres', true);
  select (user_id = a and user_id_2 is null) into b from public.teams where id = ta;
  perform pg_temp.as_user(bb);
  perform set_config('role', 'authenticated', true);
  begin perform public.set_team_availability(ta, '[]'::jsonb); b2 := false; exception when others then b2 := true; end;
  j := public.padel_join_pair(ta);
  perform public.padel_join_pair(ta);                                           -- repetir no duplica
  perform set_config('role', 'postgres', true);
  select count(*), min(id) into n, rid from public.pair_requests where user_id = bb;
  perform pg_temp.as_user(a);
  perform set_config('role', 'authenticated', true);
  j2 := public.padel_respond_join(rid, false);
  perform set_config('role', 'postgres', true);
  select count(*) into n2 from public.pair_requests where user_id = bb;
  r := r || pg_temp.chk(b and b2 and n = 1 and j->>'status' = 'requested' and j2->>'status' = 'rejected' and n2 = 0, 'P7 quitar a la segunda cuenta (pierde el acceso), volver a pedirlo y rechazarlo');
  perform pg_temp.as_user(bb);
  perform set_config('role', 'authenticated', true);
  perform public.padel_join_pair(ta);
  perform set_config('role', 'postgres', true);
  select id into rid from public.pair_requests where user_id = bb;
  perform pg_temp.as_user(a);
  perform public.padel_respond_join(rid, true);
  perform pg_temp.as_user(bb);
  perform set_config('role', 'authenticated', true);
  perform public.padel_unlink_partner(ta);
  perform set_config('role', 'postgres', true);
  select (user_id = a and user_id_2 is null) into b from public.teams where id = ta;
  r := r || pg_temp.chk(b, 'P7b la segunda cuenta puede salirse sola');

  -- cuenta que ya existía (tenista) crea su pareja; ficha manual de los monitores
  insert into public.teams (name, sport, group_name, points, matches_played) values ('Zz Gala Paz y Zz Renombrado', 'padel', 'Grupo 1', 0, 0) returning id into tman2;
  perform pg_temp.as_user(tn);
  perform set_config('role', 'authenticated', true);
  j := public.padel_create_pair('Zz Gala Paz');
  begin perform public.padel_create_pair('Zz Otra Persona'); b := false; exception when others then b := true; end;
  perform set_config('role', 'postgres', true);
  select (user_id = tn and group_name = 'Grupo 1') into b2 from public.teams where id = tman2;
  r := r || pg_temp.chk(j->>'status' = 'linked' and b and b2, 'P9a un tenista crea su pareja de pádel: se vincula a la ficha que habían creado los monitores (conserva grupo) y no puede crear otra');
  perform pg_temp.as_user(tn2);
  perform set_config('role', 'authenticated', true);
  j := public.padel_join_pair(tman2);
  perform set_config('role', 'postgres', true);
  select id into rid from public.pair_requests where user_id = tn2;
  perform pg_temp.as_user(tn);
  perform set_config('role', 'authenticated', true);
  j2 := public.padel_respond_join(rid, true);
  perform set_config('role', 'postgres', true);
  select (user_id = tn and user_id_2 = tn2) into b from public.teams where id = tman2;
  r := r || pg_temp.chk(j->>'status' = 'requested' and j2->>'status' = 'accepted' and b, 'P9b otra cuenta que ya existía se une a esa pareja cuando la aceptan');

  -- monitores en pádel
  perform pg_temp.as_user(adm);
  perform set_config('role', 'authenticated', true);
  perform public.admin_unlink_team(tman2, tn);
  perform set_config('role', 'postgres', true);
  select (user_id = tn2 and user_id_2 is null) into b from public.teams where id = tman2;
  perform set_config('role', 'authenticated', true);
  perform public.admin_link_team(tman2, tn);
  begin perform public.admin_link_team(tman2, c); b2 := false; exception when others then b2 := true; end;
  begin perform public.admin_link_team(ta, tn); b3 := false; exception when others then b3 := true; end;
  update public.teams set user_id = null where id = tman2;                     -- desvincular del cliente antiguo
  perform set_config('role', 'postgres', true);
  select (user_id = tn and user_id_2 is null) into b from public.teams where id = tman2 and b;
  r := r || pg_temp.chk(b and b2 and b3, 'P10 monitores en pádel: al quitar la primera cuenta sube la segunda; vinculan la segunda; no caben tres ni una cuenta en dos parejas');

  -- pareja sin ninguna cuenta: la solicitud va a los monitores
  insert into public.teams (name, sport, points, matches_played) values ('Zz Hugo Rey / Zz Iris Val', 'padel', 0, 0) returning id into th;
  perform pg_temp.as_user(c);
  perform set_config('role', 'authenticated', true);
  j := public.padel_join_pair(th);
  perform set_config('role', 'postgres', true);
  select id into rid from public.pair_requests where user_id = c;
  select count(*) into n from public.notifications where type = 'pair' and message like '%Zz Hugo Rey / Zz Iris Val%';
  perform pg_temp.as_user(a);
  begin perform public.padel_respond_join(rid, true); b := false; exception when others then b := true; end;
  perform pg_temp.as_user(adm);
  perform set_config('role', 'authenticated', true);
  select count(*) into n2 from public.pair_requests;
  j2 := public.padel_respond_join(rid, true);
  perform set_config('role', 'postgres', true);
  select (user_id = c and user_id_2 is null) into b2 from public.teams where id = th;
  r := r || pg_temp.chk(n = nadm and b and n2 >= 1 and j2->>'status' = 'accepted' and b2, format('P13 pareja sin cuentas: avisa a los %s monitores, un jugador no puede aceptarla, el monitor sí', nadm));

  -- borrar una cuenta que era la segunda de una pareja no deja nada colgando
  perform set_config('role', 'authenticated', true);
  perform public.admin_link_team(th, tn2);
  perform set_config('role', 'postgres', true);
  perform pg_temp.as_user(null);
  select (user_id_2 = tn2) into b from public.teams where id = th;
  delete from public.teams where user_id = tn2 and sport = 'tennis';
  delete from public.profiles where id = tn2;
  delete from auth.users where id = tn2;
  select (user_id = c and user_id_2 is null) into b2 from public.teams where id = th;
  r := r || pg_temp.chk(b and b2, 'P11 al borrar una cuenta que era la segunda de una pareja, el asiento queda libre');

  -- sin sesión y permisos
  begin perform public.padel_create_pair('Zz Xx Yy'); b := false; exception when others then b := true; end;
  begin perform public.padel_join_pair(ta); b2 := false; exception when others then b2 := true; end;
  begin perform public.padel_unlink_partner(td); b3 := false; exception when others then b3 := true; end;
  select count(*) into n from pg_proc p where p.pronamespace = 'public'::regnamespace
    and (p.proname like 'padel\_%' or p.proname in ('name_tokens', 'name_loose_match', 'pair_parts', 'pair_loose_match', 'pair_key', 'set_team_availability', 'admin_link_team', 'admin_unlink_team'))
    and has_function_privilege('anon', p.oid, 'execute');
  select count(*) into n2 from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('padel_attach', 'padel_seat', 'padel_request', 'padel_drop_own_ficha', 'padel_team_of', 'padel_lock')
    and has_function_privilege('authenticated', p.oid, 'execute');
  select count(*) into n3 from pg_proc p where p.pronamespace = 'public'::regnamespace
    and p.proname in ('padel_create_pair', 'padel_join_pair', 'padel_respond_join', 'padel_unlink_partner', 'admin_link_team', 'admin_unlink_team', 'set_team_availability')
    and has_function_privilege('authenticated', p.oid, 'execute');
  r := r || pg_temp.chk(b and b2 and b3 and n = 0 and n2 = 0 and n3 = 7, format('P12 sin sesión todo rechazado; funciones abiertas a anónimos: %s; internas abiertas a jugadores: %s; de jugador disponibles: %s/7', n, n2, n3));

  -- datos reales intactos
  select count(*) into n from public.teams where sport = 'tennis' and user_id_2 is not null;
  r := r || pg_temp.chk(n = 0, 'T7 ninguna ficha de tenis tiene segunda cuenta');

  raise exception E'INFORME DE LA PRUEBA EN SECO (todo se deshace)\n%', r;
end $t$;
