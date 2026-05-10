import { useState } from 'react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useTasks } from '../../context/TasksContext'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'

export default function KanbanBoard() {
  const { columns, tasks, tasksByColumn, addColumn, reorderTasks, moveTaskToColumn } = useTasks()
  const [activeTask, setActiveTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName, setNewColName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function findColumnId(id) {
    if (columns.find(c => c.id === id)) return id
    return tasks.find(t => t.id === id)?.column_id
  }

  function onDragStart({ active }) {
    setActiveTask(tasks.find(t => t.id === active.id) || null)
  }

  function onDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const activeColId = findColumnId(active.id)
    const overColId = findColumnId(over.id)
    if (!activeColId || !overColId) return

    if (activeColId === overColId) {
      const colTasks = tasksByColumn[activeColId] || []
      const oldIdx = colTasks.findIndex(t => t.id === active.id)
      const newIdx = colTasks.findIndex(t => t.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        reorderTasks(activeColId, arrayMove(colTasks, oldIdx, newIdx))
      }
    } else {
      const overColTasks = tasksByColumn[overColId] || []
      const overIdx = over.id === overColId
        ? overColTasks.length
        : overColTasks.findIndex(t => t.id === over.id)
      moveTaskToColumn(active.id, overColId, overIdx === -1 ? overColTasks.length : overIdx)
    }
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColName.trim()) return
    await addColumn({ name: newColName.trim(), color: '#6366f1' })
    setNewColName('')
    setAddingColumn(false)
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex-1 sm:overflow-x-auto sm:overflow-y-hidden">
          <div className="flex flex-col sm:flex-row gap-4 sm:h-full p-4 sm:p-6 group/board">
            {columns.map(col => (
              <div key={col.id} className="group">
                <KanbanColumn
                  column={col}
                  tasks={tasksByColumn[col.id] || []}
                  onOpenTask={setEditingTask}
                  activeId={activeTask?.id}
                />
              </div>
            ))}

            {/* Add column */}
            <div className="w-full sm:w-72 sm:shrink-0">
              {addingColumn ? (
                <form onSubmit={handleAddColumn} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                  <input
                    type="text"
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    placeholder="Nombre de la columna..."
                    autoFocus
                    onBlur={() => !newColName && setAddingColumn(false)}
                    className="w-full text-sm border border-white/20 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-violet-400/50 bg-white/10 text-white placeholder-white/40 mb-3"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-400 transition-colors">Crear</button>
                    <button type="button" onClick={() => setAddingColumn(false)} className="flex-1 py-2.5 border border-white/20 text-white/70 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">Cancelar</button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-full flex items-center gap-2 text-white/40 hover:text-white/70 text-sm font-medium py-4 px-4 rounded-2xl border-2 border-dashed border-white/15 hover:border-violet-400/50 hover:bg-white/5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva columna
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}
