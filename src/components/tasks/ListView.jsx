import { useState, useMemo } from 'react'
import { useTasks } from '../../context/TasksContext'
import TaskModal from './TaskModal'

const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    class: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Media',   class: 'bg-amber-100 text-amber-700' },
  high:   { label: 'Alta',    class: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', class: 'bg-red-100 text-red-700' },
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}

function TaskRow({ task, onOpen, onToggleDone, doneColumnId }) {
  const isDone = task.column_id === doneColumnId
  const overdue = isOverdue(task.due_date)
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl cursor-pointer group transition-colors"
      onClick={() => onOpen(task)}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggleDone(task, isDone) }}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
          ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-violet-400'}`}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span className={`flex-1 text-sm font-medium truncate transition-colors
        ${isDone ? 'line-through text-slate-400' : 'text-slate-700 group-hover:text-violet-700'}`}>
        {task.title}
      </span>

      {/* Tags */}
      <div className="hidden sm:flex gap-1 shrink-0">
        {task.tags?.slice(0, 2).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-violet-50 text-violet-600 text-xs rounded-md font-medium">#{tag}</span>
        ))}
      </div>

      {/* Priority */}
      <span className={`hidden md:inline-flex px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${priority.class}`}>
        {priority.label}
      </span>

      {/* Due date */}
      {task.due_date && (
        <span className={`hidden sm:inline text-xs font-medium shrink-0 ${overdue && !isDone ? 'text-red-500' : 'text-slate-400'}`}>
          {overdue && !isDone ? '⚠ ' : ''}{formatDate(task.due_date)}
        </span>
      )}

      {/* Edit icon */}
      <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const doneColumn = useMemo(() => columns.find(c => c.name.toLowerCase().includes('complet') || c.name.toLowerCase().includes('done')), [columns])

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
    <div className="h-full overflow-y-auto p-6">
      {/* Search + progress */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
          />
        </div>
        {totalTasks > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex-1 sm:w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{doneTasks}/{totalTasks} completadas</span>
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="space-y-4">
        {columns.map(col => {
          const colTasks = filteredByColumn[col.id] || []
          if (search && colTasks.length === 0) return null
          const isCollapsed = collapsed[col.id]

          return (
            <div key={col.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              {/* Column header */}
              <button
                onClick={() => toggleCollapse(col.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="flex-1 text-sm font-semibold text-slate-700 text-left">{col.name}</span>
                <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">{colTasks.length}</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Tasks */}
              {!isCollapsed && (
                <div className="border-t border-slate-100 px-2 py-1">
                  {colTasks.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-4">Sin tareas</p>
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
