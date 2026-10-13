-- 14 · Monitores: cambiar a un jugador de deporte/categoría — 13/10/2026
-- Para quien se registró en el deporte (o categoría de tenis) equivocado. En un solo paso:
--   1) crea (o encuentra) su ficha en el destino: tenis adultos, tenis juveniles o pádel (con su pareja)
--   2) quita su cuenta de la ficha de origen: la borra si se queda sin cuentas (y sin partidos);
--      en pádel, si la pareja tiene otra cuenta, la pareja se queda con ella
--   3) le avisa (campana y móvil)
-- No se hace si la ficha de origen tiene partidos (se perderían resultados): eso a mano.
set local lock_timeout = '4s';

create or replace function public.admin_move_player(p_team_id bigint, p_user_id uuid, p_target text, p_partner text default null)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  t record; v_name text; v_partner text; v_status text; v_dest bigint; v_target_cat text; v_label text;
  v_others int; v_req bigint;
begin
  if not public.is_admin() then raise exception 'Solo los monitores pueden cambiar a un jugador de deporte.'; end if;
  if p_target not in ('padel', 'adults', 'juveniles') then raise exception 'Destino no válido.' using errcode = 'P0001'; end if;
  perform public.padel_lock();

  select id, name, sport, category, user_id, user_id_2 into t from public.teams where id = p_team_id for update;
  if not found then raise exception 'Ficha no encontrada.' using errcode = 'P0001'; end if;
  if p_user_id is null or (t.user_id is distinct from p_user_id and t.user_id_2 is distinct from p_user_id) then
    raise exception 'Esa cuenta no está en esta ficha.' using errcode = 'P0001';
  end if;
  if (t.sport = 'padel' and p_target = 'padel') or (t.sport = 'tennis' and t.category = p_target) then
    raise exception 'Ya está en ese deporte y categoría.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.matches m where m.team1_id = t.id or m.team2_id = t.id) then
    raise exception 'Esta ficha ya tiene partidos: no se puede mover sin perder resultados. Crea la ficha nueva a mano y vincula la cuenta.' using errcode = 'P0001';
  end if;
  select left(nullif(trim(full_name), ''), 80) into v_name from public.profiles where id = p_user_id;
  if v_name is null then raise exception 'Esa cuenta no tiene nombre.' using errcode = 'P0001'; end if;

  -- ── 1) Destino ──
  if p_target = 'padel' then
    v_partner := left(nullif(trim(regexp_replace(replace(coalesce(p_partner, ''), '/', ' '), '\s+', ' ', 'g')), ''), 80);
    if v_partner is null or char_length(v_partner) < 3 then
      raise exception 'Escribe el nombre y apellido de su pareja de pádel.' using errcode = 'P0001';
    end if;
    if public.norm_name(v_partner) = public.norm_name(v_name) then
      raise exception 'La pareja no puede ser la misma persona.' using errcode = 'P0001';
    end if;
    if public.padel_team_count(p_user_id) >= 2 then
      raise exception '% ya está en dos parejas de pádel.', v_name using errcode = 'P0001';
    end if;
    v_status := public.padel_attach(p_user_id, v_name, v_partner);
    if v_status = 'requested' then
      -- Su compañero/a ya había creado la pareja: lo confirma el monitor directamente
      select team_id into v_dest from public.pair_requests where user_id = p_user_id;
      perform public.padel_seat(v_dest, p_user_id);
    elsif v_status in ('ambiguous', 'full') then
      raise exception '%', case when v_status = 'ambiguous'
        then 'Hay varias parejas de pádel que encajan con esos nombres. Créala o vincúlala a mano desde Pádel > Parejas.'
        else 'La pareja con esos nombres ya tiene sus dos cuentas. Revísala en Pádel > Parejas.' end using errcode = 'P0001';
    else
      select max(id) into v_dest from public.teams where sport = 'padel' and (user_id = p_user_id or user_id_2 = p_user_id);
    end if;
    v_label := 'Pádel';
  else
    v_target_cat := p_target;
    if exists (select 1 from public.teams where sport = 'tennis' and category = v_target_cat and (user_id = p_user_id or user_id_2 = p_user_id)) then
      raise exception '% ya tiene ficha en tenis %.', v_name, case when v_target_cat = 'adults' then 'adultos' else 'juveniles' end using errcode = 'P0001';
    end if;
    -- Ficha creada a mano con su mismo nombre, sin cuenta y sin partidos: se vincula a esa
    select tt.id into v_dest from public.teams tt
    where tt.sport = 'tennis' and tt.category = v_target_cat and tt.user_id is null
      and public.norm_name(tt.name) = public.norm_name(v_name)
      and not exists (select 1 from public.matches m where m.team1_id = tt.id or m.team2_id = tt.id)
    order by tt.id limit 1;
    if v_dest is not null then
      update public.teams set user_id = p_user_id where id = v_dest and user_id is null;
    else
      insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
      values (v_name, 'tennis', v_target_cat, null, 0, 0, p_user_id) returning id into v_dest;
    end if;
    v_label := case when v_target_cat = 'adults' then 'Tenis adultos' else 'Tenis juveniles' end;
  end if;

  -- ── 2) Origen ──
  v_others := (case when t.user_id is not null and t.user_id <> p_user_id then 1 else 0 end)
            + (case when t.user_id_2 is not null and t.user_id_2 <> p_user_id then 1 else 0 end);
  if v_others = 0 then
    delete from public.availability where team_id = t.id;
    delete from public.teams where id = t.id;
  else
    -- Pareja de pádel con otra cuenta: se queda la otra persona (el trigger sube el asiento 2 al 1)
    update public.teams
       set user_id   = case when user_id   = p_user_id then null else user_id   end,
           user_id_2 = case when user_id_2 = p_user_id then null else user_id_2 end
     where id = t.id;
  end if;
  delete from public.pair_requests where user_id = p_user_id;

  -- ── 3) Aviso ──
  begin
    insert into public.notifications (user_id, type, message)
    values (p_user_id, 'general', 'Los monitores te han cambiado a ' || v_label
      || case when p_target = 'padel' then ' (pareja con ' || v_partner || ')' else '' end
      || '. Entra en ' || case when p_target = 'padel' then 'Pádel' else 'Tenis' end || ' > Mi Disponibilidad y marca tus horas.');
  exception when others then null;
  end;

  return jsonb_build_object('team_id', v_dest, 'target', p_target, 'status', coalesce(v_status, 'created'));
end $function$;

revoke execute on function public.admin_move_player(bigint, uuid, text, text) from public, anon;
grant execute on function public.admin_move_player(bigint, uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
