-- 08 · Pádel: una cuenta por pareja (capitán/a) — aplicada en producción el 05/10/2026
-- Quien se registra en pádel indica el nombre de su compañero/a (metadata partner_name) y
-- la ficha se llama "Capitán / Compañero". Esa cuenta marca las horas de la pareja y
-- recibe los avisos. Si el compañero también se registra con la misma pareja, no se
-- duplica la ficha: su cuenta entra sin ficha propia.

-- Clave de pareja: los mismos dos nombres en cualquier orden y con cualquier separador
-- ("Ana / Bea", "bea y ana", "Ana & Bea", "Ana - Bea"...).
create or replace function public.pair_key(txt text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select coalesce(string_agg(p, '|' order by p), '')
  from (
    select trim(x) as p
    from regexp_split_to_table(public.norm_name(txt), '\s*[/&+,;]\s*|\s+(?:y|e|-|–)\s+') as x
  ) s
  where p <> ''
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name text; v_partner text; v_team_name text; v_sport text; v_category text;
  v_code text; v_required text; v_team_id bigint;
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
  -- Solo pádel: nombre del compañero/a (sin barras, que son el separador de la ficha)
  v_partner := case when v_sport = 'padel'
                    then left(nullif(trim(regexp_replace(replace(coalesce(new.raw_user_meta_data->>'partner_name', ''), '/', ' '), '\s+', ' ', 'g')), ''), 80)
                    else null end;
  v_team_name := case when v_partner is not null then v_name || ' / ' || v_partner else v_name end;
  insert into public.profiles (id, full_name, role) values (new.id, v_name, 'player') on conflict (id) do nothing;

  -- 1) Ficha creada a mano por los monitores, sin cuenta y sin partidos: se vincula sola.
  select t.id into v_team_id
  from public.teams t
  where t.sport = v_sport
    and t.category is not distinct from v_category
    and t.user_id is null
    and (public.norm_name(t.name) = public.norm_name(v_team_name)
         or (v_partner is not null and public.pair_key(t.name) = public.pair_key(v_team_name)))
    and not exists (select 1 from public.matches m where m.team1_id = t.id or m.team2_id = t.id)
  order by t.id limit 1;

  if v_team_id is not null then
    perform set_config('app.signup_link', 'on', true);
    update public.teams set user_id = new.id where id = v_team_id and user_id is null;
    perform set_config('app.signup_link', 'off', true);
  elsif v_partner is not null and exists (
      select 1 from public.teams t
      where t.sport = 'padel' and t.user_id is not null
        and public.pair_key(t.name) = public.pair_key(v_team_name)) then
    -- 2) Pádel: su compañero/a ya registró esta misma pareja (es el capitán/a).
    --    No se duplica la pareja: esta cuenta entra sin ficha propia.
    null;
  else
    insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
    values (v_team_name, v_sport, v_category, null, 0, 0, new.id);
  end if;
  return new;
end $function$;

revoke execute on function public.pair_key(text) from anon, authenticated, public;
