import { useState } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, TouchSensor, useSensor, useSensors,
  KeyboardSensor
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy,
  arrayMove, useSortable, sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../context/TasksContext'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import { Toast } from '../ui/Toast'
import { useToast } from '../../hooks/useToast'

function SortableColumn({ col, onOpenTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${col.id}`,
    data: { type: 'column' }
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="group"
    >
      <KanbanColumn
        column={col}
        tasks={[]}
        onOpenTask={onOpenTask}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  )
}

export default function KanbanBoard() {
  const { columns, tasks, tasksByColumn, reorderTasks, reorderColumns, moveTaskToColumn } = useTasks()
  const [activeTask, setActiveTask] = useState(null)
  const [activeColumn, setActiveColumn] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const { toasts, addToast, removeToast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function findColumnId(id) {
    if (columns.find(c => c.id === id)) return id
    // 'col-UUID' comes from the column's useSortable wrapper — strip prefix
    if (typeof id === 'string' && id.startsWith('col-')) {
      const rawId = id.slice(4)
      const col = columns.find(c => String(c.id) === rawId)
      if (col) return col.id
    }
    return tasks.find(t => t.id === id)?.column_id
  }

  function onDragStart({ active }) {
    const type = active.data.current?.type
    if (type === 'column') {
      const col = columns.find(c => `col-${c.id}` === active.id)
      setActiveColumn(col || null)
    } else {
      setActiveTask(tasks.find(t => t.id === active.id) || null)
    }
  }

  function onDragEnd({ active, over }) {
    setActiveTask(null)
    setActiveColumn(null)
    if (!over || active.id === over.id) return

    // Column reorder
    if (active.data.current?.type === 'column') {
      const oldIndex = columns.findIndex(c => `col-${c.id}` === active.id)
      const newIndex = columns.findIndex(c => `col-${c.id}` === over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderColumns(oldIndex, newIndex)
      }
      return
    }

    // Task reorder / move
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

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-y-auto sm:overflow-x-auto sm:overflow-y-auto md:overflow-y-hidden">
          <SortableContext
            items={columns.map(c => `col-${c.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:h-full p-3 sm:p-4 md:p-6 lg:w-full">
              {columns.map(col => (
                <ColumnWithTasks
                  key={col.id}
                  col={col}
                  tasks={tasksByColumn[col.id] || []}
                  onOpenTask={setEditingTask}
                  activeTaskId={activeTask?.id}
                  onTaskDeleted={(title) => addToast(`Tarea "${title}" eliminada`, 'success')}
                />
              ))}

            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} overlay /> : null}
          {activeColumn ? (
            <div className="rotate-2 opacity-90 w-72">
              <KanbanColumn
                column={activeColumn}
                tasks={tasksByColumn[activeColumn.id] || []}
                onOpenTask={() => {}}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// Wrapper que combina sortable de columna + droppable de tareas
function ColumnWithTasks({ col, tasks, onOpenTask, activeTaskId, onTaskDeleted }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${col.id}`,
    data: { type: 'column' }
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group w-full sm:h-full sm:w-72 sm:shrink-0 lg:flex-1 lg:w-auto lg:min-w-48"
    >
      <KanbanColumn
        column={col}
        tasks={tasks}
        onOpenTask={onOpenTask}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        onTaskDeleted={onTaskDeleted}
      />
    </div>
  )
}
