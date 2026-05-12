-- =====================================================
-- PROJECTS MIGRATION
-- =====================================================
-- Run this in Supabase SQL Editor

create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  color text not null default '#6366f1',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;

drop policy if exists "users manage own projects" on projects;
create policy "users manage own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add project_id to task_columns
alter table task_columns
  add column if not exists project_id uuid references projects(id) on delete cascade;

create index if not exists idx_task_columns_project_id on task_columns(project_id);

-- Migrate existing columns: create a default "General" project per user
-- and assign all orphan columns (without project_id) to it
do $$
declare
  r record;
  new_project_id uuid;
begin
  for r in
    select distinct user_id from task_columns where project_id is null
  loop
    insert into projects (user_id, name, color, position)
    values (r.user_id, 'General', '#6366f1', 0)
    returning id into new_project_id;

    update task_columns
    set project_id = new_project_id
    where user_id = r.user_id and project_id is null;
  end loop;
end $$;
