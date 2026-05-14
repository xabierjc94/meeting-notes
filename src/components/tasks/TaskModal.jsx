import { useState, useEffect, useRef } from 'react'
import { useTasks } from '../../context/TasksContext'
import ConfirmDialog from '../ui/ConfirmDialog'
import DatePicker from '../ui/DatePicker'

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Baja',    color: 'text-emerald-600 bg-emerald-50' },
  { value: 'medium', label: 'Media',   color: 'text-amber-600 bg-amber-50' },
  { value: 'high',   label: 'Alta',    color: 'text-orange-600 bg-orange-50' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600 bg-red-50' },
]

export default function TaskModal({ task, defaultColumnId, onClose }) {
  const { columns, addTask, editTask, removeTask } = useTasks()
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
    title: task?.title || '',
    description: task?.description || '',
    column_id: task?.column_id || defaultColumnId || columns[0]?.id || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    tags: task?.tags || [],
    notes: task?.notes || '',
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!form.column_id && columns.length > 0) {
      setForm(f => ({ ...f, column_id: columns[0].id }))
    }
  }, [columns])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (isEditing) await editTask(task.id, form)
      else await addTask(form)
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

  return (
    <>
    {/* Bottom sheet on mobile, centered modal on desktop */}
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col">

        {/* Handle bar (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-800">{isEditing ? 'Editar tarea' : 'Nueva tarea'}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <textarea
            ref={titleRef}
            placeholder="Título de la tarea"
            value={form.title}
            onChange={e => {
              setForm({ ...form, title: e.target.value })
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            autoFocus
            required
            rows={1}
            className="w-full text-lg font-semibold text-slate-800 placeholder-slate-300 border-0 outline-none focus:ring-0 p-0 resize-none overflow-hidden leading-snug"
          />

          {/* Description */}
          <textarea
            ref={descRef}
            placeholder="Añade una descripción..."
            value={form.description}
            onChange={e => { setForm({ ...form, description: e.target.value }); resizeDesc(e.target) }}
            rows={3}
            className="w-full text-sm text-slate-600 placeholder-slate-300 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all overflow-hidden"
          />

          {/* Column + Priority — stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Columna</label>
              <select
                value={form.column_id}
                onChange={e => setForm({ ...form, column_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Prioridad</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Fecha límite</label>
            <DatePicker
              value={form.due_date}
              onChange={val => setForm({ ...form, due_date: val })}
              placeholder="Sin fecha límite"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Etiquetas</label>
            <div
              className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-xl cursor-text min-h-[48px] focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-400 transition-all"
              onClick={() => tagInputRef.current?.focus()}
            >
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-lg">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="w-4 h-4 flex items-center justify-center text-violet-400 hover:text-violet-700 transition-colors">×</button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={form.tags.length === 0 ? 'Escribe y pulsa Enter...' : ''}
                className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-slate-700 placeholder-slate-300"
              />
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notas</label>
            <textarea
              ref={notesRef}
              placeholder="Escribe un comentario o nota..."
              value={form.notes}
              onChange={e => { setForm({ ...form, notes: e.target.value }); resizeDesc(e.target) }}
              rows={2}
              className="w-full text-sm text-slate-600 placeholder-slate-300 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all overflow-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-5 py-4 border-t border-slate-100 shrink-0 pb-safe">
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className="px-4 py-3.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-60"
              >
                {deleting ? '...' : 'Eliminar'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.title.trim()}
              className="flex-1 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear tarea'}
            </button>
          </div>
        </div>
      </div>
    </div>

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
