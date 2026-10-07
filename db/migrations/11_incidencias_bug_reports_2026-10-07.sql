-- 11. Incidencias ("¿Algo falla?"): tabla bug_reports + bucket privado bug-photos
-- Aplicada en producción el 07/10/2026 como 'incidencias_bug_reports_2026_10_07' (Supabase MCP apply_migration).

-- 11 · "¿Algo falla?": incidencias que mandan los jugadores desde la app (texto + foto opcional)
create table if not exists public.bug_reports (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  user_email text,
  sport text,
  screen text,
  app_version text,
  user_agent text,
  message text not null check (char_length(message) between 3 and 2000),
  photo_path text,
  status text not null default 'nuevo' check (status in ('nuevo', 'visto', 'resuelto')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_bug_reports_status on public.bug_reports (status, created_at desc);
alter table public.bug_reports enable row level security;
revoke all on public.bug_reports from anon, public;
grant select, insert on public.bug_reports to authenticated;
grant update (status, admin_note, resolved_at) on public.bug_reports to authenticated;

drop policy if exists p_bugs_insert on public.bug_reports;
create policy p_bugs_insert on public.bug_reports for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists p_bugs_select on public.bug_reports;
create policy p_bugs_select on public.bug_reports for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists p_bugs_update on public.bug_reports;
create policy p_bugs_update on public.bug_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tope: 10 incidencias por cuenta y día (contra el abuso); el resto de campos los fija el servidor
create or replace function public.stamp_bug_report()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int; v_email text;
begin
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'Inicia sesión.'; end if;
  select count(*) into v_n from public.bug_reports where user_id = new.user_id and created_at > now() - interval '24 hours';
  if v_n >= 10 then raise exception 'Has enviado muchas incidencias hoy. Gracias: ya las tenemos.' using errcode = 'P0001'; end if;
  select full_name into new.user_name from public.profiles where id = new.user_id;
  select email into v_email from auth.users where id = new.user_id;
  new.user_email := v_email;
  new.status := 'nuevo';
  new.admin_note := null;
  new.resolved_at := null;
  new.created_at := now();
  new.message := left(trim(new.message), 2000);
  new.screen := left(new.screen, 120);
  new.app_version := left(new.app_version, 40);
  new.user_agent := left(new.user_agent, 300);
  new.sport := left(new.sport, 20);
  return new;
end $function$;
drop trigger if exists trg_stamp_bug_report on public.bug_reports;
create trigger trg_stamp_bug_report before insert on public.bug_reports for each row execute function public.stamp_bug_report();

-- Fotos: bucket privado; cada cuenta sube a su carpeta (<uid>/...), y solo ella y los monitores las ven
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bug-photos', 'bug-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists p_bugphotos_insert on storage.objects;
create policy p_bugphotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bug-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists p_bugphotos_select on storage.objects;
create policy p_bugphotos_select on storage.objects for select to authenticated
  using (bucket_id = 'bug-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

notify pgrst, 'reload schema';

-- Añadido el mismo día (aplicado como 'incidencias_bug_photos_delete_2026_10_07'):
-- el dueño o un monitor pueden borrar una foto por la API de Storage (el SQL directo sobre storage.objects está bloqueado)
drop policy if exists p_bugphotos_delete on storage.objects;
create policy p_bugphotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bug-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
