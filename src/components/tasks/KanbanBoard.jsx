import { useState } from 'react'
import {
  DndContext, DragOverlay, pointerWithin, rectIntersection, closestCenter,
  PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks } from '../../context/TasksContext'
import { BUCKETS, bucketOf, bucketDateRange, bucketLabel, defaultDateFor, isDone } from '../../lib/taskBuckets'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import TaskMoveMenu from './TaskMoveMenu'
import DateChoiceDialog from './DateChoiceDialog'
import CompletedSection from './CompletedSection'
import { Toast } from '../ui/Toast'
import { useToast } from '../../hooks/useToast'

// Punto de color de cada columna de fecha (las extra usan su propio color)
const BUCKET_DOT = {
  hoy: 'bg-accent',
  manana: 'bg-pill-yellow',
  semana: 'bg-pill-sky',
  proximamente: 'bg-ink-subtle',
}

// Ids de arrastre: "bucket:hoy" o "col:<id>" son los sitios donde soltar
// una tarea; "colsort:<id>" es una columna extra que se reordena.
const isDropTarget = (id) => /^(bucket|col):/.test(String(id))

// Arrastre con teclado. Las columnas extra se reordenan con el patrón
// estándar de dnd-kit (sortableKeyboardCoordinates). Las tareas no son
// "sortable" (solo se sueltan en columnas), así que las flechas las hacen
// saltar al centro de la columna más cercana en esa dirección.
function keyboardCoordinates(event, args) {
  const { active, droppableRects, droppableContainers, collisionRect } = args.context
  if (active?.data.current?.type === 'column') return sortableKeyboardCoordinates(event, args)
  const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[event.code]
  if (!dir || !collisionRect) return undefined
  event.preventDefault()
  const cx = collisionRect.left + collisionRect.width / 2
  const cy = collisionRect.top + collisionRect.height / 2
  let best = null
  for (const container of droppableContainers.getEnabled()) {
    const rect = droppableRects.get(container.id)
    if (!rect || !isDropTarget(container.id)) continue
    const dx = rect.left + rect.width / 2 - cx
    const dy = rect.top + Math.min(rect.height, 120) / 2 - cy
    // Solo las que están en la dirección de la flecha
    if ((dir[0] && Math.sign(dx) !== dir[0]) || (dir[1] && Math.sign(dy) !== dir[1])) continue
    if (Math.abs(dir[0] ? dx : dy) < 10) continue
    const dist = Math.hypot(dx, dy)
    if (!best || dist < best.dist) best = { rect, dist }
  }
  // La copia de la tarea se coloca dentro de la columna elegida
  return best ? { x: best.rect.left + 12, y: best.rect.top + 48 } : undefined
}

// Dónde soltar: la columna que está bajo el puntero; con el teclado (no
// hay puntero) o en el hueco entre columnas, la que más se solapa
function collisionDetection(args) {
  if (args.active.data.current?.type === 'column') {
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(c => String(c.id).startsWith('colsort:')) })
  }
  const targets = { ...args, droppableContainers: args.droppableContainers.filter(c => isDropTarget(c.id)) }
  const hits = pointerWithin(targets)
  return hits.length ? hits : rectIntersection(targets)
}

// ─────────────────────────────────────────────────────────────
// Tablero por fechas:
//   Hoy · Mañana · Esta semana · Próximamente (calculadas por fecha; las
//   vacías se ocultan, salvo mientras arrastras: así puedes soltar en ellas)
//   + columnas extra (siempre visibles, reordenables)
//   + Completadas, plegable, al pie
// ─────────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const {
    board, columns, customColumns, pendingColumn, today,
    completeTask, setInProgress, moveToBucket, moveToColumn, removeTask, reorderColumns,
  } = useTasks()
  const [activeTask, setActiveTask] = useState(null)
  const [activeColumn, setActiveColumn] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [newTask, setNewTask] = useState(null)      // { defaultColumnId, defaultDueDate }
  const [dateChoice, setDateChoice] = useState(null) // { task, bucketId }
  const { toasts, addToast, removeToast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates })
  )

  const fail = () => addToast('No se pudo guardar el cambio. Inténtalo de nuevo.', 'error')

  // Al mover una tarea con el menú, su tarjeta se vuelve a pintar en otra
  // columna y el botón ⋯ que tenía el foco desaparece. Se devuelve el foco
  // al ⋯ de la tarjeta nueva para que quien usa teclado no se pierda.
  const refocusMenu = (taskId) => {
    setTimeout(() => document.querySelector(`button[data-menu-for="${taskId}"]`)?.focus(), 60)
  }

  const locationOf = (task) =>
    pendingColumn && task.column_id === pendingColumn.id ? `bucket:${bucketOf(task.due_date, today)}` : `col:${task.column_id}`

  // Mover una tarea a "bucket:<id>" o "col:<id>" (arrastrando o con el menú ⋯)
  const moveTask = (task, target) => {
    if (target === locationOf(task)) return
    const [type, id] = target.split(':')
    if (type === 'bucket') {
      // Esta semana y Próximamente preguntan el día; Hoy y Mañana no
      if (id === 'semana' || id === 'proximamente') setDateChoice({ task, bucketId: id })
      else moveToBucket(task.id, id).catch(fail)
    } else {
      moveToColumn(task.id, id).catch(fail)
    }
  }

  const toggleDone = (task) => {
    const done = !isDone(task)
    completeTask(task.id, done)
      .then(() => addToast(done ? `"${task.title}" completada` : `"${task.title}" vuelve a pendientes`, 'success'))
      .catch(fail)
  }

  const deleteTask = async (task) => {
    try {
      await removeTask(task.id)
      addToast(`Tarea "${task.title}" eliminada`, 'success')
    } catch {
      addToast('No se pudo eliminar la tarea.', 'error')
    }
  }

  function onDragStart({ active }) {
    if (active.data.current?.type === 'column') setActiveColumn(customColumns.find(c => `colsort:${c.id}` === active.id) ?? null)
    else {
      const pending = [...Object.values(board.buckets).flat(), ...Object.values(board.custom).flat()]
      setActiveTask(pending.find(t => t.id === active.id) ?? null)
    }
  }

  function onDragEnd({ active, over }) {
    const task = activeTask
    setActiveTask(null)
    setActiveColumn(null)
    if (!over) return

    if (active.data.current?.type === 'column') {
      const oldIndex = columns.findIndex(c => `colsort:${c.id}` === active.id)
      const newIndex = columns.findIndex(c => `colsort:${c.id}` === over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) reorderColumns(oldIndex, newIndex)
      return
    }
    if (task && isDropTarget(over.id)) moveTask(task, String(over.id))
  }

  // Lo que oye un lector de pantalla al arrastrar (dnd-kit lo anuncia en
  // inglés y con ids internos si no se le da texto propio)
  const allPending = [...Object.values(board.buckets).flat(), ...Object.values(board.custom).flat()]
  const titleOf = (id) => `"${allPending.find(t => t.id === id)?.title ?? customColumns.find(c => `colsort:${c.id}` === id)?.name ?? ''}"`
  const placeOf = (id) => {
    const [type, rest] = String(id).split(':')
    return type === 'bucket' ? bucketLabel(rest) : customColumns.find(c => c.id === rest)?.name ?? ''
  }
  const accessibility = {
    screenReaderInstructions: {
      draggable: 'Para mover la tarea, pulsa Espacio. Con las flechas eliges la columna; Espacio la suelta y Escape cancela.',
    },
    announcements: {
      onDragStart: ({ active }) => `Has cogido ${titleOf(active.id)}.`,
      onDragOver: ({ active, over }) => over ? `${titleOf(active.id)} sobre ${placeOf(over.id)}.` : `${titleOf(active.id)} fuera de las columnas.`,
      onDragEnd: ({ active, over }) => over ? `${titleOf(active.id)} soltada en ${placeOf(over.id)}.` : `${titleOf(active.id)} vuelve a su sitio.`,
      onDragCancel: ({ active }) => `Cancelado. ${titleOf(active.id)} vuelve a su sitio.`,
    },
  }

  // Las columnas de fecha vacías no se pintan. Mientras arrastras, aparecen
  // en una barra flotante (HiddenBucketBar) en vez de en la fila: si se
  // metieran en la fila, las demás columnas se desplazarían bajo el puntero
  // y la tarea caería en otra distinta de la que apuntabas.
  const visibleBuckets = BUCKETS.filter(b => board.buckets[b.id].length > 0)
  const hiddenBuckets = BUCKETS.filter(b =>
    board.buckets[b.id].length === 0 && (b.id !== 'semana' || bucketDateRange('semana', today))
  )
  const hasPending = visibleBuckets.length > 0 || customColumns.length > 0

  const renderTask = (task) => (
    <DraggableTask key={task.id} task={task}>
      {(dragHandleProps) => (
        <TaskCard
          task={task}
          onClick={() => setEditingTask(task)}
          onDelete={() => deleteTask(task)}
          onToggleDone={() => toggleDone(task)}
          dragHandleProps={dragHandleProps}
          menu={
            <TaskMoveMenu
              task={task}
              location={locationOf(task)}
              customColumns={customColumns}
              today={today}
              onMoveBucket={(id) => {
                moveTask(task, `bucket:${id}`)
                // Esta semana y Próximamente abren el diálogo de fecha: el foco es suyo
                if (id !== 'semana' && id !== 'proximamente') refocusMenu(task.id)
              }}
              onMoveColumn={(id) => { moveTask(task, `col:${id}`); refocusMenu(task.id) }}
              onToggleProgress={() => { setInProgress(task.id, !task.in_progress).catch(fail); refocusMenu(task.id) }}
            />
          }
        />
      )}
    </DraggableTask>
  )

  const renderCompleted = (task) => (
    <TaskCard
      key={task.id}
      task={task}
      compact
      done
      onClick={() => setEditingTask(task)}
      onDelete={() => deleteTask(task)}
      onToggleDone={() => toggleDone(task)}
    />
  )

  const columnClass = 'md:w-72 md:shrink-0 xl:flex-1 xl:min-w-64'

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <DndContext sensors={sensors} collisionDetection={collisionDetection} accessibility={accessibility} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => { setActiveTask(null); setActiveColumn(null) }}>
        <div className="p-3 sm:p-4 md:p-6 flex flex-col gap-4 md:gap-6">
          {/* Móvil: columnas apiladas. Escritorio: en fila, con scroll lateral si no caben */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 md:overflow-x-auto md:pb-2">
            {visibleBuckets.map(b => (
              <div key={b.id} className={columnClass}>
                <KanbanColumn
                  dropId={`bucket:${b.id}`}
                  title={b.label}
                  accent={BUCKET_DOT[b.id]}
                  tasks={board.buckets[b.id]}
                  renderTask={renderTask}
                  onAdd={() => setNewTask({ defaultColumnId: pendingColumn?.id, defaultDueDate: defaultDateFor(b.id, today) ?? '' })}
                />
              </div>
            ))}

            <SortableContext items={customColumns.map(c => `colsort:${c.id}`)} strategy={horizontalListSortingStrategy}>
              {customColumns.map(col => (
                <SortableCustomColumn
                  key={col.id}
                  column={col}
                  className={columnClass}
                  tasks={board.custom[col.id] ?? []}
                  renderTask={renderTask}
                  onAdd={() => setNewTask({ defaultColumnId: col.id, defaultDueDate: '' })}
                />
              ))}
            </SortableContext>

            {!hasPending && (
              <div className="flex-1 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                <p className="text-sm font-semibold text-ink">No tienes tareas pendientes</p>
                <p className="mt-1 text-sm text-ink-muted">Crea una con "Nueva tarea".</p>
                <button
                  type="button"
                  onClick={() => setNewTask({ defaultColumnId: pendingColumn?.id, defaultDueDate: today })}
                  className="mt-4 h-10 px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover transition-colors"
                >
                  Añadir tarea para hoy
                </button>
              </div>
            )}
          </div>

          <CompletedSection tasks={board.completed} renderTask={renderCompleted} />
        </div>

        {activeTask && hiddenBuckets.length > 0 && <HiddenBucketBar buckets={hiddenBuckets} />}

        <DragOverlay>
          {activeTask ? <div className="w-72"><TaskCard task={activeTask} overlay /></div> : null}
          {activeColumn ? (
            <div className="w-72 rotate-2 opacity-90 rounded-2xl border border-accent bg-surface px-4 py-3 text-sm font-bold text-ink shadow-2xl">
              {activeColumn.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingTask && <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />}
      {newTask && <TaskModal defaultColumnId={newTask.defaultColumnId} defaultDueDate={newTask.defaultDueDate} onClose={() => setNewTask(null)} />}
      {dateChoice && (
        <DateChoiceDialog
          task={dateChoice.task}
          bucketId={dateChoice.bucketId}
          today={today}
          onClose={() => setDateChoice(null)}
          onConfirm={async (date) => {
            try {
              await moveToBucket(dateChoice.task.id, dateChoice.bucketId, date)
              setDateChoice(null)
              refocusMenu(dateChoice.task.id)
            } catch {
              fail()
            }
          }}
        />
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// Barra flotante con las columnas de fecha vacías (solo mientras arrastras).
// Posición fija sobre el tablero: no empuja ni mueve las columnas visibles.
function HiddenBucketBar({ buckets }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2 p-2 rounded-2xl bg-card border border-line-strong shadow-2xl shadow-black/60">
      <span className="self-center px-2 text-xs font-medium text-ink-muted">Soltar en</span>
      {buckets.map(b => <HiddenBucketTarget key={b.id} bucket={b} />)}
    </div>
  )
}

function HiddenBucketTarget({ bucket }) {
  const { setNodeRef, isOver } = useDroppable({ id: `bucket:${bucket.id}` })
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 h-12 px-4 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors ${
        isOver ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-ink'
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${BUCKET_DOT[bucket.id]}`} aria-hidden="true" />
      {bucket.label}
    </div>
  )
}

// Tarjeta que se puede arrastrar entre columnas (no se reordena dentro:
// el orden lo marca la fecha). El asa recibe los atributos de teclado.
function DraggableTask({ task, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { type: 'task' } })
  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-30' : undefined}>
      {children({ ...attributes, ...listeners, style: { touchAction: 'none' } })}
    </div>
  )
}

// Columna extra que se puede reordenar arrastrando su cabecera
function SortableCustomColumn({ column, className, tasks, renderTask, onAdd }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `colsort:${column.id}`,
    data: { type: 'column' },
  })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={className}>
      <KanbanColumn
        dropId={`col:${column.id}`}
        title={column.name}
        column={column}
        tasks={tasks}
        renderTask={renderTask}
        onAdd={onAdd}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  )
}
