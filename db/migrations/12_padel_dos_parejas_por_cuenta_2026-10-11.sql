-- 12 · Pádel: una cuenta puede estar en DOS parejas (dos categorías/grupos) — 11/10/2026
-- En la escuela se permite jugar en dos grupos con dos parejas distintas. Reglas:
--   · Una cuenta está como mucho en 2 parejas de pádel (en cualquier asiento).
--   · Las mismas dos cuentas no pueden formar dos parejas.
--   · Si las dos parejas de una persona tienen grupo, tiene que ser distinto.
--   · Unirse a una pareja sigue siendo SIEMPRE con el visto bueno de quien la creó (o un monitor).
--   · Al unirse, solo se borra la ficha propia que sea la MISMA pareja repetida (los dos se
--     apuntaron por su lado); una segunda pareja distinta se conserva.
-- Tenis no cambia. Se aplica entera en una sola transacción.
set local lock_timeout = '4s';

-- 1) Fuera los índices de "una pareja por cuenta"; las reglas nuevas las aplica un trigger
drop index if exists public.teams_padel_seat1_uniq;
drop index if exists public.teams_padel_seat2_uniq;
create index if not exists idx_teams_user_id_2 on public.teams (user_id_2) where user_id_2 is not null;

-- 2) Piezas internas
create or replace function public.padel_team_count(p_user uuid)
returns int language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select count(*)::int from public.teams where sport = 'padel' and (user_id = p_user or user_id_2 = p_user)
$$;

-- La ficha propia de p_user que es la MISMA pareja que p_target (se apuntaron cada uno por su
-- lado): solo si la creó él/ella, sin compañero en la app y sin partidos. Nulo si no hay.
create or replace function public.padel_dup_of(p_user uuid, p_target bigint)
returns bigint language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $$
declare v_target text; v_id bigint;
begin
  select name into v_target from public.teams where id = p_target;
  if v_target is null then return null; end if;
  select o.id into v_id from public.teams o
  where o.sport = 'padel' and o.id <> p_target and o.user_id = p_user and o.user_id_2 is null
    and not exists (select 1 from public.matches m where m.team1_id = o.id or m.team2_id = o.id)
    and (public.pair_key(o.name) = public.pair_key(v_target)
         or (cardinality(public.pair_parts(o.name)) = 2
             and public.pair_loose_match(v_target, (public.pair_parts(o.name))[1], (public.pair_parts(o.name))[2])))
  order by o.id limit 1;
  return v_id;
end $$;

-- Borra esa ficha repetida (si existe) antes de unir a p_user a p_target
create or replace function public.padel_drop_dup_ficha(p_user uuid, p_target bigint)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_own bigint; v_locked boolean;
begin
  v_own := public.padel_dup_of(p_user, p_target);
  if v_own is null then return; end if;
  if not public.is_admin() then
    select (value = 'true') into v_locked from public.app_settings where key = 'availability_locked__padel';
    if coalesce(v_locked, false) then
      raise exception 'Los monitores tienen cerrado el plazo de pádel para preparar la jornada. Volved a intentarlo cuando lo abran, o pedidles que os unan ellos.' using errcode = 'P0001';
    end if;
  end if;
  begin
    insert into public.notifications (user_id, type, message)
    select r.user_id, 'pair', 'La pareja "' || t.name || '" a la que pediste unirte ya no existe: se ha juntado con otra. Busca de nuevo tu pareja en Pádel > Mi Disponibilidad.'
    from public.pair_requests r join public.teams t on t.id = r.team_id
    where r.team_id = v_own and r.user_id <> p_user;
  exception when others then null;
  end;
  delete from public.availability where team_id = v_own;
  delete from public.teams where id = v_own;
end $function$;

-- 3) Reglas de asientos y grupos (altas, uniones, monitores: todo pasa por aquí)
create or replace function public.enforce_padel_pair_rules()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_acc uuid; v_name text; v_other text;
begin
  if new.sport is distinct from 'padel' then return new; end if;
  if TG_OP = 'UPDATE' and new.user_id is not distinct from old.user_id
     and new.user_id_2 is not distinct from old.user_id_2
     and new.group_name is not distinct from old.group_name then
    return new;
  end if;
  foreach v_acc in array array_remove(array[new.user_id, new.user_id_2], null) loop
    select coalesce(nullif(trim(full_name), ''), 'Esa cuenta') into v_name from public.profiles where id = v_acc;
    if (select count(*) from public.teams t where t.sport = 'padel' and t.id <> new.id
          and (t.user_id = v_acc or t.user_id_2 = v_acc)) >= 2 then
      raise exception '% ya está en dos parejas de pádel (es el máximo).', coalesce(v_name, 'Esa cuenta') using errcode = 'P0001';
    end if;
    if nullif(trim(new.group_name), '') is not null then
      select t.name into v_other from public.teams t
      where t.sport = 'padel' and t.id <> new.id and (t.user_id = v_acc or t.user_id_2 = v_acc)
        and lower(trim(t.group_name)) = lower(trim(new.group_name))
      limit 1;
      if v_other is not null then
        raise exception '% ya juega en el grupo % con otra pareja ("%"). Sus dos parejas tienen que ir en grupos distintos.', coalesce(v_name, 'Esa cuenta'), trim(new.group_name), v_other using errcode = 'P0001';
      end if;
    end if;
  end loop;
  if new.user_id is not null and new.user_id_2 is not null and exists (
       select 1 from public.teams t where t.sport = 'padel' and t.id <> new.id
         and ((t.user_id = new.user_id and t.user_id_2 = new.user_id_2) or (t.user_id = new.user_id_2 and t.user_id_2 = new.user_id))) then
    raise exception 'Esas dos personas ya forman otra pareja de pádel.' using errcode = 'P0001';
  end if;
  return new;
end $function$;

-- "trg_p…" va después de "trg_enforce_team_update" (que puede subir el asiento 2 al 1)
drop trigger if exists trg_padel_pair_rules on public.teams;
create trigger trg_padel_pair_rules before insert or update on public.teams
  for each row execute function public.enforce_padel_pair_rules();

-- enforce_team_update: igual que en la 10, sin el cruce "una sola pareja" (ahora en el trigger de arriba)
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

-- 4) Sentar a alguien en una pareja: hasta 2 parejas por cuenta
create or replace function public.padel_seat(p_team_id bigint, p_user uuid)
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare t record; v_seat int;
begin
  select id, name, sport, user_id, user_id_2 into t from public.teams where id = p_team_id for update;
  if not found or t.sport <> 'padel' then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if t.user_id = p_user or t.user_id_2 = p_user then raise exception 'Esa cuenta ya está en esta pareja.' using errcode = 'P0001'; end if;
  if public.padel_team_count(p_user) >= 2 then raise exception 'Esa cuenta ya está en dos parejas de pádel (es el máximo).' using errcode = 'P0001'; end if;
  perform set_config('app.pair_link', 'on', true);
  if t.user_id is null then
    update public.teams set user_id = p_user where id = p_team_id and user_id is null; v_seat := 1;
  elsif t.user_id_2 is null then
    update public.teams set user_id_2 = p_user where id = p_team_id and user_id_2 is null; v_seat := 2;
  end if;
  if v_seat is null or not found then
    perform set_config('app.pair_link', 'off', true);
    raise exception 'Esa pareja ya tiene sus dos cuentas.' using errcode = 'P0001';
  end if;
  perform set_config('app.pair_link', 'off', true);
  delete from public.pair_requests where user_id = p_user;
  if v_seat = 2 then
    begin
      insert into public.notifications (user_id, type, message)
      select r.user_id, 'pair', 'La pareja "' || t.name || '" ya tiene sus dos cuentas. Si era la tuya, habla con tu pareja o con los monitores.'
      from public.pair_requests r where r.team_id = p_team_id;
    exception when others then null;
    end;
    delete from public.pair_requests where team_id = p_team_id;
  end if;
  return v_seat;
end $function$;

-- 5) Alta y "Crear mi pareja": el aviso "te ha apuntado" va a quien aún tenga hueco
create or replace function public.padel_attach(p_user uuid, p_name text, p_partner text)
returns text
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_team_name text; v_team_id bigint; v_n int; v_partner_id uuid;
begin
  v_team_name := case when p_partner is not null then p_name || ' / ' || p_partner else p_name end;

  select t.id into v_team_id from public.teams t
  where t.sport = 'padel' and t.user_id is null
    and (public.norm_name(t.name) = public.norm_name(v_team_name)
         or (p_partner is not null and public.pair_key(t.name) = public.pair_key(v_team_name)))
    and not exists (select 1 from public.matches m where m.team1_id = t.id or m.team2_id = t.id)
  order by t.id limit 1;
  if v_team_id is not null then
    perform set_config('app.signup_link', 'on', true);
    update public.teams set user_id = p_user where id = v_team_id and user_id is null;
    perform set_config('app.signup_link', 'off', true);
    return 'linked';
  end if;

  if p_partner is not null then
    select count(*), min(t.id) into v_n, v_team_id from public.teams t
    where t.sport = 'padel' and t.user_id is not null and t.user_id <> p_user and t.user_id_2 is null
      and (public.pair_key(t.name) = public.pair_key(v_team_name)
           or public.pair_loose_match(t.name, p_name, p_partner));
    if v_n = 1 then
      perform public.padel_request(v_team_id, p_user, p_name);
      return 'requested';
    elsif v_n > 1 then
      return 'ambiguous';
    end if;
    if exists (select 1 from public.teams t
               where t.sport = 'padel' and t.user_id is not null and t.user_id_2 is not null
                 and (public.pair_key(t.name) = public.pair_key(v_team_name)
                      or public.pair_loose_match(t.name, p_name, p_partner))) then
      return 'full';
    end if;
  end if;

  insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
  values (v_team_name, 'padel', null, null, 0, 0, p_user);

  if p_partner is not null and cardinality(public.name_tokens(p_partner)) >= 2 then
    begin
      select count(*), (array_agg(p.id))[1] into v_n, v_partner_id
      from public.profiles p
      where p.id <> p_user and public.name_loose_match(p.full_name, p_partner)
        and public.padel_team_count(p.id) < 2
        and exists (select 1 from auth.users u where u.id = p.id);
      if v_n = 1 then
        insert into public.notifications (user_id, type, message)
        values (v_partner_id, 'pair', p_name || ' te ha apuntado como su pareja de pádel ("' || v_team_name || '"). Si es así, entra en Pádel > Mi Disponibilidad, busca esa pareja y pulsa "Es mi pareja". Si juegas en dos grupos, usa "Añadir mi otra pareja".');
      end if;
    exception when others then null;
    end;
  end if;
  return 'created';
end $function$;

create or replace function public.padel_create_pair(p_partner_name text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); v_name text; v_partner text; v_status text; v_dup text; v_before bigint;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  if public.padel_team_count(v_uid) >= 2 then
    raise exception 'Ya estás en dos parejas de pádel (es el máximo). Si alguna sobra, pide a los monitores que la borren.' using errcode = 'P0001';
  end if;
  select left(nullif(trim(full_name), ''), 80) into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'Tu perfil no tiene nombre. Pide a los monitores que lo corrijan.' using errcode = 'P0001'; end if;
  v_partner := left(nullif(trim(regexp_replace(replace(coalesce(p_partner_name, ''), '/', ' '), '\s+', ' ', 'g')), ''), 80);
  if v_partner is null or char_length(v_partner) < 3 then
    raise exception 'Escribe el nombre y el apellido de tu pareja.' using errcode = 'P0001';
  end if;
  if public.norm_name(v_partner) = public.norm_name(v_name) then
    raise exception 'Aquí va el nombre de tu pareja, no el tuyo.' using errcode = 'P0001';
  end if;
  select t.name into v_dup from public.teams t
  where t.sport = 'padel' and (t.user_id = v_uid or t.user_id_2 = v_uid)
    and (public.pair_key(t.name) = public.pair_key(v_name || ' / ' || v_partner) or public.pair_loose_match(t.name, v_name, v_partner))
  limit 1;
  if v_dup is not null then
    raise exception 'Ya tienes una pareja con esa persona: "%".', v_dup using errcode = 'P0001';
  end if;
  select max(id) into v_before from public.teams where sport = 'padel' and (user_id = v_uid or user_id_2 = v_uid);
  v_status := public.padel_attach(v_uid, v_name, v_partner);
  if v_status in ('linked', 'created') then delete from public.pair_requests where user_id = v_uid; end if;
  return jsonb_build_object('status', v_status, 'team_id',
    (select max(id) from public.teams where sport = 'padel' and (user_id = v_uid or user_id_2 = v_uid)
       and (v_before is null or id <> v_before)));
end $function$;

-- 6) Unirse: se permite con una o ninguna pareja; con dos, solo si una es la repetida de esta
create or replace function public.padel_join_pair(p_team_id bigint)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); v_name text; t record;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  select left(nullif(trim(full_name), ''), 80) into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'Tu perfil no tiene nombre. Pide a los monitores que lo corrijan.' using errcode = 'P0001'; end if;

  select id, sport, user_id, user_id_2 into t from public.teams where id = p_team_id;
  if not found or t.sport <> 'padel' then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if t.user_id = v_uid or t.user_id_2 = v_uid then raise exception 'Ya estás en esta pareja.' using errcode = 'P0001'; end if;
  if t.user_id is not null and t.user_id_2 is not null then raise exception 'Esa pareja ya tiene sus dos cuentas.' using errcode = 'P0001'; end if;
  if t.user_id is not null and exists (select 1 from public.teams o where o.sport = 'padel' and o.id <> t.id
       and ((o.user_id = v_uid and o.user_id_2 = t.user_id) or (o.user_id = t.user_id and o.user_id_2 = v_uid))) then
    raise exception 'Ya tienes otra pareja con esa misma persona.' using errcode = 'P0001';
  end if;
  if public.padel_team_count(v_uid) >= 2 and public.padel_dup_of(v_uid, p_team_id) is null then
    raise exception 'Ya estás en dos parejas de pádel (es el máximo). Si alguna sobra, pide a los monitores que la borren.' using errcode = 'P0001';
  end if;

  perform public.padel_request(p_team_id, v_uid, v_name);
  return jsonb_build_object('status', 'requested', 'team_id', p_team_id);
end $function$;

create or replace function public.padel_respond_join(p_request_id bigint, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); r record; t record; v_who text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  select * into r from public.pair_requests where id = p_request_id for update;
  if not found then raise exception 'Esa solicitud ya no existe (puede que la hayan retirado).' using errcode = 'P0001'; end if;
  select id, name, sport, user_id, user_id_2 into t from public.teams where id = r.team_id for update;
  if not found then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if not (public.is_admin() or coalesce(t.user_id = v_uid, false)) then
    raise exception 'Solo quien creó la pareja o un monitor puede responder a la solicitud.' using errcode = 'P0001';
  end if;
  select coalesce(nullif(trim(full_name), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;

  if not coalesce(p_accept, false) then
    delete from public.pair_requests where id = r.id;
    begin
      insert into public.notifications (user_id, type, message)
      values (r.user_id, 'pair', coalesce(v_who, 'Tu pareja') || ' no ha aceptado tu solicitud para la pareja "' || t.name || '". Si es un error, habla con tu pareja o con los monitores.');
    exception when others then null;
    end;
    return jsonb_build_object('status', 'rejected');
  end if;

  if t.user_id is not null and t.user_id_2 is not null then
    raise exception 'Esa pareja ya tiene sus dos cuentas.' using errcode = 'P0001';
  end if;
  perform public.padel_drop_dup_ficha(r.user_id, t.id);   -- solo su ficha repetida de ESTA pareja
  perform public.padel_seat(t.id, r.user_id);
  begin
    insert into public.notifications (user_id, type, message)
    values (r.user_id, 'pair', case when public.is_admin() and t.user_id is distinct from v_uid
              then 'Los monitores te han unido a la pareja "' || t.name || '".'
              else coalesce(v_who, 'Tu pareja') || ' te ha aceptado. Ya estáis juntos en la pareja "' || t.name || '".' end
            || ' Veis los dos lo mismo: partido, avisos y horas.');
  exception when others then null;
  end;
  return jsonb_build_object('status', 'accepted', 'team_id', t.id);
end $function$;

-- 7) Monitores: en pádel, hasta dos parejas por cuenta
create or replace function public.admin_link_team(p_team_id bigint, p_user_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare v_sport text; v_cat text; v_owner uuid; v_owner2 uuid; v_name text;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede vincular cuentas.'; end if;
  perform public.padel_lock();
  select sport, category, user_id, user_id_2, name into v_sport, v_cat, v_owner, v_owner2, v_name from public.teams where id = p_team_id for update;
  if v_sport is null then raise exception 'Jugador no encontrado.'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'Cuenta no encontrada.'; end if;
  if v_sport = 'padel' then
    if v_owner = p_user_id or v_owner2 = p_user_id then raise exception 'Esa cuenta ya está en esta pareja.'; end if;
    if public.padel_team_count(p_user_id) >= 2 then raise exception 'Esa cuenta ya está en dos parejas de pádel (es el máximo). Desvincúlala de una primero.'; end if;
  elsif exists (select 1 from public.teams where (user_id = p_user_id or user_id_2 = p_user_id) and sport = v_sport and category is not distinct from v_cat) then
    raise exception 'Esa cuenta ya está vinculada a otro jugador de esta categoría.';
  end if;
  if v_owner is null then
    update public.teams set user_id = p_user_id where id = p_team_id and user_id is null;
  elsif v_sport = 'padel' and v_owner2 is null then
    update public.teams set user_id_2 = p_user_id where id = p_team_id and user_id_2 is null;
  elsif v_sport = 'padel' then
    raise exception 'Esa pareja ya tiene sus dos cuentas. Desvincula una primero.';
  else
    raise exception 'Ese jugador ya tiene una cuenta vinculada. Desvincúlala primero.';
  end if;
  if not found then raise exception 'No se pudo vincular: la ficha ha cambiado. Recarga y vuelve a intentarlo.'; end if;
  if v_sport = 'padel' then
    delete from public.pair_requests where user_id = p_user_id;
    if exists (select 1 from public.teams t where t.id = p_team_id and t.user_id_2 is not null) then
      begin
        insert into public.notifications (user_id, type, message)
        select r.user_id, 'pair', 'La pareja "' || v_name || '" ya tiene sus dos cuentas. Si era la tuya, habla con tu pareja o con los monitores.'
        from public.pair_requests r where r.team_id = p_team_id;
      exception when others then null;
      end;
      delete from public.pair_requests where team_id = p_team_id;
    end if;
  end if;
end $function$;

-- 8) Permisos (internas: nadie desde la app)
revoke execute on function public.padel_team_count(uuid), public.padel_dup_of(uuid, bigint),
  public.padel_drop_dup_ficha(uuid, bigint), public.enforce_padel_pair_rules()
  from public, anon, authenticated;

notify pgrst, 'reload schema';
