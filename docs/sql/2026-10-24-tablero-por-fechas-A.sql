-- ─────────────────────────────────────────────────────────────
-- Tablero por fechas · PARTE A (solo añade, no borra ni mueve nada)
-- Plan: docs/plans/tablero-por-fechas.md (Fase 1)
--
-- Cómo ejecutarlo: panel de Supabase → SQL Editor → pegar todo → Run.
-- Se puede ejecutar ANTES de publicar el código nuevo: la app actual
-- sigue funcionando igual (las columnas nuevas tienen valor por defecto).
-- Es seguro repetirlo: todo usa "if not exists" / "create or replace".
-- ─────────────────────────────────────────────────────────────

-- ── 1. Copia de seguridad ──
-- En un esquema propio, NO en "public": Supabase publica las tablas de
-- "public" por su API, y una copia sin reglas (RLS) dejaría leer las tareas
-- de todos los usuarios con la clave pública de la app. El esquema "backup"
-- no se publica: solo se lee desde el SQL Editor.
-- Si se repite el script otro día, la copia NO se rehace: se conserva la
-- de antes del cambio, que es la que interesa.
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;

create table if not exists backup.tasks_20261024 as select * from public.tasks;
create table if not exists backup.task_columns_20261024 as select * from public.task_columns;

-- Capa extra: aunque algún día se publicara el esquema por error, sin
-- permisos ni reglas (RLS sin políticas) nadie podría leer nada por la API.
revoke all on all tables in schema backup from public, anon, authenticated;
alter table backup.tasks_20261024 enable row level security;
alter table backup.task_columns_20261024 enable row level security;

-- ── 2. Campos nuevos ──
-- completed_at: null = pendiente; con fecha = completada (y cuándo).
-- in_progress: marca "En curso".
alter table public.tasks
  add column if not exists completed_at timestamptz,
  add column if not exists in_progress boolean not null default false;

-- kind: 'pending' = la columna oculta "Pendientes" (sus tareas se reparten
-- en Hoy / Mañana / Esta semana / Próximamente); 'custom' = columna extra.
alter table public.task_columns
  add column if not exists kind text not null default 'custom'
    check (kind in ('pending', 'custom'));

-- ── 3. Índices ──
-- Como mucho UNA columna "Pendientes" por proyecto (la base de datos lo impide)
create unique index if not exists idx_task_columns_one_pending
  on public.task_columns (project_id) where kind = 'pending';

-- El tablero pide sobre todo las tareas sin completar de cada columna
create index if not exists idx_tasks_pending
  on public.tasks (column_id) where completed_at is null;

-- ── 4. Tareas recurrentes: la copia va a "Pendientes" ──
-- Igual que docs/sql/2026-10-22-tareas-nuevas-abajo.sql; solo cambia la
-- elección de columna (target_col). Mientras no exista "Pendientes" (antes
-- de la parte B), sigue usando la primera columna, como hasta ahora.
-- La copia nace pendiente y sin "En curso" (valores por defecto).
create or replace function public.generate_recurring_tasks(p_user uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  occ date;
  nxt date;
  target_col uuid;
  created integer := 0;
begin
  for m in
    select t.*, c.project_id
    from tasks t
    join task_columns c on c.id = t.column_id
    where t.recurrence is not null
      and t.recurrence_next <= current_date
      and (p_user is null or t.user_id = p_user)
    for update of t skip locked
  loop
    -- Fecha más reciente de la serie que ya ha llegado
    occ := m.recurrence_next;
    loop
      nxt := public.recurrence_after(m.due_date, m.recurrence, occ);
      exit when nxt > current_date;
      occ := nxt;
    end loop;

    -- Columna "Pendientes" del proyecto; si aún no existe, la primera
    select id into target_col
    from task_columns
    where project_id = m.project_id
    order by (kind = 'pending') desc, position, id
    limit 1;
    target_col := coalesce(target_col, m.column_id);

    if not exists (select 1 from tasks where recurrence_parent = m.id and due_date = occ) then
      insert into tasks (user_id, column_id, title, description, notes, priority, due_date, tags, position, recurrence_parent)
      values (
        m.user_id, target_col, m.title, m.description, m.notes, m.priority, occ, m.tags,
        coalesce((select max(position) from tasks where column_id = target_col), -1) + 1,
        m.id
      );
      created := created + 1;
    end if;

    update tasks
    set recurrence_next = public.recurrence_after(m.due_date, m.recurrence, current_date)
    where id = m.id;
  end loop;

  return created;
end;
$$;

-- ── 5. Comprobación (todo debe salir true) ──
select
  (select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks'
      and column_name in ('completed_at', 'in_progress'))                   as campos_tareas,
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'task_columns'
      and column_name = 'kind')                                             as campo_columnas,
  (to_regclass('backup.tasks_20261024') is not null
    and to_regclass('backup.task_columns_20261024') is not null)            as copia_seguridad,
  (to_regclass('public.idx_task_columns_one_pending') is not null
    and to_regclass('public.idx_tasks_pending') is not null)                as indices,
  (select prosrc like '%kind = ''pending''%' from pg_proc
    where proname = 'generate_recurring_tasks'
      and pronamespace = 'public'::regnamespace)                            as recurrentes;
