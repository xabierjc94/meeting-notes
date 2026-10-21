import { useState, useMemo } from 'react'
import { useTasks } from '../../context/TasksContext'
import TaskModal from './TaskModal'
import RecurrenceIcon from './RecurrenceIcon'
import { recurrenceLabel } from '../../lib/recurrence'
import Pill from '../ui/Pill'
import { priorityOf, tagTone } from '../../lib/taskStyles'
import { diffDays, formatShort, parseISODate, today } from '../../lib/dates'

// Mismo estilo que el tablero (lib/taskStyles) y fechas como días de
// calendario (lib/dates), sin desfases por zona horaria
function formatDate(date) {
  return date ? formatShort(parseISODate(date)) : null
}

function isOverdue(date) {
  return date ? diffDays(today(), parseISODate(date)) < 0 : false
}

function TaskRow({ task, onOpen, onToggleDone, doneColumnId }) {
  const isDone = task.column_id === doneColumnId
  const overdue = isOverdue(task.due_date)
  const priority = priorityOf(task)

  return (
    <div
      className={`relative flex items-center gap-3 px-3 sm:px-4 py-3.5 hover:bg-card-hover active:bg-line rounded-xl group transition-colors
        ${task.priority === 'urgent' && !isDone ? 'animate-urgent' : ''}`}
    >
      {/* Checkbox — larger touch target (z-10: por encima del botón que cubre la fila) */}
      <button
        onClick={e => { e.stopPropagation(); onToggleDone(task, isDone) }}
        aria-label={isDone ? `Marcar como pendiente: ${task.title}` : `Marcar como completada: ${task.title}`}
        aria-pressed={isDone}
        className={`relative z-10 w-10 h-10 -ml-1 flex items-center justify-center shrink-0 rounded-xl transition-all active:scale-90
          ${isDone ? 'text-emerald-500' : 'text-ink hover:text-accent'}`}
      >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
          ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-current'}`}>
          {isDone && (
            <svg className="w-3 h-3 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      {/* Title + meta (stacked on mobile) */}
      <div className="flex-1 min-w-0">
        <p className={`flex items-center gap-1.5 text-sm font-medium transition-colors
          ${isDone ? 'line-through text-ink-muted' : 'text-ink group-hover:text-accent'}`}>
          {/* Botón real que cubre toda la fila (.stretched-link): clic o Tab + Enter */}
          <button type="button" onClick={() => onOpen(task)} className="stretched-link min-w-0 text-left cursor-pointer">
            <span className={`block truncate ${isDone ? 'line-through' : ''}`}>{task.title}</span>
          </button>
          {task.recurrence && (
            <span className="shrink-0 text-accent" title={`Se repite: ${recurrenceLabel(task.recurrence)}`}>
              <RecurrenceIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </p>
        {/* Mobile meta row */}
        <div className="flex items-center gap-2 mt-0.5 sm:hidden">
          <Pill tone={priority.tone}>{priority.label}</Pill>
          {task.due_date && (
            <span className={`text-xs font-medium ${overdue && !isDone ? 'text-danger' : 'text-ink-muted'}`}>
              {overdue && !isDone ? '⚠ ' : ''}{formatDate(task.due_date)}
            </span>
          )}
          {task.tags?.slice(0, 1).map(tag => (
            <Pill key={tag} tone={tagTone(tag)}>{tag}</Pill>
          ))}
        </div>
      </div>

      {/* Desktop: tags, priority, date */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {task.tags?.slice(0, 2).map(tag => (
          <Pill key={tag} tone={tagTone(tag)}>{tag}</Pill>
        ))}
      </div>
      <Pill tone={priority.tone} className="hidden md:inline-flex shrink-0">{priority.label}</Pill>
      {task.due_date && (
        <span className={`hidden sm:inline text-xs font-medium shrink-0 ${overdue && !isDone ? 'text-danger' : 'text-ink-muted'}`}>
          {overdue && !isDone ? '⚠ ' : ''}{formatDate(task.due_date)}
        </span>
      )}

      <svg className="w-4 h-4 text-ink group-hover:text-ink shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

export default function ListView() {
  const { columns, tasksByColumn, editTask } = useTasks()
  const [editingTask, setEditingTask] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [search, setSearch] = useState('')

  const doneColumn = useMemo(() =>
    columns.find(c => c.name.toLowerCase().includes('complet') || c.name.toLowerCase().includes('done')),
    [columns]
  )

  const filteredByColumn = useMemo(() => {
    if (!search.trim()) return tasksByColumn
    const q = search.toLowerCase()
    const result = {}
    columns.forEach(col => {
      result[col.id] = (tasksByColumn[col.id] || []).filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.includes(q)) ||
        t.description?.toLowerCase().includes(q)
      )
    })
    return result
  }, [tasksByColumn, search, columns])

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const handleToggleDone = async (task, isDone) => {
    if (!doneColumn) return
    if (isDone) {
      const firstCol = columns.find(c => c.id !== doneColumn.id)
      if (firstCol) await editTask(task.id, { column_id: firstCol.id })
    } else {
      await editTask(task.id, { column_id: doneColumn.id })
    }
  }

  const totalTasks = columns.reduce((sum, col) => sum + (tasksByColumn[col.id]?.length || 0), 0)
  const doneTasks = doneColumn ? (tasksByColumn[doneColumn.id]?.length || 0) : 0

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      {/* Search + progress */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-line-strong text-ink placeholder:text-ink-subtle rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
        </div>
        {totalTasks > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-card-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-ink-muted font-medium whitespace-nowrap shrink-0">{doneTasks}/{totalTasks} completadas</span>
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="space-y-3">
        {columns.map(col => {
          const colTasks = filteredByColumn[col.id] || []
          if (search && colTasks.length === 0) return null
          const isCollapsed = collapsed[col.id]

          return (
            <div key={col.id} className="bg-card rounded-2xl border border-line overflow-hidden">
              {/* Column header — full tap target */}
              <button
                onClick={() => toggleCollapse(col.id)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-card-hover active:bg-line transition-colors"
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="flex-1 text-sm font-semibold text-ink text-left">{col.name}</span>
                <span className="text-xs text-ink-muted font-medium bg-card-hover px-2 py-0.5 rounded-lg">{colTasks.length}</span>
                <svg
                  className={`w-4 h-4 text-ink-muted transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Tasks */}
              {!isCollapsed && (
                <div className="border-t border-line px-1 py-1">
                  {colTasks.length === 0 ? (
                    <p className="text-center text-xs text-ink-muted py-5">Sin tareas</p>
                  ) : (
                    colTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onOpen={setEditingTask}
                        onToggleDone={handleToggleDone}
                        doneColumnId={doneColumn?.id}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  )
}
