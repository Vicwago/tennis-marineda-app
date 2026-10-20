-- 18 · Inscripciones nuevas pendientes de aprobar — 20/10/2026 (petición de Mauro)
-- Quien se registra nuevo (o crea una pareja de pádel nueva) entra como PENDIENTE: no sale en el
-- ranking ni entra en las jornadas hasta que un monitor lo aprueba (botón "Aprobar" o ponerle grupo).
-- Los monitores reciben un aviso con cada inscripción nueva; el jugador, otro cuando lo aprueban.
set local lock_timeout = '4s';

alter table public.teams add column if not exists approved boolean not null default true;
-- Las fichas que ya existen quedan aprobadas, salvo las que aún no tienen grupo (altas recientes)
update public.teams set approved = false where group_name is null;

-- Solo un monitor decide: al crear, aprobada solo si la crea un monitor; al editar, un jugador no la
-- puede cambiar, y si un monitor le pone grupo a una pendiente, queda aprobada.
create or replace function public.team_approval_rules()
returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if TG_OP = 'INSERT' then
    new.approved := coalesce(public.is_admin(), false);
    return new;
  end if;
  if not coalesce(public.is_admin(), false) then
    new.approved := old.approved;
  elsif not old.approved and old.group_name is null and new.group_name is not null then
    new.approved := true;
  end if;
  return new;
end $function$;
drop trigger if exists trg_team_approval on public.teams;
create trigger trg_team_approval before insert or update on public.teams
  for each row execute function public.team_approval_rules();

-- Avisos: a los monitores cuando llega una inscripción; al jugador cuando se aprueba
create or replace function public.team_approval_notify()
returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_where text;
begin
  begin
    v_where := case when new.sport = 'padel' then 'pádel' when new.category = 'juveniles' then 'tenis juveniles' else 'tenis adultos' end;
    if TG_OP = 'INSERT' and not new.approved then
      insert into public.notifications (user_id, type, message)
      select p.id, 'registration', 'Nueva inscripción por aprobar: ' || new.name || ' (' || v_where || '). '
             || 'Apruébala en ' || case when new.sport = 'padel' then 'Parejas' else 'Jugadores' end || ' o ponle grupo.'
        from public.profiles p where p.role = 'admin';
    elsif TG_OP = 'UPDATE' and not old.approved and new.approved then
      insert into public.notifications (user_id, type, message)
      select acc, 'general', '¡Ya estás dentro! Los monitores han aprobado tu inscripción en ' || v_where
             || '. Marca y confirma tus horas en Mi Disponibilidad para entrar en las jornadas.'
        from unnest(array[new.user_id, new.user_id_2]) acc
       where acc is not null and exists (select 1 from auth.users u where u.id = acc);
    end if;
  exception when others then
    raise warning 'team_approval_notify(%): %', new.id, sqlerrm;
  end;
  return new;
end $function$;
drop trigger if exists trg_team_approval_notify on public.teams;
create trigger trg_team_approval_notify after insert or update on public.teams
  for each row execute function public.team_approval_notify();

revoke execute on function public.team_approval_rules(), public.team_approval_notify() from public, anon, authenticated;

notify pgrst, 'reload schema';
