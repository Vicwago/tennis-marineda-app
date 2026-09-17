-- ═══════════════════════════════════════════════════════════════════
-- HARDENING v3 (17/09/2026) — aplicada en producción como migración
-- Supabase "hardening_v3_tenant_launch". Copia para control de versiones.
-- Requiere: is_admin(), enforce_team_update(), handle_new_user() (ver 03_*.sql)
-- ═══════════════════════════════════════════════════════════════════

-- 1. LECTURA SOLO PARA USUARIOS AUTENTICADOS (chronicles sigue pública para /noticias)
do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies
           where schemaname='public' and cmd='SELECT'
             and tablename in ('profiles','teams','matches','availability','court_availability','app_settings','match_comments') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
create policy "auth_read_profiles"           on public.profiles           for select to authenticated using (true);
create policy "auth_read_teams"              on public.teams              for select to authenticated using (true);
create policy "auth_read_matches"            on public.matches            for select to authenticated using (true);
create policy "auth_read_availability"       on public.availability       for select to authenticated using (true);
create policy "auth_read_court_availability" on public.court_availability for select to authenticated using (true);
create policy "auth_read_app_settings"       on public.app_settings       for select to authenticated using (true);
create policy "auth_read_match_comments"     on public.match_comments     for select to authenticated using (true);
revoke select on public.profiles, public.teams, public.matches, public.availability,
              public.court_availability, public.app_settings, public.match_comments,
              public.notifications, public.matches_readable from anon;

-- 2. LOS JUGADORES NO CREAN EQUIPOS (los crea handle_new_user, SECURITY DEFINER)
drop policy if exists "Users can insert their own team" on public.teams;

-- 3. ROL PROTEGIDO TAMBIÉN EN INSERT
create or replace function public.enforce_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if not public.is_admin() then new.role := 'player'; end if;
  else
    if not public.is_admin() then new.role := old.role; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_profile_role on public.profiles;
create trigger trg_enforce_profile_role before insert or update on public.profiles
  for each row execute function public.enforce_profile_role();
alter table public.profiles alter column role set not null;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','player'));

-- 4. STORAGE news-images: solo admin escribe/borra; lectura por API solo autenticados
drop policy if exists "Authenticated upload news images" on storage.objects;
drop policy if exists "Public read news images" on storage.objects;
drop policy if exists "Owner delete news images" on storage.objects;
create policy "Admin upload news images" on storage.objects for insert to authenticated
  with check (bucket_id = 'news-images' and public.is_admin());
create policy "Auth read news images" on storage.objects for select to authenticated
  using (bucket_id = 'news-images');
create policy "Admin delete news images" on storage.objects for delete to authenticated
  using (bucket_id = 'news-images' and public.is_admin());

-- 5. INTEGRIDAD DE PARTIDOS Y EQUIPOS
alter table public.matches add constraint matches_distinct_teams check (team1_id is distinct from team2_id);
alter table public.matches add constraint matches_sport_check check (sport in ('tennis','padel'));
alter table public.matches add constraint matches_category_check check (category is null or category in ('adults','juveniles'));
create unique index if not exists matches_pending_pair_uniq
  on public.matches (least(team1_id, team2_id), greatest(team1_id, team2_id)) where completed = false;
alter table public.teams add constraint teams_sport_check check (sport in ('tennis','padel'));
alter table public.teams add constraint teams_category_check check (category is null or category in ('adults','juveniles'));

-- 6. PISTAS DE PÁDEL (category NULL): UNIQUE NULLS NOT DISTINCT para que el upsert funcione
delete from public.court_availability a using public.court_availability b
  where a.sport = b.sport and a.slot_id = b.slot_id and a.category is not distinct from b.category and a.id < b.id;
alter table public.court_availability drop constraint if exists court_availability_sport_category_slot_id_key;
alter table public.court_availability add constraint court_availability_sport_category_slot_id_key
  unique nulls not distinct (sport, category, slot_id);

-- 7. ÍNDICES
create index if not exists idx_matches_team1   on public.matches(team1_id);
create index if not exists idx_matches_team2   on public.matches(team2_id);
create index if not exists idx_matches_winner  on public.matches(winner_id);
create index if not exists idx_matches_scope   on public.matches(sport, category);
create index if not exists idx_teams_user      on public.teams(user_id);
create index if not exists idx_teams_scope     on public.teams(sport, category);
create index if not exists idx_notifications_match on public.notifications(match_id);
create index if not exists idx_match_comments_match  on public.match_comments(match_id);
create index if not exists idx_match_comments_author on public.match_comments(author_id);
create index if not exists idx_chronicles_author on public.chronicles(author_id);
create index if not exists idx_court_scope on public.court_availability(sport, category);

-- 8. FUNCIONES NO INVOCABLES POR RPC DONDE NO PROCEDE
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from anon;

-- 9. BLOQUEO DE DISPONIBILIDAD TAMBIÉN EN EL SERVIDOR (misma clave que el frontend)
create or replace function public.availability_scope_key(p_team_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select case when t.sport = 'tennis' then 'availability_locked__tennis_' || coalesce(t.category, 'adults')
              else 'availability_locked__' || t.sport end
  from public.teams t where t.id = p_team_id;
$$;
create or replace function public.enforce_availability_lock() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_team bigint; v_key text; v_locked boolean;
begin
  if public.is_admin() then return coalesce(new, old); end if;
  v_team := coalesce(new.team_id, old.team_id);
  v_key := public.availability_scope_key(v_team);
  select (value = 'true') into v_locked from public.app_settings where key = v_key;
  if coalesce(v_locked, false) then
    raise exception 'La disponibilidad está bloqueada por el administrador para esta categoría.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end; $$;
drop trigger if exists trg_availability_lock on public.availability;
create trigger trg_availability_lock before insert or update or delete on public.availability
  for each row execute function public.enforce_availability_lock();

create or replace function public.enforce_team_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_key text; v_locked boolean;
begin
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
end; $$;
revoke all on function public.enforce_availability_lock() from public, anon, authenticated;
revoke all on function public.availability_scope_key(bigint) from public, anon, authenticated;

-- 10. LIMPIEZA DE CLAVES GLOBALES OBSOLETAS (ahora son por ámbito)
delete from public.app_settings where key in ('availability_locked', 'availability_deadline_label');
