import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../context/TasksContext'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#64748b']

function SortableTaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={() => onOpen(task)} />
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

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const saveColumn = async () => {
    if (name.trim()) await editColumn(column.id, { name: name.trim(), color })
    setEditing(false)
    setShowColorPicker(false)
  }

  const handleDelete = async () => {
    await removeColumn(column.id)
    setConfirmDelete(false)
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await addTask({ title: newTitle.trim(), column_id: column.id, priority: 'medium', tags: [] })
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col w-full md:w-64 lg:w-72 md:shrink-0">
      {/* Column container */}
      <div className={`flex flex-col rounded-2xl overflow-hidden border transition-all duration-200
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
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveColumn()}
                  autoFocus
                  className="flex-1 text-sm font-semibold text-white bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400/50 placeholder-white/30"
                />
                <button onClick={saveColumn} className="text-xs text-violet-300 font-semibold hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">OK</button>
              </div>
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
                onClick={() => setEditing(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all md:opacity-0 md:group-hover:opacity-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    className="px-2 py-1 text-xs font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors active:scale-95"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/70 rounded-lg transition-colors active:scale-95"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100"
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
          ref={setNodeRef}
          className="flex flex-col gap-2 min-h-[120px] p-3 flex-1"
        >
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
            ))}
          </SortableContext>

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
    </div>
  )
}
