-- 05 — Vinculación automática cuenta ↔ jugador dado de alta a mano (22/09/2026)
--
-- Problema: la pantalla "Añadir jugador a mano" prometía que la persona se vincularía
-- al registrarse con el mismo nombre, pero handle_new_user creaba SIEMPRE un equipo
-- nuevo -> el jugador salía duplicado y la ficha original se quedaba sin dueño.
--
-- Además, enforce_team_update congela user_id para todo el que no sea admin (impide que
-- un jugador se apropie del equipo de otro). Eso también bloqueaba la vinculación
-- legítima, así que se abre una excepción explícita y acotada mediante un flag local
-- a la transacción que solo pone handle_new_user.

-- Normaliza nombres para comparar: sin tildes, sin mayúsculas, sin espacios de más.
create or replace function public.norm_name(txt text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
           lower(trim(translate(coalesce(txt, ''),
             'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñÇç',
             'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'))),
           '\s+', ' ', 'g')
$$;

create or replace function public.enforce_team_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_key text; v_locked boolean;
begin
  -- Excepción: vinculación desde el alta de cuenta. Solo puede pasar de "sin cuenta"
  -- a una cuenta concreta y sin tocar ningún otro campo.
  if coalesce(current_setting('app.signup_link', true), '') = 'on'
     and old.user_id is null and new.user_id is not null
     and new.name is not distinct from old.name
     and new.sport is not distinct from old.sport
     and new.category is not distinct from old.category
     and new.points is not distinct from old.points
     and new.matches_played is not distinct from old.matches_played then
    return new;
  end if;

  if not public.is_admin() then
    new.points := old.points; new.matches_played := old.matches_played; new.group_name := old.group_name;
    new.name := old.name; new.sport := old.sport; new.category := old.category; new.user_id := old.user_id;
    if new.week_off is distinct from old.week_off then
      v_key := public.availability_scope_key(old.id);
      select (value = 'true') into v_locked from public.app_settings where key = v_key;
      if coalesce(v_locked, false) then
        raise exception 'La disponibilidad está bloqueada por el administrador para esta categoría.' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  -- ¿Ya existe ese jugador dado de alta a mano por el admin y sin cuenta? -> se vincula
  select id into v_team_id
  from public.teams
  where sport = v_sport
    and category is not distinct from v_category
    and user_id is null
    and public.norm_name(name) = public.norm_name(v_name)
  order by id
  limit 1;

  if v_team_id is not null then
    perform set_config('app.signup_link', 'on', true);
    update public.teams set user_id = new.id where id = v_team_id and user_id is null;
    perform set_config('app.signup_link', 'off', true);
  else
    insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
    values (v_name, v_sport, v_category, null, 0, 0, new.id);
  end if;

  return new;
end;
$$;
