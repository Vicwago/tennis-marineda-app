/**
 * run_migrations.mjs
 * Aplica las migraciones pendientes a Supabase.
 *
 * USO:
 *   node run_migrations.mjs <DB_PASSWORD>
 *
 * Dónde encontrar la contraseña de la base de datos:
 *   Supabase Dashboard → Settings → Database → Database password
 *   (o la que pusiste al crear el proyecto)
 */

import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = process.argv[2];
const PROJECT_REF = 'tdmyduolpmxstaaowcpv';

if (!DB_PASSWORD) {
    console.error('\n❌  Falta la contraseña de la base de datos.');
    console.error(`   Uso: node run_migrations.mjs <DB_PASSWORD>`);
    console.error(`\n   Encuéntrala en: Supabase → Settings → Database → Database password\n`);
    process.exit(1);
}

const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

const migrations = [
    {
        name: '01_create_chronicles',
        sql: `
create table if not exists chronicles (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  image_url text,
  author_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_published boolean default true
);

alter table chronicles enable row level security;

do $pol$ begin
  if not exists (select 1 from pg_policies where tablename='chronicles' and policyname='Public chronicles are viewable by everyone') then
    create policy "Public chronicles are viewable by everyone" on chronicles for select using ( is_published = true );
  end if;
  if not exists (select 1 from pg_policies where tablename='chronicles' and policyname='Admins can insert chronicles') then
    create policy "Admins can insert chronicles" on chronicles for insert with check ( auth.uid() in (select id from profiles where role = 'admin') );
  end if;
  if not exists (select 1 from pg_policies where tablename='chronicles' and policyname='Admins can update chronicles') then
    create policy "Admins can update chronicles" on chronicles for update using ( auth.uid() in (select id from profiles where role = 'admin') );
  end if;
  if not exists (select 1 from pg_policies where tablename='chronicles' and policyname='Admins can delete chronicles') then
    create policy "Admins can delete chronicles" on chronicles for delete using ( auth.uid() in (select id from profiles where role = 'admin') );
  end if;
end $pol$;
        `
    },
    {
        name: '02_create_notifications',
        sql: `
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id uuid,
  type text not null default 'match_assigned',
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);

alter table notifications enable row level security;

do $pol$ begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='Users can view own notifications') then
    create policy "Users can view own notifications" on notifications for select using ( auth.uid() = user_id );
  end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='Users can update own notifications') then
    create policy "Users can update own notifications" on notifications for update using ( auth.uid() = user_id );
  end if;
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='Service role can insert notifications') then
    create policy "Service role can insert notifications" on notifications for insert with check ( true );
  end if;
end $pol$;
        `
    }
];

async function run() {
    console.log('\n🚀  Conectando a Supabase...');
    try {
        await client.connect();
        console.log('✅  Conexión establecida.\n');
    } catch (err) {
        console.error('❌  Error de conexión:', err.message);
        console.error('   Verifica que la contraseña sea correcta.\n');
        process.exit(1);
    }

    for (const m of migrations) {
        process.stdout.write(`  → Aplicando ${m.name} ... `);
        try {
            await client.query(m.sql);
            console.log('✅  OK');
        } catch (err) {
            console.log('❌  ERROR: ' + err.message);
        }
    }

    await client.end();
    console.log('\n✅  Proceso completado. Recarga la app para ver los cambios.\n');
}

run();
