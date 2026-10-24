-- ─────────────────────────────────────────────────────────────
-- Tablero por fechas · VISTA PREVIA de la parte B (solo consulta, no cambia nada)
--
-- Ejecútala antes de la parte B: muestra, columna por columna, qué hará la
-- conversión. Solo se convierten columnas con estos nombres EXACTOS
-- (sin distinguir mayúsculas ni espacios al principio o al final):
--   Por hacer / To do                          → "Pendientes"
--   Empezado(s/a/as) / En progreso / En curso /
--   In progress / Doing                        → "En curso"
--   Completado(s/a/as) / Hecho(s/a/as) / Done /
--   Terminado(s/a/as)                          → completadas
-- Cualquier otro nombre se queda como columna tuya. Si ves una columna que
-- debería convertirse y sale como "columna tuya", avisa antes de la parte B.
-- ─────────────────────────────────────────────────────────────
select
  p.name                                                    as proyecto,
  c.name                                                    as columna,
  (select count(*) from tasks t where t.column_id = c.id)   as tareas,
  case
    when c.kind = 'pending'
      then 'Ya es "Pendientes": se queda'
    when lower(trim(c.name)) in ('por hacer', 'to do') and exists (
           select 1 from task_columns x where x.project_id = p.id and x.kind = 'pending')
      then 'Sus tareas → Pendientes (ya existe); la columna se borra'
    when lower(trim(c.name)) in ('por hacer', 'to do')
      then 'Pasa a ser "Pendientes" (sus tareas, a su columna de fecha)'
    when lower(trim(c.name)) in ('empezado', 'empezados', 'empezada', 'empezadas',
                                 'en progreso', 'en curso', 'in progress', 'doing')
      then 'Sus tareas → Pendientes + "En curso"; la columna se borra'
    when lower(trim(c.name)) in ('completado', 'completados', 'completada', 'completadas',
                                 'hecho', 'hechos', 'hecha', 'hechas', 'done',
                                 'terminado', 'terminados', 'terminada', 'terminadas')
      then 'Sus tareas → Completadas; la columna se borra'
    else 'Se queda como columna tuya (extra)'
  end                                                       as que_pasara
from task_columns c
join projects p on p.id = c.project_id
order by p.name, c.position;

-- Columnas sin proyecto (no se tocan). Debería dar 0.
select count(*) as columnas_sin_proyecto from task_columns where project_id is null;
