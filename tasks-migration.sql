-- =====================================================
-- TASKS MIGRATION
-- =====================================================
-- Run this in Supabase SQL Editor

create table if not exists task_columns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text not null default '#8b5cf6',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table task_columns enable row level security;

drop policy if exists "users manage own columns" on task_columns;
create policy "users manage own columns" on task_columns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  column_id uuid references task_columns on delete cascade not null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  tags text[] default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks enable row level security;

drop policy if exists "users manage own tasks" on tasks;
create policy "users manage own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists update_tasks_updated_at on tasks;
create trigger update_tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at_column();
