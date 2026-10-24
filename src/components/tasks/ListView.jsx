import { useState } from 'react'
import { useTasks } from '../../context/TasksContext'
import TaskModal from './TaskModal'
import RecurrenceIcon from './RecurrenceIcon'
import CompletedSection from './CompletedSection'
import { recurrenceLabel } from '../../lib/recurrence'
import Pill from '../ui/Pill'
import { Toast } from '../ui/Toast'
import { useToast } from '../../hooks/useToast'
import { priorityOf, tagTone } from '../../lib/taskStyles'
import { formatShort, parseISODate } from '../../lib/dates'
import { BUCKETS, isDone, isOverdue } from '../../lib/taskBuckets'

const formatDate = (date) => (date ? formatShort(parseISODate(date)) : null)

// Mismo punto de color que el tablero
const BUCKET_DOT = { hoy: 'bg-accent', manana: 'bg-pill-yellow', semana: 'bg-pill-sky', proximamente: 'bg-ink-subtle' }

function TaskRow({ task, today, onOpen, onToggleDone }) {
  const done = isDone(task)
  const overdue = isOverdue(task, today)
  const priority = priorityOf(task)

  return (
    <div
      className={`relative flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-card-hover rounded-xl group transition-colors
        ${task.priority === 'urgent' && !done ? 'animate-urgent' : ''}`}
    >
      {/* Círculo de completar, igual que en el tablero (z-10: por encima del
          botón que cubre la fila) */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleDone(task) }}
        aria-label={done ? `Marcar como pendiente: ${task.title}` : `Marcar como completada: ${task.title}`}
        aria-pressed={done}
        className="group/done relative z-10 w-10 h-10 -ml-2 flex items-center justify-center shrink-0 rounded-full"
      >
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'bg-accent border-accent text-accent-ink' : 'border-line-strong text-transparent group-hover/done:border-accent group-hover/done:text-accent'
        }`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </button>

      <div className="flex-1 min-w-0">
        <p className={`flex items-center gap-1.5 text-sm font-medium ${done ? 'text-ink-muted' : 'text-ink'}`}>
          {/* Botón real que cubre toda la fila (.stretched-link): clic o Tab + Enter */}
          <button type="button" onClick={() => onOpen(task)} className="stretched-link min-w-0 text-left cursor-pointer">
            <span className={`block truncate ${done ? 'line-through' : ''}`}>{task.title}</span>
          </button>
          {task.recurrence && (
            <span className="shrink-0 text-accent" title={`Se repite: ${recurrenceLabel(task.recurrence)}`}>
              <RecurrenceIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </p>
        {/* Móvil: datos bajo el título */}
        <div className="flex flex-wrap items-center gap-2 mt-1 sm:hidden">
          {task.in_progress && !done && <Pill tone="sky">En curso</Pill>}
          <Pill tone={priority.tone}>{priority.label}</Pill>
          {task.due_date && (
            <span className={`text-xs font-medium ${overdue ? 'text-danger' : 'text-ink-muted'}`}>
              {overdue ? 'Atrasada · ' : ''}{formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      {/* Escritorio: pastillas y fecha a la derecha */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {task.in_progress && !done && <Pill tone="sky">En curso</Pill>}
        {task.tags?.slice(0, 2).map(tag => <Pill key={tag} tone={tagTone(tag)}>{tag}</Pill>)}
        <Pill tone={priority.tone} className="hidden md:inline-flex">{priority.label}</Pill>
        {task.due_date && (
          <span className={`text-xs font-medium w-28 text-right ${overdue ? 'text-danger' : 'text-ink-muted'}`}>
            {overdue ? 'Atrasada · ' : ''}{formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Vista Lista: los mismos grupos que el tablero (Hoy, Mañana, Esta semana,
// Próximamente y las columnas extra), cada uno plegable, y Completadas al
// final con la misma sección (y el mismo recuerdo de abierta/plegada).
// ─────────────────────────────────────────────────────────────
export default function ListView() {
  const { tasks, board, customColumns, today, completeTask } = useTasks()
  const [editingTask, setEditingTask] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [search, setSearch] = useState('')
  const { toasts, addToast, removeToast } = useToast()

  // Filtro de búsqueda (barato: no hace falta memorizarlo)
  const q = search.trim().toLowerCase()
  const matches = (t) => !q || t.title.toLowerCase().includes(q) || t.tags?.some(tag => tag.includes(q)) || t.description?.toLowerCase().includes(q)

  const groups = [
    ...BUCKETS.map(b => ({ id: b.id, name: b.label, dot: BUCKET_DOT[b.id], tasks: board.buckets[b.id].filter(matches), hideEmpty: true })),
    ...customColumns.map(c => ({ id: c.id, name: c.name, color: c.color, tasks: (board.custom[c.id] ?? []).filter(matches), hideEmpty: !!search })),
  ].filter(g => g.tasks.length > 0 || !g.hideEmpty)
  const completed = board.completed.filter(matches)

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  // Mismo aviso que el tablero
  const toggleDone = (task) => {
    const done = !isDone(task)
    completeTask(task.id, done)
      .then(() => addToast(done ? `"${task.title}" completada` : `"${task.title}" vuelve a pendientes`, 'success'))
      .catch(() => addToast('No se pudo guardar el cambio. Inténtalo de nuevo.', 'error'))
  }

  const total = tasks.length
  const doneCount = board.completed.length

  const renderRow = (task) => (
    <TaskRow key={task.id} task={task} today={today} onOpen={setEditingTask} onToggleDone={toggleDone} />
  )

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6">
      {/* Buscador + progreso */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            aria-label="Buscar tareas"
            placeholder="Buscar tareas…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field pl-10"
          />
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-card-hover rounded-full overflow-hidden" aria-hidden="true">
              <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${Math.round((doneCount / total) * 100)}%` }} />
            </div>
            <span className="text-xs text-ink-muted font-medium whitespace-nowrap shrink-0">{doneCount}/{total} completadas</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {groups.map(g => {
          const isCollapsed = collapsed[g.id]
          return (
            <section key={g.id} className="bg-surface rounded-2xl overflow-hidden">
              <h3>
                <button
                  type="button"
                  onClick={() => toggleCollapse(g.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`list-group-${g.id}`}
                  className="w-full flex items-center gap-3 px-4 h-12 hover:bg-card-hover transition-colors"
                >
                  {g.dot
                    ? <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${g.dot}`} aria-hidden="true" />
                    : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />}
                  <span className="flex-1 text-sm font-bold text-ink text-left">{g.name}</span>
                  <span className="text-xs text-ink-subtle font-semibold">{g.tasks.length}</span>
                  <svg className={`w-4 h-4 text-ink-muted transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </h3>
              {!isCollapsed && (
                <div id={`list-group-${g.id}`} className="border-t border-line px-1 py-1">
                  {g.tasks.length === 0
                    ? <p className="text-center text-xs text-ink-subtle py-5">Sin tareas</p>
                    : g.tasks.map(renderRow)}
                </div>
              )}
            </section>
          )
        })}

        {groups.length === 0 && completed.length === 0 && (
          <p className="text-center text-sm text-ink-muted py-10">
            {search ? 'Ninguna tarea coincide con la búsqueda.' : 'No hay tareas todavía.'}
          </p>
        )}

        <CompletedSection tasks={completed} renderTask={renderRow} layout="list" />
      </div>

      {editingTask && <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
