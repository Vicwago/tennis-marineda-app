-- 10 · Parejas de pádel: remates de la revisión de código — 06/10/2026
-- Solo funciones (mismas firmas: los permisos de la 09 se conservan). Tenis no cambia.
--  · "Esta semana no jugamos": el aviso al compañero/a sale también si quien lo pulsa es un monitor que juega.
--  · Juntar parejas repetidas: las horas de la ficha sobrante se borran de forma explícita.
--  · Quien tenía una solicitud a una pareja que se completa (o que se borra al juntarse) recibe un aviso.
--  · Aceptar y cancelar a la vez una solicitud ya no puede dejar unido a quien acababa de cancelar.
--  · Vincular/desvincular de los monitores va en la misma fila que el resto de operaciones de pareja.
--  · Un aviso que falle nunca tumba la operación.

create or replace function public.enforce_team_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_key text; v_locked boolean; v_uid uuid; v_other uuid; v_who text;
begin
  -- Vinculación desde el alta de cuenta: solo puede pasar de "sin cuenta" a una cuenta
  -- concreta, y solo dentro de handle_new_user / padel_attach (flag local a la transacción).
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
    -- Enlaces de pareja hechos por las RPC de confianza (padel_*): solo pádel, solo asientos.
    if old.sport <> 'padel' then raise exception 'Operación de pareja fuera de pádel.' using errcode = 'P0001'; end if;
    new.points := old.points; new.matches_played := old.matches_played; new.group_name := old.group_name;
    new.name := old.name; new.sport := old.sport; new.category := old.category; new.week_off := old.week_off;
  elsif not public.is_admin() then
    new.points := old.points; new.matches_played := old.matches_played; new.group_name := old.group_name;
    new.name := old.name; new.sport := old.sport; new.category := old.category; new.user_id := old.user_id;
    -- El asiento 2 tampoco lo cambia un jugador. Única excepción: se ha borrado esa cuenta
    -- (la clave foránea lo pone a nulo; sin esto el trigger lo desharía y quedaría colgando).
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

  -- Pádel: si uno de la pareja cambia "esta semana no jugamos", se avisa al otro. Vale igual
  -- para un monitor que además juega (antes solo salía para jugadores). Nunca bloquea el cambio.
  if old.sport = 'padel' and new.week_off is distinct from old.week_off then
    v_uid := auth.uid();
    if v_uid is not null then
      v_other := case when old.user_id = v_uid then old.user_id_2 when old.user_id_2 = v_uid then old.user_id end;
      if v_other is not null then
        begin
          select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;
          insert into public.notifications (user_id, type, message)
          values (v_other, 'pair', coalesce(v_who, 'Tu pareja') || case when new.week_off
                    then ' ha avisado de que esta semana no jugáis.'
                    else ' ha vuelto a apuntaros para jugar esta semana.' end);
        exception when others then null;
        end;
      end if;
    end if;
  end if;

  -- Si se queda sin asiento 1 pero hay asiento 2, el 2 pasa a ser el 1 (p. ej. al desvincular)
  if new.user_id is null and new.user_id_2 is not null then
    new.user_id := new.user_id_2; new.user_id_2 := null;
  end if;
  if new.user_id_2 is not null and new.user_id_2 = new.user_id then
    new.user_id_2 := null;
  end if;
  -- Una cuenta no puede estar en dos parejas de pádel (cruce asiento 1 / asiento 2)
  if new.sport = 'padel' and (new.user_id is distinct from old.user_id or new.user_id_2 is distinct from old.user_id_2) then
    if exists (select 1 from public.teams t where t.sport = 'padel' and t.id <> new.id
               and ((new.user_id is not null and (t.user_id = new.user_id or t.user_id_2 = new.user_id))
                 or (new.user_id_2 is not null and (t.user_id = new.user_id_2 or t.user_id_2 = new.user_id_2)))) then
      raise exception 'Esa cuenta ya está en otra pareja de pádel.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.padel_drop_own_ficha(p_user uuid)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_own bigint; v_locked boolean;
begin
  v_own := public.padel_team_of(p_user);
  if v_own is null then return; end if;
  if not exists (select 1 from public.teams t where t.id = v_own and t.user_id = p_user and t.user_id_2 is null)
     or exists (select 1 from public.matches m where m.team1_id = v_own or m.team2_id = v_own) then
    raise exception 'Esa persona ya está en otra pareja de pádel con partidos o con compañero. Que lo revisen los monitores.' using errcode = 'P0001';
  end if;
  -- Borrar la ficha borra sus horas; con el plazo cerrado solo lo hacen los monitores
  if not public.is_admin() then
    select (value = 'true') into v_locked from public.app_settings where key = 'availability_locked__padel';
    if coalesce(v_locked, false) then
      raise exception 'Los monitores tienen cerrado el plazo de pádel para preparar la jornada. Volved a intentarlo cuando lo abran, o pedidles que os unan ellos.' using errcode = 'P0001';
    end if;
  end if;
  -- Quien había pedido unirse a la ficha que desaparece se entera
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

create or replace function public.padel_seat(p_team_id bigint, p_user uuid)
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare t record; v_seat int;
begin
  select id, name, sport, user_id, user_id_2 into t from public.teams where id = p_team_id for update;
  if not found or t.sport <> 'padel' then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if t.user_id = p_user or t.user_id_2 = p_user then raise exception 'Esa cuenta ya está en esta pareja.' using errcode = 'P0001'; end if;
  if public.padel_team_of(p_user) is not null then raise exception 'Esa cuenta ya está en otra pareja de pádel.' using errcode = 'P0001'; end if;
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
  -- Ya no hacen falta: la solicitud de esta persona y, si la pareja está completa, las demás
  -- (a esas otras personas se les avisa: su solicitud no desaparece sin más).
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

create or replace function public.padel_request(p_team_id bigint, p_user uuid, p_name text)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare t record; v_prev bigint; v_msg text;
begin
  select id, name, sport, user_id, user_id_2 into t from public.teams where id = p_team_id;
  if not found or t.sport <> 'padel' then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  select team_id into v_prev from public.pair_requests where user_id = p_user;
  if v_prev is not distinct from p_team_id then return; end if;   -- ya estaba pedida: no se repite el aviso
  insert into public.pair_requests (team_id, user_id, requester_name)
  values (p_team_id, p_user, left(coalesce(nullif(trim(p_name), ''), 'Jugador'), 80))
  on conflict (user_id) do update set team_id = excluded.team_id, requester_name = excluded.requester_name, created_at = now();
  begin
    if t.user_id is not null then
      insert into public.notifications (user_id, type, message)
      values (t.user_id, 'pair', left(p_name, 80) || ' quiere unirse a tu pareja de pádel "' || t.name || '". Entra en Pádel > Mi Disponibilidad y dinos si es tu pareja.');
    else
      v_msg := left(p_name, 80) || ' pide entrar en la pareja de pádel "' || t.name || '", que aún no tiene ninguna cuenta. Revísalo en Pádel > Parejas.';
      insert into public.notifications (user_id, type, message)
      select p.id, 'pair', v_msg from public.profiles p
      where p.role = 'admin' and exists (select 1 from auth.users u where u.id = p.id);
    end if;
  exception when others then null;   -- la solicitud queda hecha aunque el aviso falle
  end;
end $function$;

create or replace function public.padel_respond_join(p_request_id bigint, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); r record; t record; v_who text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  -- for update: si quien la pidió la cancela justo ahora, o llega antes (y aquí ya no existe)
  -- o espera a que esto termine; nunca queda unido alguien que acababa de cancelar.
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
  perform public.padel_drop_own_ficha(r.user_id);   -- su pareja repetida, si la tenía
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

create or replace function public.padel_unlink_partner(p_team_id bigint)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); t record; v_removed uuid; v_who text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  select id, name, sport, user_id, user_id_2 into t from public.teams where id = p_team_id for update;
  if not found or t.sport <> 'padel' then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if t.user_id_2 is null then raise exception 'Esta pareja solo tiene una cuenta.' using errcode = 'P0001'; end if;
  if not (public.is_admin() or coalesce(t.user_id = v_uid, false) or coalesce(t.user_id_2 = v_uid, false)) then
    raise exception 'No puedes cambiar las cuentas de otra pareja.' using errcode = 'P0001';
  end if;
  v_removed := t.user_id_2;
  perform set_config('app.pair_link', 'on', true);
  update public.teams set user_id_2 = null where id = p_team_id;
  perform set_config('app.pair_link', 'off', true);
  begin
    select coalesce(nullif(trim(full_name), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;
    if v_removed = v_uid then
      insert into public.notifications (user_id, type, message)
      values (t.user_id, 'pair', coalesce(v_who, 'Tu pareja') || ' ha salido de vuestra pareja "' || t.name || '" en la app. Tú sigues pudiendo marcar las horas.');
    else
      insert into public.notifications (user_id, type, message)
      values (v_removed, 'pair', 'Tu cuenta ya no está unida a la pareja "' || t.name || '". Si es un error, habla con tu pareja o con los monitores.');
    end if;
  exception when others then null;
  end;
end $function$;

create or replace function public.admin_link_team(p_team_id bigint, p_user_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare v_sport text; v_cat text; v_owner uuid; v_owner2 uuid; v_name text;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede vincular cuentas.'; end if;
  perform public.padel_lock();   -- en fila con las operaciones de pareja de los jugadores
  select sport, category, user_id, user_id_2, name into v_sport, v_cat, v_owner, v_owner2, v_name from public.teams where id = p_team_id for update;
  if v_sport is null then raise exception 'Jugador no encontrado.'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'Cuenta no encontrada.'; end if;
  if exists (select 1 from public.teams where (user_id = p_user_id or user_id_2 = p_user_id) and sport = v_sport and category is not distinct from v_cat) then
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
    -- Ya no hacen falta: la solicitud de esa cuenta y, si la pareja queda completa, las demás (con aviso)
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

create or replace function public.admin_unlink_team(p_team_id bigint, p_user_id uuid)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede desvincular cuentas.'; end if;
  perform public.padel_lock();
  -- Si se quita el asiento 1 y hay asiento 2, el trigger sube al 2 al asiento 1
  update public.teams
     set user_id   = case when user_id   = p_user_id then null else user_id   end,
         user_id_2 = case when user_id_2 = p_user_id then null else user_id_2 end
   where id = p_team_id and (user_id = p_user_id or user_id_2 = p_user_id);
  if not found then raise exception 'Esa cuenta no está vinculada a esta ficha.'; end if;
end $function$;

notify pgrst, 'reload schema';
