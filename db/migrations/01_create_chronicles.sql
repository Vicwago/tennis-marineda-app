-- Create chronicles table
create table if not exists chronicles (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  image_url text,
  author_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_published boolean default true
);

-- Enable RLS
alter table chronicles enable row level security;

-- Policies
create policy "Public chronicles are viewable by everyone"
  on chronicles for select
  using ( is_published = true );

create policy "Admins can insert chronicles"
  on chronicles for insert
  with check ( auth.uid() in (select id from profiles where role = 'admin') );

create policy "Admins can update chronicles"
  on chronicles for update
  using ( auth.uid() in (select id from profiles where role = 'admin') );

create policy "Admins can delete chronicles"
  on chronicles for delete
  using ( auth.uid() in (select id from profiles where role = 'admin') );
