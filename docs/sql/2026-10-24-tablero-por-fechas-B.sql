-- ─────────────────────────────────────────────────────────────
-- Tablero por fechas · PARTE B (conversión de los proyectos existentes)
-- Plan: docs/plans/tablero-por-fechas.md (Fase 5)
--
-- CUÁNDO: justo DESPUÉS de que el código nuevo esté publicado.
-- ANTES: ejecuta la vista previa (…-B0-vista-previa.sql) y comprueba que
-- lo que va a pasar con cada columna es lo que quieres.
--
-- Qué hace, en cada proyecto:
--   1. Asegura UNA columna "Pendientes" (kind = 'pending'):
--        - si la app ya la creó al abrir el proyecto, usa esa;
--        - si no, convierte "Por hacer" en "Pendientes";
--        - si tampoco hay "Por hacer", la crea.
--   2. Tareas de otra "Por hacer"            → Pendientes
--   3. Tareas de Empezado / En progreso…     → Pendientes + "En curso"
--   4. Tareas de Completado / Hecho / Done…  → Pendientes + completadas
--      (fecha de completado = su última modificación)
--   5. Borra esas columnas, SOLO si han quedado vacías.
--   Solo cuentan los nombres EXACTOS de la vista previa; el resto de
--   columnas se quedan como columnas tuyas (extra).
--
-- Todo o nada: si algo falla, no se aplica ningún cambio.
-- Pensado para ejecutarse UNA vez (repetirlo justo después no hace nada,
-- pero si más adelante creas una columna llamada "Hecho", la convertiría).
-- Copia de seguridad: backup.tasks_20261024 y backup.task_columns_20261024 (parte A).
-- ─────────────────────────────────────────────────────────────

begin;

-- Mientras dura la conversión (una fracción de segundo), nadie puede
-- escribir en estas tablas: así ninguna tarea entra en una columna que se
-- va a borrar (borrar una columna borra sus tareas). Leer sí se puede.
lock table public.task_columns, public.tasks in exclusive mode;

do $$
declare
  p record;
  pend uuid;
  -- Nombres que se convierten (en minúsculas, sin espacios en los extremos)
  todo_names constant text[] := array['por hacer', 'to do'];
  doing_names constant text[] := array['empezado', 'empezados', 'empezada', 'empezadas',
                                       'en progreso', 'en curso', 'in progress', 'doing'];
  done_names constant text[] := array['completado', 'completados', 'completada', 'completadas',
                                      'hecho', 'hechos', 'hecha', 'hechas', 'done',
                                      'terminado', 'terminados', 'terminada', 'terminadas'];
begin
  for p in select id, user_id from public.projects loop
    pend := null;

    -- 1. Columna "Pendientes"
    select id into pend from public.task_columns
    where project_id = p.id and kind = 'pending'
    limit 1;

    if pend is null then
      select id into pend from public.task_columns
      where project_id = p.id and lower(trim(name)) = any (todo_names)
      order by position, id
      limit 1;

      if pend is not null then
        update public.task_columns
        set kind = 'pending', name = 'Pendientes', position = -1
        where id = pend;
      else
        insert into public.task_columns (user_id, project_id, name, kind, color, position)
        values (p.user_id, p.id, 'Pendientes', 'pending', '#a3a3a3', -1)
        returning id into pend;
      end if;
    end if;

    -- 2. Otras "Por hacer" (p. ej. si la app ya había creado "Pendientes")
    update public.tasks set column_id = pend
    where column_id in (
      select id from public.task_columns
      where project_id = p.id and id <> pend and lower(trim(name)) = any (todo_names)
    );

    -- 3. Empezado / En progreso → "En curso"
    update public.tasks set column_id = pend, in_progress = true
    where column_id in (
      select id from public.task_columns
      where project_id = p.id and id <> pend and lower(trim(name)) = any (doing_names)
    );

    -- 4. Completado → completadas. En el SET, updated_at es el valor de
    --    ANTES de este cambio (el trigger lo pone a "ahora" después).
    update public.tasks set column_id = pend, completed_at = coalesce(completed_at, updated_at)
    where column_id in (
      select id from public.task_columns
      where project_id = p.id and id <> pend and lower(trim(name)) = any (done_names)
    );

    -- 5. Borrar las columnas convertidas, solo si están vacías
    delete from public.task_columns tc
    where tc.project_id = p.id and tc.id <> pend
      and lower(trim(tc.name)) = any (todo_names || doing_names || done_names)
      and not exists (select 1 from public.tasks t where t.column_id = tc.id);
  end loop;
end $$;

commit;

-- ── Comprobaciones ──
-- a) Ninguna tarea perdida respecto a la copia de seguridad (debe dar 0,
--    salvo tareas que hayas borrado tú a propósito desde el día 24)
select count(*) as tareas_perdidas
from backup.tasks_20261024 b
where not exists (select 1 from public.tasks t where t.id = b.id);

-- b) Una fila por proyecto: pendientes_cols debe ser 1 en todos
select
  p.name                                                                     as proyecto,
  (select count(*) from task_columns c where c.project_id = p.id and c.kind = 'pending') as pendientes_cols,
  (select count(*) from task_columns c where c.project_id = p.id and c.kind = 'custom')  as columnas_tuyas,
  (select count(*) from tasks t join task_columns c on c.id = t.column_id
     where c.project_id = p.id and c.kind = 'pending' and t.completed_at is null) as por_fecha,
  (select count(*) from tasks t join task_columns c on c.id = t.column_id
     where c.project_id = p.id and t.in_progress and t.completed_at is null)  as en_curso,
  (select count(*) from tasks t join task_columns c on c.id = t.column_id
     where c.project_id = p.id and t.completed_at is not null)                as completadas
from projects p
order by p.name;
