import { useState, useEffect, useRef } from 'react'
import { useTasks } from '../../context/TasksContext'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'medium', label: 'Media', color: 'text-amber-600 bg-amber-50' },
  { value: 'high', label: 'Alta', color: 'text-orange-600 bg-orange-50' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600 bg-red-50' },
]

export default function TaskModal({ task, defaultColumnId, onClose }) {
  const { columns, addTask, editTask, removeTask } = useTasks()
  const isEditing = !!task
  const tagInputRef = useRef(null)

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    column_id: task?.column_id || defaultColumnId || columns[0]?.id || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    tags: task?.tags || [],
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!form.column_id && columns.length > 0) {
      setForm(f => ({ ...f, column_id: columns[0].id }))
    }
  }, [columns])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (isEditing) {
        await editTask(task.id, form)
      } else {
        await addTask(form)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    setDeleting(true)
    try {
      await removeTask(task.id)
      onClose()
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

  const removeTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-800">{isEditing ? 'Editar tarea' : 'Nueva tarea'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="Título de la tarea"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              autoFocus
              required
              className="w-full text-lg font-semibold text-slate-800 placeholder-slate-300 border-0 outline-none focus:ring-0 p-0"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              placeholder="Añade una descripción..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full text-sm text-slate-600 placeholder-slate-300 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Column + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Columna</label>
              <select
                value={form.column_id}
                onChange={e => setForm({ ...form, column_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
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
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Etiquetas</label>
            <div
              className="flex flex-wrap gap-1.5 p-2.5 border border-slate-200 rounded-xl cursor-text min-h-[44px] focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-400 transition-all"
              onClick={() => tagInputRef.current?.focus()}
            >
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-lg">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-violet-400 hover:text-violet-700 transition-colors">×</button>
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
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim()}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-500/20 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}
