-- =====================================================
-- RECURRING TASKS MIGRATION
-- =====================================================
-- Run this in Supabase SQL Editor (es seguro ejecutarlo más de una vez)
--
-- Modelo "por calendario":
--   · La tarea original (la "serie") guarda la regla en `recurrence`
--     y su `due_date` es la primera fecha de la serie.
--   · Cada día, un job de pg_cron crea una COPIA de la tarea en la
--     primera columna del proyecto cuando llega la siguiente fecha,
--     aunque la anterior no se haya completado.
--   · Las copias apuntan a la serie con `recurrence_parent`.
--   · Quitar la repetición (o borrar la tarea original) detiene la serie;
--     las copias ya creadas se quedan.

-- 1. Columnas nuevas (opcionales: las tareas existentes no cambian)
alter table tasks
  add column if not exists recurrence text
    check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly')),
  add column if not exists recurrence_next date,
  add column if not exists recurrence_parent uuid references tasks(id) on delete set null;

create index if not exists idx_tasks_recurrence_next
  on tasks(recurrence_next) where recurrence is not null;

create index if not exists idx_tasks_recurrence_parent
  on tasks(recurrence_parent) where recurrence_parent is not null;

-- 2. Primera fecha de la serie posterior a `after`.
--    Se calcula siempre desde la fecha original (anchor) para que
--    "cada mes el día 31" no se vaya desplazando (31 ene → 28 feb → 31 mar).
create or replace function public.recurrence_after(anchor date, rule text, after date)
returns date
language plpgsql
immutable
as $$
declare
  d date;
  k integer;
begin
  if rule = 'daily' then
    return greatest(anchor, after) + 1;

  elsif rule = 'weekdays' then
    d := greatest(anchor, after) + 1;
    while extract(isodow from d) > 5 loop   -- 6 = sábado, 7 = domingo
      d := d + 1;
    end loop;
    return d;

  elsif rule = 'weekly' then
    k := greatest(1, ceil((after - anchor + 1) / 7.0)::int);
    return anchor + 7 * k;

  elsif rule = 'monthly' then
    k := greatest(1, ((extract(year from after) - extract(year from anchor)) * 12
                     + extract(month from after) - extract(month from anchor))::int);
    while (anchor + make_interval(months => k))::date <= after loop
      k := k + 1;
    end loop;
    return (anchor + make_interval(months => k))::date;

  elsif rule = 'yearly' then
    k := greatest(1, (extract(year from after) - extract(year from anchor))::int);
    while (anchor + make_interval(years => k))::date <= after loop
      k := k + 1;
    end loop;
    return (anchor + make_interval(years => k))::date;
  end if;

  return null;
end;
$$;

-- 3. Al activar/cambiar la repetición o la fecha, se recalcula la
--    próxima copia (nunca en el pasado: no se crean copias atrasadas)
create or replace function public.tasks_recurrence_trigger()
returns trigger
language plpgsql
as $$
begin
  if new.recurrence is null then
    new.recurrence_next := null;
  elsif tg_op = 'INSERT'
     or new.recurrence is distinct from old.recurrence
     or new.due_date is distinct from old.due_date then
    if new.due_date is null then
      new.due_date := current_date;
    end if;
    new.recurrence_next := public.recurrence_after(
      new.due_date, new.recurrence, greatest(new.due_date, current_date - 1)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_recurrence on tasks;
create trigger tasks_recurrence
  before insert or update on tasks
  for each row execute function public.tasks_recurrence_trigger();

-- 4. Generador: crea las copias que tocan hoy.
--    · "for update skip locked": si el cron y la app lo lanzan a la vez,
--      cada serie la procesa solo uno de los dos.
--    · Si el proyecto estuvo pausado varios días, crea UNA sola copia
--      (la de la fecha más reciente), no una por cada día perdido.
--    · No duplica: comprueba que no exista ya una copia para esa fecha.
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

    -- Primera columna del proyecto (normalmente "Por hacer")
    select id into target_col
    from task_columns
    where project_id = m.project_id
    order by position
    limit 1;
    target_col := coalesce(target_col, m.column_id);

    if not exists (select 1 from tasks where recurrence_parent = m.id and due_date = occ) then
      insert into tasks (user_id, column_id, title, description, notes, priority, due_date, tags, position, recurrence_parent)
      values (
        m.user_id, target_col, m.title, m.description, m.notes, m.priority, occ, m.tags,
        -- arriba del todo, igual que las tareas nuevas creadas a mano
        coalesce((select min(position) from tasks where column_id = target_col), 1) - 1,
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

-- Versión para la app: solo genera las tareas del usuario conectado.
-- La app la llama al abrir un tablero, así no hay que esperar al cron.
create or replace function public.generate_my_recurring_tasks()
returns integer
language sql
security definer
set search_path = public
as $$
  select case when auth.uid() is null then 0
              else public.generate_recurring_tasks(auth.uid()) end;
$$;

-- Nadie puede lanzar el generador global desde la API (crearía tareas
-- de otros usuarios); solo la versión limitada al propio usuario
revoke execute on function public.generate_recurring_tasks(uuid) from public, anon, authenticated;
revoke execute on function public.generate_my_recurring_tasks() from public, anon;
grant execute on function public.generate_my_recurring_tasks() to authenticated;

-- 5. Job diario con pg_cron (04:05 UTC = 06:05 en Madrid en verano)
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'recurring-tasks',
  '5 4 * * *',
  $$select public.generate_recurring_tasks()$$
);
