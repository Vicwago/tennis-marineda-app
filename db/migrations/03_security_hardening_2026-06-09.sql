-- ═══════════════════════════════════════════════════════════════════
-- HARDENING v1 + v2 (09/06/2026) — aplicadas en producción como migraciones
-- Supabase "security_hardening_rls_triggers" y "security_hardening_phase2".
-- Copia para control de versiones.
-- ═══════════════════════════════════════════════════════════════════

-- Helper SECURITY DEFINER (evita recursión RLS al leer profiles)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Impedir que un jugador se auto-promocione a admin (UPDATE; en 04_* se extiende a INSERT)
create or replace function public.enforce_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.role := old.role; end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_profile_role on public.profiles;
create trigger trg_enforce_profile_role before update on public.profiles
  for each row execute function public.enforce_profile_role();

-- Impedir que un jugador manipule puntos / grupo / nombre / etc.
create or replace function public.enforce_team_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.points := old.points; new.matches_played := old.matches_played; new.group_name := old.group_name;
    new.name := old.name; new.sport := old.sport; new.category := old.category; new.user_id := old.user_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_team_update on public.teams;
create trigger trg_enforce_team_update before update on public.teams
  for each row execute function public.enforce_team_update();

-- Los admins pueden insertar notificaciones para cualquier usuario
do $pol$ begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='Admins or self can insert notifications') then
    create policy "Admins or self can insert notifications" on public.notifications
      for insert with check ( public.is_admin() or auth.uid() = user_id );
  end if;
end $pol$;

-- Fase 2
alter view public.matches_readable set (security_invoker = on);
revoke all on function public.enforce_profile_role() from public, anon, authenticated;
revoke all on function public.enforce_team_update()  from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $function$
declare v_name text; v_sport text; v_category text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_sport := coalesce(new.raw_user_meta_data->>'sport', 'tennis');
  v_category := new.raw_user_meta_data->>'category';
  insert into public.profiles (id, full_name, role) values (new.id, v_name, 'player') on conflict (id) do nothing;
  insert into public.teams (name, sport, category, group_name, points, matches_played, user_id)
  values (v_name, v_sport, v_category, null, 0, 0, new.id);
  return new;
end;
$function$;
