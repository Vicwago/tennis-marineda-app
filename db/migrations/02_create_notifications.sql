-- Create notifications table
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id uuid,
  type text not null default 'match_assigned',
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast user lookups
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);

-- Enable RLS
alter table notifications enable row level security;

-- Users can only see their own notifications
create policy "Users can view own notifications"
  on notifications for select
  using ( auth.uid() = user_id );

-- Users can update (mark as read) their own notifications
create policy "Users can update own notifications"
  on notifications for update
  using ( auth.uid() = user_id );

-- Admins and the system can insert notifications for any user
create policy "Service role can insert notifications"
  on notifications for insert
  with check ( true );
