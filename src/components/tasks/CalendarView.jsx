import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { useTasks } from '../../context/TasksContext'
import { addMonths, formatLongDay, formatMonth, isSameDay, monthGrid, parseISODate, toISODate, today, WEEKDAYS } from '../../lib/dates'
import { priorityOf } from '../../lib/taskStyles'
import { isDone } from '../../lib/taskBuckets'
import Modal from '../ui/Modal'
import TaskModal from './TaskModal'

// ─────────────────────────────────────────────────────────────
// VISTA CALENDARIO
// Cada tarea aparece en el día de su fecha límite (due_date).
//   - Clic en una tarea → se abre.  Clic en "+" de un día → tarea nueva
//     con esa fecha ya puesta.
//   - Arrastrar una tarea a otro día → cambia su fecha. Se mueve al
//     instante (actualización optimista) y si el servidor falla, vuelve.
//   - Móvil: la cuadrícula de 7 columnas no cabe → agenda por días.
// No toca la base de datos más allá de editTask({ due_date }).
// ─────────────────────────────────────────────────────────────

const MAX_CHIPS = 3

function TaskChip({ task, done, onOpen, draggable = true }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !draggable })
  const p = priorityOf(task)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 } : undefined
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      // Solo arrastrable en la cuadrícula: en la lista "+N más" no se esparcen
      // los atributos de dnd-kit (añadirían aria-disabled a un botón que sí funciona)
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      role={undefined}
      aria-roledescription={undefined}
      aria-describedby={undefined}
      onClick={() => onOpen(task)}
      title={`${task.title} · ${p.label}`}
      className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md text-left text-[11px] leading-tight bg-card-hover hover:bg-line transition-colors ${draggable ? 'touch-none' : ''}
        ${isDragging ? 'shadow-xl ring-1 ring-accent cursor-grabbing' : 'cursor-pointer'}`}
    >
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${p.dot}`} aria-hidden="true" />
      <span className={`truncate ${done ? 'line-through text-ink-subtle' : 'text-ink'}`}>{task.title}</span>
    </button>
  )
}

function DayCell({ day, inMonth, isToday, tasks, onOpen, onNew, onMore }) {
  const iso = toISODate(day)
  const { setNodeRef, isOver } = useDroppable({ id: iso })
  const visible = tasks.slice(0, MAX_CHIPS)
  const hidden = tasks.length - visible.length
  return (
    <div
      ref={setNodeRef}
      className={`group min-h-28 p-1.5 flex flex-col gap-1 border-b border-r border-line transition-colors
        ${isOver ? 'bg-accent-soft' : inMonth ? 'bg-surface' : 'bg-canvas'}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold
            ${isToday ? 'bg-accent text-accent-ink' : inMonth ? 'text-ink' : 'text-ink-subtle'}`}
          aria-current={isToday ? 'date' : undefined}
        >
          {day.getDate()}
        </span>
        <button
          type="button"
          onClick={() => onNew(iso)}
          aria-label={`Añadir tarea el ${formatLongDay(day).toLowerCase()}`}
          className="w-6 h-6 flex items-center justify-center rounded-md text-ink-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink hover:bg-card transition-opacity"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      {visible.map((t) => <TaskChip key={t.id} task={t} done={isDone(t)} onOpen={onOpen} />)}
      {hidden > 0 && (
        <button type="button" onClick={() => onMore(iso)} className="text-left px-1.5 text-[11px] font-semibold text-ink-muted hover:text-accent">
          +{hidden} más
        </button>
      )}
    </div>
  )
}

export default function CalendarView() {
  const { tasks, pendingColumn, editTask } = useTasks()
  const [cursor, setCursor] = useState(() => { const t = today(); return new Date(t.getFullYear(), t.getMonth(), 1, 12) })
  const [openTask, setOpenTask] = useState(null)
  const [newDate, setNewDate] = useState(null)
  const [moreDay, setMoreDay] = useState(null)
  const [moves, setMoves] = useState({}) // id → fecha nueva mientras se guarda
  const [moveError, setMoveError] = useState(null)

  // Tareas por día ('AAAA-MM-DD' → [tareas]), aplicando los movimientos pendientes
  const byDay = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      const date = moves[t.id] ?? t.due_date
      if (!date) continue
      const key = String(date).slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    }
    return map
  }, [tasks, moves])
  const undated = tasks.filter((t) => !t.due_date).length

  const days = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const now = today()

  // Arrastrar: 6 px de margen para distinguir un clic de un arrastre;
  // en táctil, mantener pulsado 200 ms (si no, no se podría hacer scroll)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || String(task.due_date ?? '').slice(0, 10) === over.id) return
    setMoveError(null)
    setMoves((m) => ({ ...m, [task.id]: over.id }))
    try {
      await editTask(task.id, { due_date: over.id })
    } catch {
      setMoveError(`No se pudo mover «${task.title}». Ha vuelto a su fecha.`)
    } finally {
      // Solo se borra si sigue siendo ESTE movimiento (otro arrastre más nuevo de
      // la misma tarea no debe perderse)
      setMoves((m) => { if (m[task.id] !== over.id) return m; const next = { ...m }; delete next[task.id]; return next })
    }
  }

  // Agenda móvil: días del mes con tareas (y hoy, aunque esté vacío)
  const agenda = days.filter((d) => d.getMonth() === cursor.getMonth() && (byDay.has(toISODate(d)) || isSameDay(d, now)))

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-ink mr-auto" aria-live="polite">{formatMonth(cursor)}</h2>
        {undated > 0 && <span className="text-xs text-ink-subtle">{undated} sin fecha</span>}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Mes anterior" className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1, 12))} className="h-9 px-3 rounded-lg text-sm font-medium text-ink border border-line hover:bg-card">
            Hoy
          </button>
          <button type="button" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Mes siguiente" className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {moveError && <p role="alert" className="mb-3 text-sm text-danger">{moveError}</p>}

      {/* Cuadrícula (tablet y escritorio) */}
      <div className="hidden sm:block rounded-2xl border-t border-l border-line overflow-hidden">
        <div className="grid grid-cols-7 bg-canvas">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 border-b border-r border-line text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{w}</div>
          ))}
        </div>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <DayCell
                key={toISODate(day)}
                day={day}
                inMonth={day.getMonth() === cursor.getMonth()}
                isToday={isSameDay(day, now)}
                tasks={byDay.get(toISODate(day)) ?? []}
                onOpen={setOpenTask}
                onNew={setNewDate}
                onMore={setMoreDay}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {/* Agenda (móvil) */}
      <ol className="sm:hidden space-y-4">
        {agenda.length === 0 && <li className="text-sm text-ink-muted py-8 text-center">No hay tareas con fecha este mes.</li>}
        {agenda.map((day) => {
          const list = byDay.get(toISODate(day)) ?? []
          const isNow = isSameDay(day, now)
          return (
            <li key={toISODate(day)}>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${isNow ? 'text-accent' : 'text-ink-subtle'}`}>
                  {isNow ? 'Hoy · ' : ''}{formatLongDay(day)}
                </h3>
                <button type="button" onClick={() => setNewDate(toISODate(day))} aria-label={`Añadir tarea el ${formatLongDay(day).toLowerCase()}`} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
              <div className="space-y-1.5">
                {list.length === 0 && <p className="text-sm text-ink-subtle">Nada para hoy.</p>}
                {list.map((t) => {
                  const p = priorityOf(t)
                  return (
                    <button key={t.id} type="button" onClick={() => setOpenTask(t)} className="w-full flex items-center gap-2.5 px-3 h-11 rounded-xl bg-card text-left text-sm">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${p.dot}`} aria-hidden="true" />
                      <span className={`flex-1 truncate ${isDone(t) ? 'line-through text-ink-subtle' : 'text-ink'}`}>{t.title}</span>
                      <span className="text-[11px] text-ink-subtle">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>

      {moreDay && (
        <Modal title={formatLongDay(parseISODate(moreDay))} onClose={() => setMoreDay(null)} size="sm">
          <div className="space-y-1.5">
            {(byDay.get(moreDay) ?? []).map((t) => (
              <TaskChip key={t.id} task={t} done={isDone(t)} draggable={false} onOpen={(task) => { setMoreDay(null); setOpenTask(task) }} />
            ))}
          </div>
        </Modal>
      )}
      {openTask && <TaskModal task={openTask} onClose={() => setOpenTask(null)} />}
      {newDate && <TaskModal defaultColumnId={pendingColumn?.id} defaultDueDate={newDate} onClose={() => setNewDate(null)} />}
    </div>
  )
}
