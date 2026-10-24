import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useTasks } from '../../context/TasksContext'
import ColorPicker from '../ui/ColorPicker'

// ─────────────────────────────────────────────────────────────
// Una columna del tablero. Dos tipos:
//   - de fecha (Hoy, Mañana…): fija, sin editar ni borrar;
//   - extra (`column`): la crea Javi; se puede renombrar, cambiar de
//     color, borrar y reordenar arrastrando su cabecera.
// La columna no decide qué tareas lleva ni en qué orden: se lo da el
// tablero ya calculado. Ella solo las pinta (renderTask) y avisa de
// "Añadir tarea" (onAdd).
// ─────────────────────────────────────────────────────────────
export default function KanbanColumn({ dropId, title, accent = null, column = null, tasks, renderTask, onAdd, dragHandleProps = null, isDragging = false }) {
  const { editColumn, removeColumn } = useTasks()
  const { setNodeRef, isOver } = useDroppable({ id: dropId })
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column?.name ?? '')
  const [color, setColor] = useState(column?.color ?? '#a3a3a3')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [colError, setColError] = useState(null)

  const cancelEdit = () => {
    setName(column.name)
    setColor(column.color)
    setEditing(false)
    setColError(null)
  }

  const saveColumn = async () => {
    if (!name.trim()) { setColError('El nombre no puede estar vacío'); return }
    try {
      await editColumn(column.id, { name: name.trim(), color })
      setEditing(false)
      setColError(null)
    } catch {
      setColError('No se pudo guardar. Inténtalo de nuevo.')
    }
  }

  const handleDelete = async () => {
    try {
      await removeColumn(column.id)
    } catch {
      setConfirmDelete(false)
      setColError('No se pudo eliminar la columna.')
    }
  }

  const headingId = `col-title-${dropId.replace(/[^a-z0-9-]/gi, '-')}`
  const iconBtn = 'w-10 h-10 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card-hover transition-colors shrink-0'

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={`group flex flex-col rounded-2xl border transition-colors duration-150
        ${isDragging ? 'opacity-40' : ''}
        ${isOver ? 'border-accent/60 bg-accent-soft' : 'border-transparent bg-surface'}`}
    >
      {/* Cabecera */}
      <div className="px-4 pt-3 pb-1">
        {editing ? (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                aria-label="Nombre de la columna"
                onChange={e => { setName(e.target.value); setColError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') saveColumn(); else if (e.key === 'Escape') { e.stopPropagation(); cancelEdit() } }}
                autoFocus
                className="field py-1.5 text-sm font-semibold"
              />
            </div>
            <ColorPicker label="Color" value={color} onChange={setColor} />
            {colError && <p role="alert" className="text-xs text-danger">{colError}</p>}
            <div className="flex gap-2">
              <button onClick={saveColumn} className="flex-1 h-10 md:h-9 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover transition-colors">Guardar</button>
              <button onClick={cancelEdit} className="flex-1 h-10 md:h-9 rounded-xl border border-line-strong text-ink-muted text-sm font-semibold hover:bg-card-hover transition-colors">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-10">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="hidden md:flex cursor-grab active:cursor-grabbing text-ink-subtle hover:text-ink transition-colors shrink-0 touch-none rounded"
                title="Arrastrar columna"
                aria-label={`Mover columna: ${title}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
              </div>
            )}
            {column
              ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: column.color }} aria-hidden="true" />
              : accent && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent}`} aria-hidden="true" />}
            <h3 id={headingId} className="flex-1 min-w-0 text-sm font-bold text-ink truncate">{title}</h3>
            <span className="text-xs font-semibold text-ink-subtle shrink-0" aria-label={`${tasks.length} tareas`}>{tasks.length}</span>

            {/* Acciones de una columna extra: en escritorio aparecen al pasar
                el ratón o al llegar con Tab (focus-within) */}
            {column && (
              <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                {confirmDelete ? (
                  <>
                    <button onClick={handleDelete} className="h-8 px-2 text-xs font-semibold bg-danger text-canvas rounded-lg">Sí, borrar</button>
                    <button onClick={() => setConfirmDelete(false)} className="h-8 px-2 text-xs font-semibold bg-card-hover text-ink rounded-lg">No</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setName(column.name); setColor(column.color); setEditing(true) }} className={iconBtn} title="Editar columna" aria-label={`Editar columna ${title}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => setConfirmDelete(true)} className={`${iconBtn} hover:text-danger hover:bg-danger/10`} title="Eliminar columna" aria-label={`Eliminar columna ${title} y sus tareas`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {colError && !editing && <p role="alert" className="text-xs text-danger pb-1">{colError}</p>}
      </div>

      {/* Tareas */}
      <div className="flex flex-col gap-2 p-3 pt-1">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 text-ink-muted hover:text-ink text-xs font-medium h-10 md:h-9 px-3 rounded-xl hover:bg-card-hover transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir tarea
        </button>
        {tasks.map(renderTask)}
        {tasks.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-ink-subtle border border-dashed border-line rounded-xl">
            {isOver ? 'Suelta aquí' : 'Sin tareas'}
          </p>
        )}
      </div>
    </section>
  )
}
