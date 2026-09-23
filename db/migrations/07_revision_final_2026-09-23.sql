-- 07 — Revisión final (23/09/2026). Aplicado en producción como migración
--   revision_final_seguridad_y_vinculacion_admin
--
-- Resumen: sin oráculo del código de invitación, código no legible por jugadores, autor del chat
-- fijado en servidor, vinculación automática solo para fichas sin historial, RPC para que el admin
-- vincule cuentas, guardado atómico de disponibilidad y pistas extra de una sola vez.

-- 1) Sin oráculo para fuerza bruta del código de invitación: solo lo comprueba el trigger de alta
revoke execute on function public.check_invite_code(text) from public, anon, authenticated;

-- 2) El código de registro no es legible por jugadores (solo admin)
drop policy if exists p_settings_select on public.app_settings;
create policy p_settings_select on public.app_settings
  for select to authenticated
  using (key <> 'registration_code' or public.is_admin());

-- 3) El nombre del autor de un comentario lo fija el servidor (evita suplantación en chat y campana)
create or replace function public.stamp_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  new.author_name := coalesce((select full_name from public.profiles where id = auth.uid()), 'Jugador');
  return new;
end $$;
drop trigger if exists trg_stamp_comment_author on public.match_comments;
create trigger trg_stamp_comment_author before insert on public.match_comments
  for each row execute function public.stamp_comment_author();

-- 4) La vinculación automática por nombre solo se hace con fichas SIN historial (no hay puntos
--    ni partidos que apropiarse). Las fichas con partidos las vincula el admin a mano (5).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_sport text; v_category text; v_code text; v_required text; v_team_id bigint;
begin
  select value into v_required from public.app_settings where key = 'registration_code';
  v_code := new.raw_user_meta_data->>'invite_code';
  if coalesce(v_required, '') <> '' and upper(trim(coalesce(v_code, ''))) <> upper(trim(v_required)) then
    raise exception 'INVITE_CODE_INVALID' using errcode = 'P0001';
  end if;
  v_sport := case when new.raw_user_meta_data->>'sport' in ('tennis', 'padel') then new.raw_user_meta_data->>'sport' else 'tennis' end;
  v_category := case when v_sport = 'tennis'
                     then (case when new.raw_user_meta_data->>'category' in ('adults', 'juveniles') then new.raw_user_meta_data->>'category' else 'adults' end)
                     else null end;
  v_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)), 80);
  insert into public.profiles (id, full_name, role) values (new.id, v_name, 'player') on conflict (id) do nothing;

  select t.id into v_team_id
  from public.teams t
  where t.sport = v_sport
    and t.category is not distinct from v_category
    and t.user_id is null
    and public.norm_name(t.name) = public.norm_name(v_name)
    and not exists (select 1 from public.matches m where m.team1_id = t.id or m.team2_id = t.id)
  order by t.id limit 1;

  if v_team_id is not null then
    perform set_config('app.signup_link', 'on', true);
    update public.teams set user_id = new.id where id = v_team_id and user_id is null;
    perform set_config('app.signup_link', 'off', true);
  else
    insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
    values (v_name, v_sport, v_category, null, 0, 0, new.id);
  end if;
  return new;
end $$;

-- 5) El admin vincula una cuenta a una ficha desde la app (botón "Vincular cuenta" en Jugadores)
create or replace function public.admin_link_team(p_team_id bigint, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sport text; v_cat text; v_owner uuid;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede vincular cuentas.'; end if;
  select sport, category, user_id into v_sport, v_cat, v_owner from public.teams where id = p_team_id;
  if v_sport is null then raise exception 'Jugador no encontrado.'; end if;
  if v_owner is not null then raise exception 'Ese jugador ya tiene una cuenta vinculada. Desvincúlala primero.'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'Cuenta no encontrada.'; end if;
  if exists (select 1 from public.teams where user_id = p_user_id and sport = v_sport and category is not distinct from v_cat) then
    raise exception 'Esa cuenta ya está vinculada a otro jugador de esta categoría.';
  end if;
  update public.teams set user_id = p_user_id where id = p_team_id and user_id is null;
end $$;
grant execute on function public.admin_link_team(bigint, uuid) to authenticated;

-- 6) Guardar disponibilidad de forma ATÓMICA y con el error real
create or replace function public.set_team_availability(p_team_id bigint, p_slots jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_key text; v_locked boolean;
begin
  select user_id into v_owner from public.teams where id = p_team_id;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  if not public.is_admin() and (v_owner is null or v_owner <> auth.uid()) then
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
end $$;
grant execute on function public.set_team_availability(bigint, jsonb) to authenticated;

-- 7) Pistas EXTRA de una sola vez sobre una hora que ya existe
alter table public.court_availability add column if not exists extra_once integer not null default 0;
alter table public.court_availability add column if not exists extra_expires_at timestamptz null;

-- 8) La edge function send-schedule-email quedó DESHABILITADA (ver supabase/functions/...). Si se
--    reconstruye el proyecto, NO desplegarla con verify_jwt=false ni con claves en el código.
