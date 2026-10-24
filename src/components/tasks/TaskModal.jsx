import { useState, useEffect, useRef } from 'react'
import { useTasks } from '../../context/TasksContext'
import ConfirmDialog from '../ui/ConfirmDialog'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Pill from '../ui/Pill'
import { tagTone } from '../../lib/taskStyles'
import DatePicker from '../ui/DatePicker'
import RecurrenceIcon from './RecurrenceIcon'
import { RECURRENCE_OPTIONS, recurrenceLabel } from '../../lib/recurrence'
import { BUCKETS, bucketOf, bucketDateRange, defaultDateFor } from '../../lib/taskBuckets'

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high',   label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

export default function TaskModal({ task, defaultColumnId, defaultTitle = '', defaultDueDate = '', onClose }) {
  const { pendingColumn, customColumns, today, addTask, editTask, removeTask } = useTasks()
  const isEditing = !!task
  const tagInputRef = useRef(null)
  const titleRef = useRef(null)
  const descRef = useRef(null)
  const notesRef = useRef(null)
  const DESC_MAX = 200

  const resizeDesc = (el) => {
    el.style.height = 'auto'
    const next = el.scrollHeight
    el.style.height = Math.min(next, DESC_MAX) + 'px'
    el.style.overflowY = next > DESC_MAX ? 'auto' : 'hidden'
  }

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
    if (descRef.current) resizeDesc(descRef.current)
    if (notesRef.current) resizeDesc(notesRef.current)
  }, [])

  const [form, setForm] = useState({
    title: task?.title || defaultTitle,
    description: task?.description || '',
    column_id: task?.column_id || defaultColumnId || pendingColumn?.id || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || defaultDueDate,
    tags: task?.tags || [],
    notes: task?.notes || '',
    recurrence: task?.recurrence || '',
    in_progress: task?.in_progress ?? false,
  })

  // "¿Cuándo?" se CALCULA con la fecha, igual que las columnas del tablero:
  // si cambias la fecha a mano, el selector la sigue solo, y elegir una
  // opción del selector rellena la fecha. Nunca pueden contradecirse.
  const inPending = !form.column_id || form.column_id === pendingColumn?.id
  const location = inPending ? `bucket:${bucketOf(form.due_date || null, today)}` : `col:${form.column_id}`
  const semanaRange = bucketDateRange('semana', today)

  const changeLocation = (value) => {
    const [type, id] = value.split(':')
    if (type === 'col') { setForm(f => ({ ...f, column_id: id })); return }
    setForm(f => {
      const range = bucketDateRange(id, today)
      // Si la fecha que ya tiene encaja en esa columna, se respeta
      const fits = f.due_date && range && f.due_date >= range.min && (!range.max || f.due_date <= range.max)
      // Próximamente no borra una fecha que ya había: propone el lunes que
      // viene (se puede cambiar o quitar con la ×). Sin fecha previa, sigue sin fecha.
      const fallback = id === 'proximamente' && f.due_date ? range.min : (defaultDateFor(id, today) ?? '')
      return { ...f, column_id: pendingColumn?.id ?? f.column_id, due_date: fits ? f.due_date : fallback }
    })
  }
  // Las copias generadas por una serie no pueden iniciar otra serie
  const isRecurringCopy = !!task?.recurrence_parent
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    // recurrence solo se envía si ha cambiado: así editar una tarea normal
    // no depende de que la columna exista en la base de datos
    const { recurrence, ...fields } = form
    // Sin columna elegida (proyecto recién cargado), va a "Pendientes"
    const rest = { ...fields, column_id: fields.column_id || pendingColumn?.id }
    const payload = recurrence !== (task?.recurrence || '') ? { ...rest, recurrence: recurrence || null } : rest
    try {
      if (isEditing) await editTask(task.id, payload)
      else await addTask(payload)
      onClose()
    } catch {
      setError('No se pudo guardar la tarea. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await removeTask(task.id)
      onClose()
    } catch {
      setError('No se pudo eliminar la tarea. Inténtalo de nuevo.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const addTag = (value) => {
    const tag = value.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    }
    setTagInput('')
  }

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    else if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) removeTag(form.tags[form.tags.length - 1])
  }

  const label = 'block text-xs font-medium text-ink-muted mb-1.5'

  return (
    <>
    {/* Modal común: Esc cierra, el foco queda dentro y vuelve al cerrar.
        En móvil es una hoja que sube desde abajo. */}
    <Modal
      title={isEditing ? 'Editar tarea' : 'Nueva tarea'}
      onClose={onClose}
      initialFocusRef={titleRef}
      closeOnBackdrop={false}
      footer={
        <div className="w-full flex flex-col gap-2">
          {error && <p role="alert" className="text-xs text-danger text-center">{error}</p>}
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="flex-1">
              {saving ? 'Guardando…' : isEditing ? 'Guardar' : 'Crear tarea'}
            </Button>
          </div>
        </div>
      }
    >
        <div className="space-y-4">
          {/* Title */}
          <textarea
            ref={titleRef}
            aria-label="Título de la tarea"
            placeholder="Título de la tarea"
            value={form.title}
            onChange={e => {
              setForm({ ...form, title: e.target.value })
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            required
            rows={1}
            className="w-full text-lg font-semibold text-ink placeholder:text-ink-subtle bg-transparent border-0 outline-none p-0 resize-none overflow-hidden leading-snug"
          />

          {/* Description */}
          <textarea
            ref={descRef}
            aria-label="Descripción"
            placeholder="Añade una descripción…"
            value={form.description}
            onChange={e => { setForm({ ...form, description: e.target.value }); resizeDesc(e.target) }}
            rows={3}
            className="field resize-none overflow-hidden"
          />

          {/* Column + Priority — stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-location" className={label}>¿Cuándo?</label>
              <select id="task-location" value={location} onChange={e => changeLocation(e.target.value)} className="field">
                <optgroup label="Por fecha" disabled={!pendingColumn}>
                  {BUCKETS.map(b => (
                    <option key={b.id} value={`bucket:${b.id}`} disabled={b.id === 'semana' && !semanaRange && location !== 'bucket:semana'}>
                      {b.label}
                    </option>
                  ))}
                </optgroup>
                {customColumns.length > 0 && (
                  <optgroup label="Tus columnas">
                    {customColumns.map(col => (
                      <option key={col.id} value={`col:${col.id}`}>{col.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className={label}>Prioridad</label>
              <select id="task-priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="field">
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + repetición */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={label}>{form.recurrence ? 'Primera fecha' : 'Fecha límite'}</span>
              <DatePicker
                value={form.due_date}
                onChange={val => setForm({ ...form, due_date: val })}
                placeholder={form.recurrence ? 'Hoy' : 'Sin fecha límite'}
                className="w-full"
              />
            </div>
            {!isRecurringCopy && (
              <div>
                <label htmlFor="task-recurrence" className={label}>Repetir</label>
                <select id="task-recurrence" value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} className="field">
                  {RECURRENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {form.recurrence && !isRecurringCopy && (
            <p className="flex items-start gap-1.5 -mt-2 text-xs text-ink-muted">
              <RecurrenceIcon className="w-3.5 h-3.5 mt-px shrink-0 text-accent" />
              <span>
                Se repite: {recurrenceLabel(form.recurrence).toLowerCase()}. En cada fecha aparecerá una copia en su columna de fecha (Hoy, Mañana…), aunque no hayas completado la anterior.
              </span>
            </p>
          )}
          {isRecurringCopy && (
            <p className="flex items-center gap-1.5 -mt-2 text-xs text-ink-muted">
              <RecurrenceIcon className="w-3.5 h-3.5 shrink-0 text-accent" />
              Copia creada por una tarea que se repite.
            </p>
          )}

          {/* En curso: interruptor (role="switch": el lector dice "activado") */}
          <button
            type="button"
            role="switch"
            aria-checked={form.in_progress}
            aria-labelledby="task-progress-label"
            aria-describedby="task-progress-hint"
            onClick={() => setForm(f => ({ ...f, in_progress: !f.in_progress }))}
            className="w-full flex items-center justify-between gap-3 px-4 h-12 rounded-xl border border-line-strong hover:bg-card-hover transition-colors"
          >
            <span className="text-left">
              <span id="task-progress-label" className="block text-sm font-medium text-ink">En curso</span>
              <span id="task-progress-hint" className="block text-xs text-ink-muted">Ya la has empezado</span>
            </span>
            <span className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${form.in_progress ? 'bg-accent' : 'bg-line-strong'}`} aria-hidden="true">
              <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${form.in_progress ? 'left-5 bg-accent-ink' : 'left-1 bg-ink'}`} />
            </span>
          </button>

          {/* Tags */}
          <div>
            <label htmlFor="task-tag-input" className={label}>Etiquetas</label>
            <div
              className="field flex flex-wrap items-center gap-1.5 min-h-12 cursor-text focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]"
              onClick={() => tagInputRef.current?.focus()}
            >
              {form.tags.map(tag => (
                <Pill key={tag} tone={tagTone(tag)}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} aria-label={`Quitar etiqueta ${tag}`} className="-mr-1 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10">×</button>
                </Pill>
              ))}
              <input
                id="task-tag-input"
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={form.tags.length === 0 ? 'Escribe y pulsa Enter…' : ''}
                className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-ink placeholder:text-ink-subtle"
              />
            </div>
          </div>
          {/* Notes */}
          <div>
            <label htmlFor="task-notes" className={label}>Notas</label>
            <textarea
              id="task-notes"
              ref={notesRef}
              placeholder="Escribe un comentario o nota…"
              value={form.notes}
              onChange={e => { setForm({ ...form, notes: e.target.value }); resizeDesc(e.target) }}
              rows={2}
              className="field resize-none overflow-hidden"
            />
          </div>
        </div>
    </Modal>

    {confirmDelete && (
      <ConfirmDialog
        title="Eliminar tarea"
        message={`¿Eliminar "${form.title}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
  </>
  )
}
