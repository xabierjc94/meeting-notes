-- ─────────────────────────────────────────────────────────────
-- Tareas: las nuevas van al final de su columna (la más antigua arriba,
-- la más reciente abajo). Acompaña al commit 7f49300.
--
-- Cómo ejecutarlo: panel de Supabase → SQL Editor → pegar todo → Run.
-- Es seguro repetirlo: la función se sustituye y la renumeración da el
-- mismo resultado si se ejecuta dos veces.
--
-- ANTES DE EJECUTAR: sustituye TU_EMAIL (parte 2) por el email con el que
-- entras en MeetingNotes. Solo se renumeran las tareas de ese usuario, para
-- no deshacer el orden manual de otros usuarios de la app.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Función de tareas recurrentes: la copia nueva va abajo (max + 1) ──
-- Misma función que recurring-tasks-migration.sql; solo cambia la posición.
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
        -- abajo del todo, igual que las tareas nuevas creadas a mano
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

-- ── 2. Renumerar las tareas existentes por fecha de creación ──
-- row_number() numera cada columna por separado (partition by column_id)
-- de la más antigua (0) a la más reciente.
with ordenadas as (
  select t.id,
         row_number() over (partition by t.column_id order by t.created_at, t.id) - 1 as nueva
  from tasks t
  where t.user_id = (select id from auth.users where email = 'TU_EMAIL')
)
update tasks t
set position = o.nueva
from ordenadas o
where o.id = t.id;

-- ── 3. Comprobación: cada columna debe salir 0, 1, 2… por fecha ──
select c.name as columna, t.position, t.title, t.created_at
from tasks t
join task_columns c on c.id = t.column_id
where t.user_id = (select id from auth.users where email = 'TU_EMAIL')
order by c.name, t.position;
