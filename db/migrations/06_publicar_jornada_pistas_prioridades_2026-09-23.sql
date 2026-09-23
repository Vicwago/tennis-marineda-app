-- 06 — Jornada en borrador + horarios especiales de una vez + chat privado (23/09/2026)
-- Aplicado en producción como migraciones:
--   publicar_jornada_horario_especial_semanal
--   chat_privado_participantes_y_sin_avisos_en_borrador
--
-- IMPORTANTE para quien reaplique políticas "consolidadas" (v4): la SELECT de matches
-- ya NO es using(true). Debe quedar (published or is_admin()) o los jugadores verán los
-- borradores.

-- 1) Jornada en borrador hasta que el admin la publica.
--    Los jugadores solo ven partidos publicados; el admin lo ve todo.
alter table public.matches add column if not exists published boolean not null default false;
update public.matches set published = true where published = false;   -- backfill: lo ya existente sigue visible
create index if not exists idx_matches_drafts on public.matches (sport, category) where not published;

drop policy if exists p_matches_select on public.matches;
create policy p_matches_select on public.matches
  for select to authenticated
  using (published or public.is_admin());

-- 2) Horario especial "una sola vez": caduca solo (la madrugada siguiente a la próxima vez
--    que caiga ese día/hora). NULL = hora permanente.
alter table public.court_availability add column if not exists expires_at timestamptz null;

-- 3) Horas fijas, horas preferentes y rotación de grupos viven en app_settings, por ámbito:
--    fixed_hours__<ámbito>, preferred_slots__<ámbito>, last_first_group__<ámbito>,
--    draft_first_group__<ámbito>. Sin cambio de esquema.

-- 4) El chat de un partido en BORRADOR no avisa a los jugadores (no deben saber que existe)
create or replace function public.notify_match_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare m record; v_target uuid;
begin
  select team1_id, team2_id, published into m from public.matches where id = new.match_id;
  if m.team1_id is null or not coalesce(m.published, false) then return new; end if;
  for v_target in
    select t.user_id from public.teams t
    where t.id in (m.team1_id, m.team2_id) and t.user_id is not null and t.user_id <> new.author_id
  loop
    insert into public.notifications (user_id, match_id, type, message)
    values (v_target, new.match_id, 'match_comment', '💬 ' || coalesce(new.author_name, 'Tu rival') || ': ' || left(new.content, 80));
  end loop;
  return new;
end;
$$;

-- 5) Los comentarios solo los leen los dos rivales y los admins (antes: cualquier usuario
--    logueado podía leer cualquier chat enumerando match_id). Realtime aplica la misma policy.
drop policy if exists p_comments_select on public.match_comments;
create policy p_comments_select on public.match_comments
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.matches mm
      join public.teams t on t.id in (mm.team1_id, mm.team2_id)
      where mm.id = match_comments.match_id and t.user_id = (select auth.uid())
    )
  );
