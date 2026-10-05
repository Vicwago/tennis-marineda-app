-- 09 · Pádel: dos cuentas por pareja — 05/10/2026
-- Cada pareja de pádel sigue siendo UNA ficha (teams), pero ahora admite dos cuentas:
--   user_id   = asiento 1 (quien creó la pareja)
--   user_id_2 = asiento 2 (su compañero/a)
-- Los dos ven y hacen lo mismo: partido, avisos, chat y UNA disponibilidad compartida.
-- Una pareja sigue funcionando con una sola cuenta. Tenis no cambia (user_id_2 siempre nulo).
--
-- Cómo entra la segunda cuenta: SIEMPRE con el visto bueno de quien creó la pareja (o de un
-- monitor). El nombre solo sirve para proponer a quién pedírselo, nunca para dar acceso:
-- el nombre de una pareja es público en el ranking y no autentica a nadie.
--
-- Se aplica entera en una sola transacción (una única llamada con todas las sentencias).
set local lock_timeout = '4s';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Esquema
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.teams add column if not exists user_id_2 uuid references auth.users(id) on delete set null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'teams_seat2_chk') then
    alter table public.teams add constraint teams_seat2_chk
      check (user_id_2 is null or (sport = 'padel' and user_id is not null and user_id_2 <> user_id));
  end if;
end $$;

-- Una cuenta está como mucho en UNA pareja de pádel por asiento (el cruce asiento 1 /
-- asiento 2 lo comprueba el trigger enforce_team_update y las RPC bajo candado).
create unique index if not exists teams_padel_seat1_uniq on public.teams (user_id) where sport = 'padel' and user_id is not null;
create unique index if not exists teams_padel_seat2_uniq on public.teams (user_id_2) where user_id_2 is not null;

-- Solicitudes de unión a una pareja. Las acepta quien creó la pareja (asiento 1) o un monitor.
create table if not exists public.pair_requests (
  id bigint generated always as identity primary key,
  team_id bigint not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null check (char_length(requester_name) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint pair_requests_one_per_user unique (user_id)   -- una sola solicitud pendiente por cuenta
);
create index if not exists idx_pair_requests_team on public.pair_requests (team_id);
alter table public.pair_requests enable row level security;
revoke all on public.pair_requests from anon, public, authenticated;
grant select, delete on public.pair_requests to authenticated;

drop policy if exists p_pairreq_select on public.pair_requests;
create policy p_pairreq_select on public.pair_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin()
         or exists (select 1 from public.teams t where t.id = pair_requests.team_id
                    and (t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid()))));
-- Quien la envió puede retirarla; aceptar o rechazar va por RPC (padel_respond_join)
drop policy if exists p_pairreq_delete on public.pair_requests;
create policy p_pairreq_delete on public.pair_requests for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Nombres: coincidencia flexible ("Pedro Pérez" ≈ "Pedro Pérez García"). Solo se usa para
--    PROPONER a qué pareja pedir la unión; nunca concede acceso.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.name_tokens(txt text)
returns text[] language sql immutable set search_path to 'public', 'pg_temp' as $$
  select coalesce(array_agg(distinct t), '{}'::text[])
  from regexp_split_to_table(public.norm_name(txt), '[^a-z0-9]+') t
  where t <> ''
$$;

create or replace function public.name_loose_match(a text, b text)
returns boolean language sql immutable set search_path to 'public', 'pg_temp' as $$
  select cardinality(public.name_tokens(a)) > 0 and cardinality(public.name_tokens(b)) > 0
     and (public.name_tokens(a) <@ public.name_tokens(b) or public.name_tokens(b) <@ public.name_tokens(a))
$$;

-- Los dos nombres de una ficha de pareja, en el orden escrito
create or replace function public.pair_parts(txt text)
returns text[] language sql immutable set search_path to 'public', 'pg_temp' as $$
  select coalesce(array_agg(trim(x)) filter (where trim(x) <> ''), '{}'::text[])
  from regexp_split_to_table(public.norm_name(txt), '\s*[/&+,;]\s*|\s+(?:y|e|-|–)\s+') as x
$$;

-- ¿La ficha "A / B" es la pareja formada por estas dos personas (en cualquier orden)?
create or replace function public.pair_loose_match(pair_name text, a text, b text)
returns boolean language sql immutable set search_path to 'public', 'pg_temp' as $$
  select case when cardinality(p) <> 2 then false else
           (public.name_loose_match(p[1], a) and public.name_loose_match(p[2], b))
        or (public.name_loose_match(p[1], b) and public.name_loose_match(p[2], a)) end
  from (select public.pair_parts(pair_name) as p) s
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Perfiles: el nombre lo fija el alta (o un monitor). Es lo que ven los demás en las
--    parejas, en las solicitudes y en el chat, así que un jugador no puede cambiárselo por la API.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if TG_OP = 'INSERT' then
    if not public.is_admin() then new.role := 'player'; end if;
  else
    if not public.is_admin() then
      new.role := old.role;
      if auth.uid() is not null then new.full_name := old.full_name; end if;
    end if;
  end if;
  return new;
end; $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Trigger de teams: los asientos solo los mueven el admin y las RPC de confianza
-- ─────────────────────────────────────────────────────────────────────────────
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
      -- Pádel: si lo cambia uno de la pareja, se avisa al otro (nunca bloquea el cambio)
      v_uid := auth.uid();
      if old.sport = 'padel' and v_uid is not null then
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Políticas: el asiento 2 puede lo mismo que el asiento 1
-- ─────────────────────────────────────────────────────────────────────────────
alter policy p_teams_update on public.teams
  using (user_id = (select auth.uid()) or user_id_2 = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or user_id_2 = (select auth.uid()) or public.is_admin());

alter policy p_avail_select on public.availability
  using (public.is_admin() or team_id in (select t.id from public.teams t where t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid())));
alter policy p_avail_insert on public.availability
  with check (public.is_admin() or team_id in (select t.id from public.teams t where t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid())));
alter policy p_avail_update on public.availability
  using (public.is_admin() or team_id in (select t.id from public.teams t where t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid())))
  with check (public.is_admin() or team_id in (select t.id from public.teams t where t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid())));
alter policy p_avail_delete on public.availability
  using (public.is_admin() or team_id in (select t.id from public.teams t where t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid())));

alter policy p_comments_select on public.match_comments
  using (public.is_admin() or exists (
    select 1 from public.matches mm join public.teams t on (t.id = mm.team1_id or t.id = mm.team2_id)
    where mm.id = match_comments.match_id and (t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid()))));
alter policy p_comments_insert on public.match_comments
  with check ((select auth.uid()) = author_id and (public.is_admin() or exists (
    select 1 from public.matches mm join public.teams t on (t.id = mm.team1_id or t.id = mm.team2_id)
    where mm.id = match_comments.match_id and (t.user_id = (select auth.uid()) or t.user_id_2 = (select auth.uid())))));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Disponibilidad y chat
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_team_availability(p_team_id bigint, p_slots jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_owner uuid; v_owner2 uuid; v_sport text; v_key text; v_locked boolean;
        v_uid uuid := auth.uid(); v_other uuid; v_who text;
begin
  if v_uid is null then raise exception 'Inicia sesión para cambiar la disponibilidad.'; end if;
  select user_id, user_id_2, sport into v_owner, v_owner2, v_sport from public.teams where id = p_team_id;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  if not public.is_admin() and v_owner is distinct from v_uid and v_owner2 is distinct from v_uid then
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

  -- Pádel: las horas son de la pareja. Si las guarda uno, el otro recibe UN aviso (se
  -- sustituye el anterior sin leer para no llenar la campana). Nunca bloquea el guardado.
  if v_sport = 'padel' and (v_owner = v_uid or v_owner2 = v_uid) then
    v_other := case when v_owner = v_uid then v_owner2 else v_owner end;
    if v_other is not null then
      begin
        select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;
        delete from public.notifications where user_id = v_other and type = 'pair_hours' and is_read = false;
        insert into public.notifications (user_id, type, message)
        values (v_other, 'pair_hours', coalesce(v_who, 'Tu pareja') || ' ha guardado vuestras horas de pádel. Míralas en Mi Disponibilidad.');
      exception when others then null;
      end;
    end if;
  end if;
end $function$;

create or replace function public.notify_match_comment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare m record; v_target uuid;
begin
  select team1_id, team2_id, published into m from public.matches where id = new.match_id;
  if m.team1_id is null or not coalesce(m.published, false) then return new; end if;
  for v_target in
    select distinct u.uid
    from public.teams t cross join lateral (values (t.user_id), (t.user_id_2)) as u(uid)
    where t.id in (m.team1_id, m.team2_id) and u.uid is not null and u.uid <> new.author_id
      and exists (select 1 from auth.users au where au.id = u.uid)
  loop
    insert into public.notifications (user_id, match_id, type, message)
    values (v_target, new.match_id, 'match_comment', '💬 ' || coalesce(new.author_name, 'Tu rival') || ': ' || left(new.content, 80));
  end loop;
  return new;
end;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Piezas internas de pareja (no se pueden llamar desde la app)
-- ─────────────────────────────────────────────────────────────────────────────
-- ¿En qué pareja de pádel está ya esta cuenta? (nulo = en ninguna)
create or replace function public.padel_team_of(p_user uuid)
returns bigint language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select id from public.teams where sport = 'padel' and (user_id = p_user or user_id_2 = p_user) order by id limit 1
$$;

-- Todas las operaciones de pareja van en fila (una detrás de otra): con el tamaño del club
-- no se nota y evita carreras (dos altas a la vez, dos personas al mismo hueco...).
create or replace function public.padel_lock()
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  select pg_advisory_xact_lock(hashtext('marineda_padel_pairs'))
$$;

-- Si la cuenta tiene una ficha propia "sobrante" (la creó ella, sin compañero y sin ningún
-- partido, borradores incluidos), se borra para poder unirse a la de su pareja. Si su ficha
-- ya tiene compañero o partidos, no se toca y se avisa.
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
  delete from public.teams where id = v_own;
end $function$;

-- Sienta a p_user en el primer asiento libre de la pareja (el 1 si no tenía ninguna cuenta,
-- si no el 2). Devuelve el asiento ocupado.
create or replace function public.padel_seat(p_team_id bigint, p_user uuid)
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare t record; v_seat int;
begin
  select id, sport, user_id, user_id_2 into t from public.teams where id = p_team_id for update;
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
  delete from public.pair_requests where user_id = p_user;
  if v_seat = 2 then delete from public.pair_requests where team_id = p_team_id; end if;
  return v_seat;
end $function$;

-- Deja una solicitud de unión (una sola pendiente por cuenta) y avisa a quien debe aceptarla:
-- quien creó la pareja, o los monitores si la pareja aún no tiene ninguna cuenta.
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
  if t.user_id is not null then
    insert into public.notifications (user_id, type, message)
    values (t.user_id, 'pair', left(p_name, 80) || ' quiere unirse a tu pareja de pádel "' || t.name || '". Entra en Pádel > Mi Disponibilidad y dinos si es tu pareja.');
  else
    v_msg := left(p_name, 80) || ' pide entrar en la pareja de pádel "' || t.name || '", que aún no tiene ninguna cuenta. Revísalo en Pádel > Parejas.';
    insert into public.notifications (user_id, type, message)
    select p.id, 'pair', v_msg from public.profiles p
    where p.role = 'admin' and exists (select 1 from auth.users u where u.id = p.id);
  end if;
end $function$;

-- Resuelve la pareja de una cuenta a partir de los dos nombres (alta y "Crear mi pareja"):
--   'linked'    → se vinculó a una ficha que los monitores habían creado a mano con esos dos nombres
--   'requested' → su compañero/a ya había creado la pareja: se le ha pedido que le acepte
--   'ambiguous' → hay varias parejas que encajan: tendrá que elegirla en la app
--   'full'      → esa pareja ya tiene sus dos cuentas
--   'created'   → pareja nueva "Nombre / Pareja"
create or replace function public.padel_attach(p_user uuid, p_name text, p_partner text)
returns text
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_team_name text; v_team_id bigint; v_n int; v_partner_id uuid;
begin
  v_team_name := case when p_partner is not null then p_name || ' / ' || p_partner else p_name end;

  -- 1) Ficha creada a mano por los monitores (sin cuentas y sin partidos) con ESOS nombres
  --    exactos → se vincula sola, igual que en tenis.
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
    -- 2) Su compañero/a ya creó la pareja y le queda sitio: se le pide que le acepte.
    --    Solo si hay UNA candidata; con varias, la persona elige en la app.
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
    -- 3) Esa pareja ya tiene sus dos cuentas
    if exists (select 1 from public.teams t
               where t.sport = 'padel' and t.user_id is not null and t.user_id_2 is not null
                 and (public.pair_key(t.name) = public.pair_key(v_team_name)
                      or public.pair_loose_match(t.name, p_name, p_partner))) then
      return 'full';
    end if;
  end if;

  -- 4) Pareja nueva
  insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
  values (v_team_name, 'padel', null, null, 0, 0, p_user);

  -- Si el nombre y apellido que ha escrito encajan con UNA sola cuenta que ya existe y aún
  -- no tiene pareja de pádel (p. ej. un jugador de tenis), se le avisa para que se una.
  if p_partner is not null and cardinality(public.name_tokens(p_partner)) >= 2 then
    begin
      select count(*), (array_agg(p.id))[1] into v_n, v_partner_id
      from public.profiles p
      where p.id <> p_user and public.name_loose_match(p.full_name, p_partner)
        and public.padel_team_of(p.id) is null
        and exists (select 1 from auth.users u where u.id = p.id);
      if v_n = 1 then
        insert into public.notifications (user_id, type, message)
        values (v_partner_id, 'pair', p_name || ' te ha apuntado como su pareja de pádel. Entra en Pádel > Mi Disponibilidad, busca vuestra pareja y pulsa "Unirme".');
      end if;
    exception when others then null;
    end;
  end if;
  return 'created';
end $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Alta de cuenta
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_name text; v_partner text; v_sport text; v_category text;
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
  insert into public.profiles (id, full_name, role) values (new.id, v_name, 'player') on conflict (id) do nothing;

  if v_sport = 'padel' then
    -- Nombre del compañero/a (sin barras, que son el separador de la ficha)
    v_partner := left(nullif(trim(regexp_replace(replace(coalesce(new.raw_user_meta_data->>'partner_name', ''), '/', ' '), '\s+', ' ', 'g')), ''), 80);
    begin
      perform public.padel_lock();
      perform public.padel_attach(new.id, v_name, v_partner);
    exception when others then
      -- Nunca se pierde un alta por un lío con la pareja: la cuenta entra sin pareja y la
      -- persona la crea o se une a la suya desde dentro (Pádel > Mi Disponibilidad).
      raise warning 'padel_attach(%): %', new.id, sqlerrm;
    end;
    return new;
  end if;

  -- Tenis (sin cambios): ficha creada a mano con el mismo nombre, sin cuenta y sin partidos
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
end $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9) Lo que hace un jugador desde la app (Pádel > Mi Disponibilidad)
-- ─────────────────────────────────────────────────────────────────────────────
-- "Crear mi pareja": para cuentas que aún no tienen pareja de pádel (p. ej. jugadores de tenis)
create or replace function public.padel_create_pair(p_partner_name text)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); v_name text; v_partner text; v_status text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  if public.padel_team_of(v_uid) is not null then raise exception 'Ya estás en una pareja de pádel.' using errcode = 'P0001'; end if;
  select left(nullif(trim(full_name), ''), 80) into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'Tu perfil no tiene nombre. Pide a los monitores que lo corrijan.' using errcode = 'P0001'; end if;
  v_partner := left(nullif(trim(regexp_replace(replace(coalesce(p_partner_name, ''), '/', ' '), '\s+', ' ', 'g')), ''), 80);
  if v_partner is null or char_length(v_partner) < 3 then
    raise exception 'Escribe el nombre y el apellido de tu pareja.' using errcode = 'P0001';
  end if;
  if public.norm_name(v_partner) = public.norm_name(v_name) then
    raise exception 'Aquí va el nombre de tu pareja, no el tuyo.' using errcode = 'P0001';
  end if;
  v_status := public.padel_attach(v_uid, v_name, v_partner);
  if v_status in ('linked', 'created') then delete from public.pair_requests where user_id = v_uid; end if;
  return jsonb_build_object('status', v_status, 'team_id', public.padel_team_of(v_uid));
end $function$;

-- "Unirme a mi pareja": deja la solicitud; entra cuando la acepte quien creó la pareja
-- (o un monitor, si esa pareja aún no tiene ninguna cuenta).
create or replace function public.padel_join_pair(p_team_id bigint)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); v_name text; t record; v_own bigint;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  select left(nullif(trim(full_name), ''), 80) into v_name from public.profiles where id = v_uid;
  if v_name is null then raise exception 'Tu perfil no tiene nombre. Pide a los monitores que lo corrijan.' using errcode = 'P0001'; end if;

  select id, sport, user_id, user_id_2 into t from public.teams where id = p_team_id;
  if not found or t.sport <> 'padel' then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if t.user_id = v_uid or t.user_id_2 = v_uid then raise exception 'Ya estás en esta pareja.' using errcode = 'P0001'; end if;
  if t.user_id is not null and t.user_id_2 is not null then raise exception 'Esa pareja ya tiene sus dos cuentas.' using errcode = 'P0001'; end if;

  -- Si ya tengo una pareja propia, solo puedo pedir otra si la mía es "sobrante"
  -- (sin compañero y sin partidos): se borrará cuando me acepten.
  v_own := public.padel_team_of(v_uid);
  if v_own is not null and (
       not exists (select 1 from public.teams o where o.id = v_own and o.user_id = v_uid and o.user_id_2 is null)
       or exists (select 1 from public.matches m where m.team1_id = v_own or m.team2_id = v_own)) then
    raise exception 'Ya estás en una pareja de pádel con partidos o con compañero. Para cambiar de pareja, habla con los monitores.' using errcode = 'P0001';
  end if;

  perform public.padel_request(p_team_id, v_uid, v_name);
  return jsonb_build_object('status', 'requested', 'team_id', p_team_id);
end $function$;

-- Aceptar o rechazar una solicitud: quien creó la pareja (asiento 1) o un monitor
create or replace function public.padel_respond_join(p_request_id bigint, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid(); r record; t record; v_who text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  perform public.padel_lock();
  select * into r from public.pair_requests where id = p_request_id;
  if not found then raise exception 'Esa solicitud ya no existe (puede que la hayan retirado).' using errcode = 'P0001'; end if;
  select id, name, sport, user_id, user_id_2 into t from public.teams where id = r.team_id for update;
  if not found then raise exception 'Pareja no encontrada.' using errcode = 'P0001'; end if;
  if not (public.is_admin() or coalesce(t.user_id = v_uid, false)) then
    raise exception 'Solo quien creó la pareja o un monitor puede responder a la solicitud.' using errcode = 'P0001';
  end if;
  select coalesce(nullif(trim(full_name), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;

  if not coalesce(p_accept, false) then
    delete from public.pair_requests where id = r.id;
    insert into public.notifications (user_id, type, message)
    values (r.user_id, 'pair', coalesce(v_who, 'Tu pareja') || ' no ha aceptado tu solicitud para la pareja "' || t.name || '". Si es un error, habla con tu pareja o con los monitores.');
    return jsonb_build_object('status', 'rejected');
  end if;

  if t.user_id is not null and t.user_id_2 is not null then
    raise exception 'Esa pareja ya tiene sus dos cuentas.' using errcode = 'P0001';
  end if;
  perform public.padel_drop_own_ficha(r.user_id);   -- su pareja repetida, si la tenía
  perform public.padel_seat(t.id, r.user_id);
  insert into public.notifications (user_id, type, message)
  values (r.user_id, 'pair', case when public.is_admin() and t.user_id is distinct from v_uid
            then 'Los monitores te han unido a la pareja "' || t.name || '".'
            else coalesce(v_who, 'Tu pareja') || ' te ha aceptado. Ya estáis juntos en la pareja "' || t.name || '".' end
          || ' Veis los dos lo mismo: partido, avisos y horas.');
  return jsonb_build_object('status', 'accepted', 'team_id', t.id);
end $function$;

-- Quitar la segunda cuenta: quien creó la pareja quita a su compañero/a, o el compañero/a se sale
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
  select coalesce(nullif(trim(full_name), ''), 'Tu pareja') into v_who from public.profiles where id = v_uid;
  if v_removed = v_uid then
    insert into public.notifications (user_id, type, message)
    values (t.user_id, 'pair', coalesce(v_who, 'Tu pareja') || ' ha salido de vuestra pareja "' || t.name || '" en la app. Tú sigues pudiendo marcar las horas.');
  else
    insert into public.notifications (user_id, type, message)
    values (v_removed, 'pair', 'Tu cuenta ya no está unida a la pareja "' || t.name || '". Si es un error, habla con tu pareja o con los monitores.');
  end if;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10) Monitores: vincular / desvincular cuentas de una ficha
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_link_team(p_team_id bigint, p_user_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare v_sport text; v_cat text; v_owner uuid; v_owner2 uuid;
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede vincular cuentas.'; end if;
  select sport, category, user_id, user_id_2 into v_sport, v_cat, v_owner, v_owner2 from public.teams where id = p_team_id for update;
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
    -- Ya no hacen falta: la solicitud de esa cuenta y, si la pareja queda completa, las demás
    delete from public.pair_requests where user_id = p_user_id;
    delete from public.pair_requests r where r.team_id = p_team_id
      and exists (select 1 from public.teams t where t.id = p_team_id and t.user_id_2 is not null);
  end if;
end $function$;

create or replace function public.admin_unlink_team(p_team_id bigint, p_user_id uuid)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede desvincular cuentas.'; end if;
  -- Si se quita el asiento 1 y hay asiento 2, el trigger sube al 2 al asiento 1
  update public.teams
     set user_id   = case when user_id   = p_user_id then null else user_id   end,
         user_id_2 = case when user_id_2 = p_user_id then null else user_id_2 end
   where id = p_team_id and (user_id = p_user_id or user_id_2 = p_user_id);
  if not found then raise exception 'Esa cuenta no está vinculada a esta ficha.'; end if;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11) Permisos de ejecución
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function public.name_tokens(text), public.name_loose_match(text, text), public.pair_parts(text),
  public.pair_loose_match(text, text, text), public.padel_team_of(uuid), public.padel_lock(),
  public.padel_drop_own_ficha(uuid), public.padel_seat(bigint, uuid), public.padel_request(bigint, uuid, text),
  public.padel_attach(uuid, text, text)
  from public, anon, authenticated;

revoke execute on function public.set_team_availability(bigint, jsonb), public.admin_link_team(bigint, uuid),
  public.admin_unlink_team(bigint, uuid), public.padel_create_pair(text), public.padel_join_pair(bigint),
  public.padel_respond_join(bigint, boolean), public.padel_unlink_partner(bigint)
  from public, anon;
grant execute on function public.set_team_availability(bigint, jsonb), public.admin_link_team(bigint, uuid),
  public.admin_unlink_team(bigint, uuid), public.padel_create_pair(text), public.padel_join_pair(bigint),
  public.padel_respond_join(bigint, boolean), public.padel_unlink_partner(bigint)
  to authenticated;

notify pgrst, 'reload schema';
