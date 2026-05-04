const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    class: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Media',   class: 'bg-amber-100 text-amber-700' },
  high:   { label: 'Alta',    class: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', class: 'bg-red-100 text-red-700' },
}

function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}

function isDueSoon(date) {
  if (!date) return false
  const diff = new Date(date) - new Date(new Date().toDateString())
  return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function TaskCard({ task, onClick, overlay }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const overdue = isOverdue(task.due_date)
  const dueSoon = isDueSoon(task.due_date)

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border shadow-sm p-3.5 cursor-pointer group transition-all duration-200
        ${overlay ? 'rotate-2 shadow-xl border-violet-200 scale-105' : 'border-slate-200/80 hover:border-violet-300 hover:shadow-md'}`}
    >
      {/* Priority + title */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-xs font-semibold ${priority.class}`}>
          {priority.label}
        </span>
        <p className="text-sm font-semibold text-slate-700 leading-snug group-hover:text-violet-700 transition-colors line-clamp-2">
          {task.title}
        </p>
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-slate-400 mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-violet-50 text-violet-600 text-xs rounded-md font-medium">
              #{tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-xs rounded-md">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-500' : dueSoon ? 'text-orange-500' : 'text-slate-400'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {overdue ? 'Vencida · ' : ''}{formatDate(task.due_date)}
        </div>
      )}
    </div>
  )
}
