import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../context/TasksContext'
import TaskCard from './TaskCard'

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

export default function KanbanColumn({ column, tasks, onOpenTask, activeId }) {
  const { editColumn, removeColumn, addTask } = useTasks()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [color, setColor] = useState(column.color)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

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

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await addTask({ title: newTitle.trim(), column_id: column.id, priority: 'medium', tags: [] })
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {editing ? (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0 cursor-pointer" style={{ backgroundColor: color }} onClick={() => setShowColorPicker(p => !p)} />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveColumn()}
                autoFocus
                className="flex-1 text-sm font-semibold text-slate-700 border border-violet-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <button onClick={saveColumn} className="text-xs text-violet-600 font-semibold hover:text-violet-700 px-2">OK</button>
            </div>
            {showColorPicker && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-lg">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setShowColorPicker(false) }}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
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
            <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <form onSubmit={handleAddTask} className="mt-1">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nombre de la tarea..."
              autoFocus
              onBlur={() => !newTitle && setAdding(false)}
              className="w-full text-sm border border-violet-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 bg-white"
            />
            <div className="flex gap-2 mt-2">
              <button type="submit" className="flex-1 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-500 transition-colors">Añadir</button>
              <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2 border border-slate-200 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-medium py-2 px-2 rounded-xl hover:bg-white/70 transition-all mt-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir tarea
          </button>
        )}
      </div>
    </div>
  )
}
