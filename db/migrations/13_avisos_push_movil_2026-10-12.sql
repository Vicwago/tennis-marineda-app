-- 13 · Avisos al móvil (Web Push) — 12/10/2026
-- Cada aviso que entra en public.notifications (partido nuevo, resultado, cambio, pareja,
-- chat...) se manda también como notificación al móvil a quien la haya activado.
--   · push_subscriptions: los móviles/navegadores de cada cuenta (los da de alta la app).
--   · Trigger en notifications → pg_net → https://tennis-padel-app-sigma.vercel.app/api/push
--     (función de Vercel que firma y envía con las claves VAPID). Lleva un secreto compartido
--     guardado en Vault ('push_hook_secret'); el mismo valor está en Vercel (PUSH_HOOK_SECRET).
--   · push_prune: la función de Vercel borra los móviles que ya no existen (404/410).
--   · admin_broadcast: los monitores mandan un aviso a todas las cuentas.
-- El secreto NO va en este archivo: se crea aparte con
--   select vault.create_secret('<secreto>', 'push_hook_secret');
set local lock_timeout = '4s';

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 1000),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 4 and 100),
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, public, authenticated;
grant select on public.push_subscriptions to authenticated;
drop policy if exists p_push_select on public.push_subscriptions;
create policy p_push_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Alta / re-alta de este móvil para la cuenta con sesión (si el móvil era de otra cuenta, pasa a esta)
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  if coalesce(p_endpoint, '') !~ '^https://' then raise exception 'Suscripción no válida.' using errcode = 'P0001'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, last_seen = now();
  -- Tope razonable: 10 móviles/navegadores por cuenta (se quedan los más recientes)
  delete from public.push_subscriptions where id in (
    select id from public.push_subscriptions where user_id = v_uid order by last_seen desc offset 10);
end $function$;

create or replace function public.push_unsubscribe(p_endpoint text)
returns void
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then return; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and (user_id = auth.uid() or public.is_admin());
end $function$;

-- La función de Vercel borra los móviles caducados. Solo con el secreto compartido.
create or replace function public.push_prune(p_secret text, p_endpoints text[])
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_secret text; n int;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_hook_secret';
  if v_secret is null or p_secret is distinct from v_secret then raise exception 'No autorizado.'; end if;
  delete from public.push_subscriptions where endpoint = any(coalesce(p_endpoints, '{}'));
  get diagnostics n = row_count;
  return n;
end $function$;

-- Cada aviso nuevo → al móvil (si esa cuenta tiene alguno activado). Nunca bloquea el aviso.
create or replace function public.notify_push()
returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_subs jsonb; v_secret text; v_title text;
begin
  begin
    select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      into v_subs from public.push_subscriptions s where s.user_id = new.user_id;
    if v_subs is null then return new; end if;
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_hook_secret';
    if v_secret is null then return new; end if;
    v_title := case
      when new.type = 'match_assigned' then '¡Tienes partido!'
      when new.type in ('match_updated', 'match_cancelled') then 'Cambio en tu partido'
      when new.type in ('result_saved', 'match_result') then 'Resultado registrado'
      when new.type = 'match_comment' then 'Mensaje de tu partido'
      when new.type like 'pair%' then 'Tu pareja de pádel'
      else 'Escuela de Tenis Marineda' end;
    perform net.http_post(
      url := 'https://tennis-padel-app-sigma.vercel.app/api/push',
      body := jsonb_build_object(
        'title', v_title,
        'body', left(coalesce(new.message, ''), 300),
        'url', '/',
        'tag', case when new.type = 'pair_hours' then 'pair_hours' else null end,
        'subscriptions', v_subs),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      timeout_milliseconds := 10000);
  exception when others then
    raise warning 'notify_push(%): %', new.id, sqlerrm;
  end;
  return new;
end $function$;

drop trigger if exists trg_notify_push on public.notifications;
create trigger trg_notify_push after insert on public.notifications
  for each row execute function public.notify_push();

-- Monitores: aviso a todas las cuentas (sale en la campana y en el móvil de quien lo tenga activado)
create or replace function public.admin_broadcast(p_message text)
returns int
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare v_msg text := left(trim(coalesce(p_message, '')), 500); n int;
begin
  if not public.is_admin() then raise exception 'Solo los monitores pueden enviar avisos a todos.'; end if;
  if char_length(v_msg) < 3 then raise exception 'Escribe el aviso.' using errcode = 'P0001'; end if;
  insert into public.notifications (user_id, type, message)
  select u.id, 'general', v_msg from auth.users u join public.profiles p on p.id = u.id;
  get diagnostics n = row_count;
  return n;
end $function$;

revoke execute on function public.push_subscribe(text, text, text, text), public.push_unsubscribe(text),
  public.admin_broadcast(text), public.push_prune(text, text[]), public.notify_push() from public, anon, authenticated;
grant execute on function public.push_subscribe(text, text, text, text), public.push_unsubscribe(text),
  public.admin_broadcast(text) to authenticated;
grant execute on function public.push_prune(text, text[]) to anon, authenticated;

notify pgrst, 'reload schema';
