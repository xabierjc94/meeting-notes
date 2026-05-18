import { useState, useEffect, useRef, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../context/TasksContext'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#64748b']

function SortableTaskCard({ task, onOpen, compact = false, stretch = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={stretch ? 'h-full' : undefined}
      {...attributes}
    >
      <TaskCard
        task={task}
        onClick={() => onOpen(task)}
        compact={compact}
        stretch={stretch}
        dragHandleProps={{ ...listeners, style: { touchAction: 'none' } }}
      />
    </div>
  )
}

export default function KanbanColumn({ column, tasks, onOpenTask, dragHandleProps = {}, isDragging = false, overlay = false }) {
  const { editColumn, removeColumn, addTask } = useTasks()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [color, setColor] = useState(column.color)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [colError, setColError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedAdding, setExpandedAdding] = useState(false)
  const [expandedTitle, setExpandedTitle] = useState('')

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const PAGE_SIZE = 6
  const isCompleted = column.name.toLowerCase().includes('completado')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleTasks = isCompleted ? tasks.slice(Math.max(0, tasks.length - visibleCount)) : tasks
  const hiddenCount = isCompleted ? Math.max(0, tasks.length - visibleCount) : 0

  const scrollRef = useRef(null)
  const combinedRef = useCallback(node => { setNodeRef(node); scrollRef.current = node }, [setNodeRef])

  const loadMore = () => {
    setVisibleCount(c => c + PAGE_SIZE)
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 50)
  }

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => { if (e.key === 'Escape') { setExpanded(false); setExpandedAdding(false); setExpandedTitle('') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded])

  const cancelEdit = () => {
    setName(column.name)
    setColor(column.color)
    setEditing(false)
    setShowColorPicker(false)
    setColError(null)
  }

  const saveColumn = async () => {
    if (!name.trim()) { setColError('El nombre no puede estar vacío'); return }
    try {
      await editColumn(column.id, { name: name.trim(), color })
      setEditing(false)
      setShowColorPicker(false)
      setColError(null)
    } catch {
      setColError('Error al guardar. Inténtalo de nuevo.')
    }
  }

  const handleDelete = async () => {
    try {
      await removeColumn(column.id)
    } catch {
      setConfirmDelete(false)
    }
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      await addTask({ title: newTitle.trim(), column_id: column.id, priority: 'medium', tags: [] })
      setNewTitle('')
      setAdding(false)
    } catch {
      // keep form open so user can retry
    }
  }

  const handleExpandedQuickAdd = async (e) => {
    e.preventDefault()
    if (!expandedTitle.trim()) return
    try {
      await addTask({ title: expandedTitle.trim(), column_id: column.id, priority: 'medium', tags: [] })
      setExpandedTitle('')
      setExpandedAdding(false)
    } catch {
      // keep form open so user can retry
    }
  }

  return (
    <div className="flex flex-col w-full sm:h-full">
      {/* Column container */}
      <div className={`group flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 sm:h-full
        ${isDragging ? 'border-violet-400/60 shadow-2xl shadow-violet-500/30 scale-105' :
          isOver ? 'border-violet-400/60 shadow-lg shadow-violet-500/20' : 'border-white/10'
        } bg-white/8 backdrop-blur-md`}
        style={{ background: isOver ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.06)' }}
      >
        {/* Colored top accent */}
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: column.color }} />

        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          {editing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-5 h-5 rounded-full shrink-0 ring-2 ring-white/20"
                  style={{ backgroundColor: color }}
                  onClick={() => setShowColorPicker(p => !p)}
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setColError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') saveColumn(); else if (e.key === 'Escape') cancelEdit() }}
                  autoFocus
                  className="flex-1 text-sm font-semibold text-white bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400/50 placeholder-white/30"
                />
                <button onClick={saveColumn} className="text-xs text-violet-300 font-semibold hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">OK</button>
                <button onClick={cancelEdit} className="text-xs text-white/40 font-semibold hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">✕</button>
              </div>
              {colError && <p className="text-xs text-red-400 px-1">{colError}</p>}
              {showColorPicker && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/80 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setColor(c); setShowColorPicker(false) }}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95 ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* Drag handle */}
              <div
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing text-white/25 hover:text-white/60 transition-colors shrink-0 touch-none"
                title="Arrastrar columna"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
              </div>
              <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-md" style={{ backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}80` }} />
              <span className="flex-1 text-sm font-bold text-white truncate">{column.name}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white/60 bg-white/10">{tasks.length}</span>
              <button
                onClick={() => setExpanded(true)}
                className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                title="Expandir columna"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              <button
                onClick={() => setEditing(true)}
                className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all md:opacity-0 md:group-hover:opacity-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2 md:px-2 md:py-1 text-xs font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors active:scale-95"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 md:px-2 md:py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors active:scale-95"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tasks area */}
        <div
          ref={combinedRef}
          className={`flex flex-col gap-2 p-3 ${isCompleted ? (visibleCount > PAGE_SIZE ? 'sm:flex-1 sm:min-h-0 sm:overflow-y-auto' : 'sm:flex-1 sm:min-h-0') : 'sm:flex-1 sm:min-h-0 sm:overflow-y-auto'}`}
        >
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {isCompleted && visibleCount <= PAGE_SIZE ? (
              <div
                className="flex-1 min-h-0 grid gap-1.5"
                style={{ gridTemplateRows: `repeat(${visibleTasks.length}, 1fr)` }}
              >
                {visibleTasks.map(task => (
                  <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} compact stretch />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleTasks.map(task => (
                  <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} compact={isCompleted} />
                ))}
              </div>
            )}
          </SortableContext>

          {isCompleted && hiddenCount > 0 && (
            <button
              onClick={loadMore}
              className="w-full shrink-0 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/8 rounded-xl transition-all active:scale-95 border border-white/10 border-dashed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Cargar {Math.min(hiddenCount, PAGE_SIZE)} más · {hiddenCount} ocultas
            </button>
          )}

          {/* Quick add */}
          {adding ? (
            <form onSubmit={handleQuickAdd} className="mt-1">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Nombre de la tarea..."
                autoFocus
                onBlur={() => !newTitle && setAdding(false)}
                className="w-full text-sm border border-white/20 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400/50 bg-white/10 text-white placeholder-white/30"
              />
              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-400 transition-colors active:scale-95">Añadir</button>
                <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2.5 border border-white/15 text-white/60 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors active:scale-95">Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => setAdding(true)}
                className="flex-1 flex items-center gap-2 text-white/30 hover:text-white/60 text-xs font-medium py-2.5 px-3 rounded-xl hover:bg-white/8 transition-all active:scale-95"
                style={{ '--tw-bg-opacity': 0.08 }}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir tarea
              </button>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-violet-300 hover:bg-violet-500/15 transition-all active:scale-95"
                title="Tarea completa"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {showNewTaskModal && (
        <TaskModal
          defaultColumnId={column.id}
          onClose={() => setShowNewTaskModal(false)}
        />
      )}

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) { setExpanded(false); setExpandedAdding(false); setExpandedTitle('') } }}
        >
          {/* Colored top accent */}
          <div className="h-1 w-full shrink-0 rounded-t-2xl" style={{ backgroundColor: column.color }} />

          <div className="flex flex-col flex-1 min-h-0 bg-white/6 rounded-b-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-md" style={{ backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}80` }} />
                <span className="flex-1 text-sm font-bold text-white truncate">{column.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white/60 bg-white/10">{tasks.length}</span>
                <button
                  onClick={() => { setExpanded(false); setExpandedAdding(false); setExpandedTitle('') }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  title="Cerrar (Esc)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6M3 8V4m0 0h4M3 4l5 5m13-1V4m0 0h-4m4 0l-5 5M3 16v4m0 0h4m-4 0l5-5m13 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tasks — grid responsive: 1 col móvil, 2 tablet, 3 md, 4 lg, 5 xl */}
            <div className="p-3 sm:p-4 flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} />
                ))}
              </div>

              {expandedAdding ? (
                <form onSubmit={handleExpandedQuickAdd} className="mt-3">
                  <input
                    type="text"
                    value={expandedTitle}
                    onChange={e => setExpandedTitle(e.target.value)}
                    placeholder="Nombre de la tarea..."
                    autoFocus
                    className="w-full text-sm border border-white/20 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400/50 bg-white/10 text-white placeholder-white/30"
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="submit" className="flex-1 py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-400 transition-colors active:scale-95">Añadir</button>
                    <button type="button" onClick={() => { setExpandedAdding(false); setExpandedTitle('') }} className="flex-1 py-2.5 border border-white/15 text-white/60 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors active:scale-95">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-1.5 mt-3">
                  <button
                    onClick={() => setExpandedAdding(true)}
                    className="flex items-center gap-2 text-white/30 hover:text-white/60 text-xs font-medium py-2.5 px-3 rounded-xl hover:bg-white/8 transition-all active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir tarea
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
