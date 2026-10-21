import { useMemo, useState } from 'react'
import { useTasks } from '../../context/TasksContext'
import { addDays, dayFromTimestamp, diffDays, eachDay, formatShort, isSameDay, parseISODate, startOfWeek, today, WEEKDAYS } from '../../lib/dates'
import { isDoneColumn, priorityOf } from '../../lib/taskStyles'
import TaskModal from './TaskModal'

// ─────────────────────────────────────────────────────────────
// VISTA TIMELINE (diagrama de Gantt sencillo)
// Cada tarea es una barra desde el día en que se CREÓ hasta su fecha
// límite: la base de datos no guarda una fecha de inicio, y así no hay
// que inventarla (lo explica la nota bajo la cabecera).
//
// CONCEPTO: CSS Grid como eje de tiempo
// Cada fila es una rejilla con una columna fija para el nombre y una
// columna por día. Una barra que va del día 3 al 7 se coloca con
// `grid-column: 3 / 8`: el navegador calcula la posición y el ancho.
// ─────────────────────────────────────────────────────────────

const WINDOW_DAYS = 35 // 5 semanas
const DAY_WIDTH = 'minmax(30px, 1fr)'

export default function TimelineView() {
  const { tasks, columns } = useTasks()
  const [start, setStart] = useState(() => addDays(startOfWeek(today()), -7))
  const [openTask, setOpenTask] = useState(null)
  const now = today()
  const end = addDays(start, WINDOW_DAYS - 1)
  const days = eachDay(start, WINDOW_DAYS)
  const todayIndex = diffDays(start, now)
  const grid = { gridTemplateColumns: `var(--label-w) repeat(${WINDOW_DAYS}, ${DAY_WIDTH})` }

  const { groups, undated, outside } = useMemo(() => {
    const windowEnd = addDays(start, WINDOW_DAYS - 1)
    let outsideCount = 0
    const groupsList = columns.map((col) => {
      const rows = tasks
        .filter((t) => t.column_id === col.id && t.due_date)
        .map((t) => {
          const due = parseISODate(t.due_date)
          let from = dayFromTimestamp(t.created_at) ?? due
          if (from > due) from = due // creada después de su fecha límite: barra de un día
          return { task: t, from, due }
        })
        .filter((r) => {
          const visible = r.due >= start && r.from <= windowEnd
          if (!visible) outsideCount++
          return visible
        })
        .sort((a, b) => a.due - b.due)
      return { col, rows, done: isDoneColumn(col) }
    }).filter((g) => g.rows.length > 0)
    return { groups: groupsList, undated: tasks.filter((t) => !t.due_date), outside: outsideCount }
  }, [tasks, columns, start])

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 gap-3 min-h-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-ink mr-auto" aria-live="polite">
          {formatShort(start)} – {formatShort(end)}
        </h2>
        {outside > 0 && <span className="text-xs text-ink-subtle">{outside} fuera de estas semanas</span>}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setStart((s) => addDays(s, -7))} aria-label="Semana anterior" className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={() => setStart(addDays(startOfWeek(now), -7))} className="h-9 px-3 rounded-lg text-sm font-medium text-ink border border-line hover:bg-card">Hoy</button>
          <button type="button" onClick={() => setStart((s) => addDays(s, 7))} aria-label="Semana siguiente" className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <p className="-mt-2 text-xs text-ink-subtle">Cada barra va desde que se creó la tarea hasta su fecha límite.</p>

      {/* El scroll horizontal vive aquí dentro: la página no se desborda en móvil */}
      <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-line bg-surface [--label-w:8.5rem] sm:[--label-w:13rem]">
        <div className="min-w-max">
          {/* Cabecera de días */}
          <div className="grid sticky top-0 z-20 bg-canvas border-b border-line" style={grid}>
            <div className="sticky left-0 z-10 bg-canvas px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Tarea</div>
            {days.map((d, i) => {
              const isToday = isSameDay(d, now)
              const weekend = i % 7 >= 5
              return (
                <div key={i} className={`py-1.5 text-center leading-tight ${weekend ? 'bg-surface' : ''}`}>
                  <div className={`text-[10px] ${isToday ? 'text-accent font-bold' : 'text-ink-subtle'}`}>{WEEKDAYS[(d.getDay() + 6) % 7].charAt(0)}</div>
                  <div className={`mx-auto mt-0.5 w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold ${isToday ? 'bg-accent text-accent-ink' : d.getDate() === 1 ? 'text-ink' : 'text-ink-muted'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {groups.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-ink-muted">No hay tareas con fecha en estas semanas.</p>
          )}

          {groups.map(({ col, rows, done }) => (
            <section key={col.id} aria-label={col.name}>
              <div className="grid border-b border-line bg-canvas/60" style={grid}>
                <h3 className="sticky left-0 z-10 bg-canvas px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-ink">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} aria-hidden="true" />
                  <span className="truncate">{col.name}</span>
                  <span className="text-ink-subtle font-medium">{rows.length}</span>
                </h3>
              </div>
              {rows.map(({ task, from, due }) => {
                const p = priorityOf(task)
                const a = Math.max(0, diffDays(start, from))
                const b = Math.min(WINDOW_DAYS - 1, diffDays(start, due))
                const span = b - a + 1
                return (
                  <div key={task.id} className="grid relative border-b border-line/60 hover:bg-card/40" style={grid}>
                    <button
                      type="button"
                      onClick={() => setOpenTask(task)}
                      className={`sticky left-0 z-10 bg-surface px-3 h-10 text-left text-sm truncate hover:text-accent ${done ? 'line-through text-ink-subtle' : 'text-ink'}`}
                      title={task.title}
                    >
                      {task.title}
                    </button>
                    {todayIndex >= 0 && todayIndex < WINDOW_DAYS && (
                      <div className="row-start-1 border-l-2 border-accent/50 pointer-events-none" style={{ gridColumn: `${todayIndex + 2} / span 1` }} aria-hidden="true" />
                    )}
                    <button
                      type="button"
                      onClick={() => setOpenTask(task)}
                      aria-label={`${task.title}: del ${formatShort(from)} al ${formatShort(due)}`}
                      title={`${formatShort(from)} → ${formatShort(due)}`}
                      className={`row-start-1 self-center h-6 mx-0.5 px-2 rounded-full text-[11px] font-semibold text-left truncate ${p.bar} ${done ? 'opacity-60' : ''}`}
                      style={{ gridColumn: `${a + 2} / span ${span}` }}
                    >
                      {span >= 3 ? task.title : ''}
                    </button>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </div>

      {undated.length > 0 && (
        <details className="shrink-0 rounded-xl border border-line bg-surface px-4 py-2.5">
          <summary className="cursor-pointer text-sm font-medium text-ink-muted">Sin fecha ({undated.length})</summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {undated.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpenTask(t)} className="px-2.5 py-1 rounded-lg bg-card text-xs text-ink hover:bg-card-hover">
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {openTask && <TaskModal task={openTask} onClose={() => setOpenTask(null)} />}
    </div>
  )
}
