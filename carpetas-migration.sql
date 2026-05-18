-- ─── Tabla carpetas ───────────────────────────────────────────────
create table if not exists public.carpetas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default '#10b981',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.carpetas enable row level security;

create policy "carpetas: usuarios gestionan las suyas"
  on public.carpetas for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Columna folder_id en biblioteca ──────────────────────────────
alter table public.biblioteca
  add column if not exists folder_id uuid references public.carpetas(id) on delete set null;
