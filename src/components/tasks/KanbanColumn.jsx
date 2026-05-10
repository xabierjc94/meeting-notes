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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={() => onOpen(task)} />
    </div>
  )
}

export default function KanbanColumn({ column, tasks, onOpenTask }) {
  const { editColumn, removeColumn, addTask } = useTasks()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [color, setColor] = useState(column.color)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const saveColumn = async () => {
    if (name.trim()) await editColumn(column.id, { name: name.trim(), color })
    setEditing(false)
    setShowColorPicker(false)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la columna "${column.name}" y todas sus tareas?`)) return
    await removeColumn(column.id)
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await addTask({ title: newTitle.trim(), column_id: column.id, priority: 'medium', tags: [] })
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col w-full sm:w-72 sm:shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {editing ? (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-5 h-5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
                onClick={() => setShowColorPicker(p => !p)}
              />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveColumn()}
                autoFocus
                className="flex-1 text-sm font-semibold text-slate-700 border border-violet-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <button onClick={saveColumn} className="text-sm text-violet-600 font-semibold hover:text-violet-700 px-2 py-1 rounded-lg">OK</button>
            </div>
            {showColorPicker && (
              <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-lg">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setShowColorPicker(false) }}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95 ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
            <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{column.name}</span>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">{tasks.length}</span>
            {/* Always visible on mobile, hover on desktop */}
            <button
              onClick={() => setEditing(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all sm:opacity-0 sm:group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Tasks area */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-[120px] p-2 rounded-2xl transition-colors ${isOver ? 'bg-violet-50/60 ring-2 ring-violet-200' : 'bg-slate-100/60'}`}
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
              className="w-full text-sm border border-violet-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/30 bg-white"
            />
            <div className="flex gap-2 mt-2">
              <button type="submit" className="flex-1 py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors active:scale-95">Añadir</button>
              <button type="button" onClick={() => setAdding(false)} className="flex-1 py-3 border border-slate-200 text-slate-500 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors active:scale-95">Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setAdding(true)}
              className="flex-1 flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-medium py-3 px-3 rounded-xl hover:bg-white/70 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Añadir tarea
            </button>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-violet-600 hover:bg-white/70 transition-all active:scale-95"
              title="Tarea completa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </div>
        )}
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
