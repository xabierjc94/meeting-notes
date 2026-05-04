-- =====================================================
-- SUPABASE MIGRATION - SUPERADMIN PANEL
-- =====================================================
-- Instrucciones:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Entra en SQL Editor
-- 3. Copia y pega TODO este archivo
-- 4. Ejecuta
-- 5. Al final, descomenta y personaliza la línea del
--    superadmin con tu email, y ejecuta esa parte sola
-- =====================================================

-- Crear tabla de perfiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin', 'superadmin')),
  subscription text not null default 'free' check (subscription in ('free', 'pro', 'enterprise')),
  subscription_expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Añadir columnas si no existen (por si la tabla ya existía sin ellas)
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists subscription text not null default 'free';
alter table profiles add column if not exists subscription_expires_at timestamptz;
alter table profiles add column if not exists is_active boolean not null default true;
alter table profiles add column if not exists created_at timestamptz not null default now();
alter table profiles add column if not exists updated_at timestamptz not null default now();

-- Trigger para actualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column();

-- Trigger para crear perfil automaticamente al registrar usuario
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, subscription)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'user',
    'free'
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- RLS policies
alter table profiles enable row level security;

-- Los usuarios solo pueden ver su propio perfil
create policy "users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
create policy "admins can view all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Los admins pueden actualizar perfiles
create policy "admins can update profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Los admins pueden eliminar perfiles
create policy "admins can delete profiles"
  on profiles for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'superadmin'
    )
  );

-- Tabla de logs de actividad
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  action text not null,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table activity_logs enable row level security;

create policy "admins can view activity logs"
  on activity_logs for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Funcion para registrar actividad
create or replace function log_activity(
  p_user_id uuid,
  p_action text,
  p_details jsonb default null
)
returns void as $$
begin
  insert into activity_logs (user_id, action, details)
  values (p_user_id, p_action, p_details);
end;
$$ language plpgsql security definer;

-- Crear primer superadmin si no existe
insert into profiles (id, full_name, email, role, subscription)
values (
  (select id from auth.users where email = 'javi16706@gmail.com'),
  'Super Admin',
  'javi16706@gmail.com',
  'superadmin',
  'enterprise'
) on conflict (id) do update set role = 'superadmin';
