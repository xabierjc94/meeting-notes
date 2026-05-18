const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-l-emerald-400', glow: '#10b981' },
  medium: { label: 'Media',   dot: 'bg-amber-400',   text: 'text-amber-400',   border: 'border-l-amber-400',   glow: '#f59e0b' },
  high:   { label: 'Alta',    dot: 'bg-orange-400',  text: 'text-orange-400',  border: 'border-l-orange-400',  glow: '#f97316' },
  urgent: { label: 'Urgente', dot: 'bg-red-400',     text: 'text-red-400',     border: 'border-l-red-400',     glow: '#ef4444' },
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

function GripHandle({ dragHandleProps }) {
  return (
    <div
      {...dragHandleProps}
      className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
      title="Arrastrar"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="9"  cy="5"  r="1.5"/><circle cx="15" cy="5"  r="1.5"/>
        <circle cx="9"  cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
        <circle cx="9"  cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
      </svg>
    </div>
  )
}

export default function TaskCard({ task, onClick, onDelete, overlay, compact = false, stretch = false, dragHandleProps = null }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const overdue = isOverdue(task.due_date)
  const dueSoon = isDueSoon(task.due_date)

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`${stretch ? 'h-full' : ''} group/card flex flex-col justify-center gap-1 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg border-l-[3px] cursor-pointer select-none transition-all duration-150 ${priority.border} border border-white/0 hover:border-white/60 hover:shadow-md active:scale-[0.98] relative`}
      >
        <div className="flex items-center gap-2">
          {dragHandleProps && <GripHandle dragHandleProps={dragHandleProps} />}
          <div className={`w-2 h-2 rounded-full shrink-0 ${priority.dot}`} style={{ boxShadow: `0 0 5px ${priority.glow}` }} />
          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${priority.text}`}>{priority.label}</span>
          {task.due_date && (
            <span className={`ml-auto text-[10px] font-medium shrink-0 ${overdue ? 'text-red-500' : dueSoon ? 'text-orange-500' : 'text-slate-400'}`}>
              {overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
            </span>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="ml-auto shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar tarea"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{task.title}</p>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`group/card relative bg-white/90 backdrop-blur-sm rounded-xl border-l-[3px] cursor-pointer select-none
        transition-all duration-200
        ${priority.border}
        ${overlay
          ? 'rotate-2 shadow-2xl shadow-black/40 scale-105 border border-white/50'
          : 'border border-white/0 hover:border-white/60 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98] active:shadow-sm'
        }`}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-2 mb-2">
          <div className={`flex items-center gap-1 shrink-0 mt-0.5`}>
            <div className={`w-2 h-2 rounded-full ${priority.dot}`} style={{ boxShadow: `0 0 6px ${priority.glow}` }} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${priority.text}`}>{priority.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Eliminar tarea"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            {dragHandleProps && <GripHandle dragHandleProps={dragHandleProps} />}
          </div>
        </div>

        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mb-2">
          {task.title}
        </p>

        {task.description && (
          <p className="text-xs text-slate-400 mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] rounded-md font-semibold border border-violet-100">
                #{tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] rounded-md border border-slate-100">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {task.due_date && (
          <div className={`flex items-center gap-1 text-[11px] font-semibold ${overdue ? 'text-red-500' : dueSoon ? 'text-orange-500' : 'text-slate-400'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {overdue ? '⚠ Vencida · ' : ''}{formatDate(task.due_date)}
          </div>
        )}
      </div>
    </div>
  )
}
