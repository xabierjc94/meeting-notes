import { useState, useEffect, useRef, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../context/TasksContext'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import { hasOpenModal } from '../../hooks/useModalLayer'

const COLORS = ['#b4f53c','#4ade80','#2dd4bf','#38bdf8','#c4b5fd','#f9a8d4','#f87171','#fb923c','#facc15','#a3a3a3']

function SortableTaskCard({ task, onOpen, onDelete, compact = false, stretch = false, done = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={stretch ? 'h-full' : undefined}
    >
      {/* attributes (role, tabIndex…) y listeners van juntos en el asa: así el
          asa se puede enfocar con Tab y arrastrar con el teclado */}
      <TaskCard
        task={task}
        onClick={() => onOpen(task)}
        onDelete={onDelete}
        compact={compact}
        stretch={stretch}
        done={done}
        dragHandleProps={{ ...attributes, ...listeners, style: { touchAction: 'none' } }}
      />
    </div>
  )
}

export default function KanbanColumn({ column, tasks, onOpenTask, dragHandleProps = {}, isDragging = false, overlay = false, onTaskDeleted }) {
  const { editColumn, removeColumn, removeTask } = useTasks()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [color, setColor] = useState(column.color)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [colError, setColError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedAdding, setExpandedAdding] = useState(false)
  const [expandedTitle, setExpandedTitle] = useState('')

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const PAGE_SIZE = 6
  const isCompleted = column.name.toLowerCase().includes('completado')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleTasks = isCompleted ? tasks.slice(0, visibleCount) : tasks
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
    const onKey = (e) => { if (e.key === 'Escape' && !hasOpenModal()) { setExpanded(false); setExpandedAdding(false); setExpandedTitle('') } }
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

  // El título escrito abre el panel completo; la tarea se crea al guardar allí
  const openFullTask = (title = '') => {
    setNewTaskTitle(title)
    setShowNewTaskModal(true)
  }

  const handleQuickAdd = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    openFullTask(newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  const handleExpandedQuickAdd = (e) => {
    e.preventDefault()
    if (!expandedTitle.trim()) return
    openFullTask(expandedTitle.trim())
    setExpandedTitle('')
    setExpandedAdding(false)
  }

  return (
    <div className="flex flex-col w-full sm:h-full">
      {/* Column container */}
      {/* Columna plana como en el diseño de referencia: fondo surface, sin
          borde; al pasar una tarea por encima se ilumina en lima */}
      <div className={`group flex flex-col rounded-2xl overflow-hidden border transition-colors duration-200 sm:h-full
        ${overlay ? 'border-accent bg-surface shadow-2xl shadow-black/50' : isDragging ? 'border-accent/50 bg-surface' : isOver ? 'border-accent/50 bg-accent-soft' : 'border-transparent bg-surface'}`}
      >

        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          {editing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-5 h-5 rounded-full shrink-0 ring-2 ring-line-strong"
                  style={{ backgroundColor: color }}
                  onClick={() => setShowColorPicker(p => !p)}
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setColError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') saveColumn(); else if (e.key === 'Escape') cancelEdit() }}
                  autoFocus
                  className="flex-1 text-sm font-semibold text-ink bg-card-hover border border-line-strong rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-ink-subtle"
                />
                <button onClick={saveColumn} className="text-xs text-accent font-semibold hover:text-ink px-2 py-1 rounded-lg hover:bg-card-hover transition-colors">OK</button>
                <button onClick={cancelEdit} className="text-xs text-ink-muted font-semibold hover:text-ink px-2 py-1 rounded-lg hover:bg-card-hover transition-colors">✕</button>
              </div>
              {colError && <p className="text-xs text-red-400 px-1">{colError}</p>}
              {showColorPicker && (
                <div className="flex flex-wrap gap-2 p-3 bg-card rounded-xl border border-line shadow-xl">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setColor(c); setShowColorPicker(false) }}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95 ${color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-ink scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              {/* Drag handle — solo desktop */}
              <div
                {...dragHandleProps}
                className="hidden md:flex cursor-grab active:cursor-grabbing text-ink-subtle hover:text-ink transition-colors shrink-0 touch-none"
                title="Arrastrar columna"
                aria-label={`Mover columna: ${column.name}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
              </div>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: column.color }} aria-hidden="true" />
              <span className="flex-1 text-sm font-bold text-ink truncate min-w-0">{column.name}</span>
              <span className="text-xs font-semibold text-ink-subtle shrink-0" aria-label={`${tasks.length} tareas`}>{tasks.length}</span>
              {/* Acciones: en escritorio flotan sobre la derecha de la cabecera al
                  pasar el ratón o llegar con Tab (focus-within), así no le quitan
                  ancho al nombre de la columna */}
              <div className="flex items-center gap-0.5 shrink-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 md:pl-2 md:bg-surface md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
              <button
                onClick={() => setExpanded(true)}
                className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card-hover transition-colors shrink-0"
                title="Expandir columna"
                aria-label={`Expandir columna ${column.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              {/* Editar y eliminar — solo desktop */}
              <button
                onClick={() => setEditing(true)}
                className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card-hover transition-colors shrink-0"
                title="Editar columna"
                aria-label={`Editar columna ${column.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {confirmDelete ? (
                <div className="hidden md:flex items-center gap-1">
                  <button onClick={handleDelete} className="px-2 py-1 text-xs font-semibold bg-danger text-canvas rounded-lg transition-colors active:scale-95">Sí</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs font-semibold bg-card-hover hover:bg-card-hover text-ink-muted rounded-lg transition-colors active:scale-95">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                  title="Eliminar columna"
                  aria-label={`Eliminar columna ${column.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Tasks area */}
        <div
          ref={combinedRef}
          className={`flex flex-col gap-2 p-3 ${isCompleted ? (visibleCount > PAGE_SIZE ? 'sm:flex-1 sm:min-h-0 sm:overflow-y-auto' : 'sm:flex-1 sm:min-h-0') : 'sm:flex-1 sm:min-h-0 sm:overflow-y-auto'}`}
        >
          {/* Quick add — arriba, porque las tareas nuevas se colocan al principio */}
          {adding ? (
            <form onSubmit={handleQuickAdd} className="mb-1">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Nombre de la tarea..."
                autoFocus
                onBlur={() => !newTitle && setAdding(false)}
                className="w-full text-sm border border-line-strong rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40 bg-card-hover text-ink placeholder:text-ink-subtle"
              />
              <div className="flex gap-2 mt-2">
                <button type="submit" className="flex-1 py-2.5 bg-accent text-accent-ink text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors active:scale-95">Añadir</button>
                <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2.5 border border-line-strong text-ink-muted text-sm font-semibold rounded-xl hover:bg-card-hover transition-colors active:scale-95">Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="flex gap-1.5 mb-1 shrink-0">
              <button
                onClick={() => setAdding(true)}
                className="flex-1 flex items-center gap-2 text-ink-muted hover:text-ink text-xs font-medium py-2.5 px-3 rounded-xl hover:bg-card-hover transition-all active:scale-95"
                style={{ '--tw-bg-opacity': 0.08 }}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir tarea
              </button>
              <button
                onClick={() => openFullTask()}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-accent hover:bg-accent-soft transition-all active:scale-95"
                title="Tarea completa"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          )}

          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {isCompleted && visibleCount <= PAGE_SIZE ? (
              <div
                className="flex-1 min-h-0 grid gap-1.5 content-start"
                // Reparte la altura entre las tarjetas (caben todas sin scroll), pero
                // con un tope de ~80 px cada una: con pocas tareas no se estiran
                style={{ gridTemplateRows: `repeat(${visibleTasks.length}, minmax(0, 1fr))`, maxHeight: `${visibleTasks.length * 5}rem` }}
              >
                {visibleTasks.map(task => (
                  <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} onDelete={async () => { await removeTask(task.id); onTaskDeleted?.(task.title) }} compact stretch done />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleTasks.map(task => (
                  <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} onDelete={async () => { await removeTask(task.id); onTaskDeleted?.(task.title) }} compact={isCompleted} done={isCompleted} />
                ))}
              </div>
            )}
          </SortableContext>

          {isCompleted && hiddenCount > 0 && (
            <button
              onClick={loadMore}
              className="w-full shrink-0 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-card-hover rounded-xl transition-all active:scale-95 border border-line border-dashed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Cargar {Math.min(hiddenCount, PAGE_SIZE)} más · {hiddenCount} ocultas
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-card p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) { setExpanded(false); setExpandedAdding(false); setExpandedTitle('') } }}
        >
          {/* Colored top accent */}
          <div className="h-1 w-full shrink-0 rounded-t-2xl" style={{ backgroundColor: column.color }} />

          <div className="flex flex-col flex-1 min-h-0 bg-card rounded-b-2xl border border-line overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-md" style={{ backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}80` }} />
                <span className="flex-1 text-sm font-bold text-ink truncate min-w-0">{column.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-ink-muted bg-card-hover shrink-0">{tasks.length}</span>
                {/* Editar columna — accesible desde el modal en móvil */}
                <button
                  onClick={() => { setExpanded(false); setEditing(true) }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card-hover transition-all shrink-0"
                  title="Editar columna"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => { setExpanded(false); setExpandedAdding(false); setExpandedTitle('') }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card-hover transition-all shrink-0"
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
              {expandedAdding ? (
                <form onSubmit={handleExpandedQuickAdd} className="mb-3">
                  <input
                    type="text"
                    value={expandedTitle}
                    onChange={e => setExpandedTitle(e.target.value)}
                    placeholder="Nombre de la tarea..."
                    autoFocus
                    className="w-full text-sm border border-line-strong rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40 bg-card-hover text-ink placeholder:text-ink-subtle"
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="submit" className="flex-1 py-2.5 bg-accent text-accent-ink text-sm font-semibold rounded-xl hover:bg-accent-hover transition-colors active:scale-95">Añadir</button>
                    <button type="button" onClick={() => { setExpandedAdding(false); setExpandedTitle('') }} className="flex-1 py-2.5 border border-line-strong text-ink-muted text-sm font-semibold rounded-xl hover:bg-card-hover transition-colors active:scale-95">Cancelar</button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-1.5 mb-3">
                  <button
                    onClick={() => setExpandedAdding(true)}
                    className="flex items-center gap-2 text-ink-muted hover:text-ink text-xs font-medium py-2.5 px-3 rounded-xl hover:bg-card-hover transition-all active:scale-95"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir tarea
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} done={isCompleted} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Después de la vista ampliada para quedar por encima (mismo z-50) */}
      {showNewTaskModal && (
        <TaskModal
          defaultColumnId={column.id}
          defaultTitle={newTaskTitle}
          onClose={() => setShowNewTaskModal(false)}
        />
      )}
    </div>
  )
}
