import { useState } from 'react'
import RecurrenceIcon from './RecurrenceIcon'
import Pill from '../ui/Pill'
import { recurrenceLabel } from '../../lib/recurrence'
import { priorityOf, tagTone } from '../../lib/taskStyles'
import { diffDays, formatShort, parseISODate, today } from '../../lib/dates'

// Vencida / vence pronto. Con lib/dates: "2026-10-20" es un día de
// calendario; new Date("2026-10-20") lo interpretaría como medianoche UTC.
function dueInfo(due) {
  const date = parseISODate(due)
  if (!date) return null
  const days = diffDays(today(), date)
  return { label: formatShort(date), overdue: days < 0, soon: days >= 0 && days <= 2 }
}

// Asa de arrastre. Recibe de dnd-kit role="button" y tabIndex (Tab para
// llegar, Espacio para coger/soltar, flechas para mover)
function GripHandle({ dragHandleProps, label }) {
  return (
    <div
      {...dragHandleProps}
      aria-label={label}
      className="relative z-10 shrink-0 flex items-center justify-center w-6 h-6 rounded-md cursor-grab active:cursor-grabbing text-ink-subtle hover:text-ink hover:bg-card-hover transition-colors"
      title="Arrastrar"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
      </svg>
    </div>
  )
}

function DeleteControl({ task, confirming, setConfirming, onDelete }) {
  if (confirming) {
    return (
      <div className="relative z-10 flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => onDelete()} className="h-6 px-2 text-[11px] font-semibold bg-danger text-canvas rounded-md">Sí</button>
        <button onClick={() => setConfirming(false)} className="h-6 px-2 text-[11px] font-semibold bg-card-hover text-ink rounded-md">No</button>
      </div>
    )
  }
  return (
    <button
      onClick={e => { e.stopPropagation(); setConfirming(true) }}
      className="relative z-10 w-6 h-6 flex items-center justify-center rounded-md text-ink-subtle hover:text-danger hover:bg-danger/10 transition-colors"
      title="Eliminar tarea"
      aria-label={`Eliminar tarea: ${task.title}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}

const CalendarIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

// ─────────────────────────────────────────────────────────────
// Tarjeta de tarea al estilo del diseño de referencia: título arriba,
// prioridad y etiquetas como pills pastel, y una fila inferior con la
// fecha. Se conservan las piezas de accesibilidad de los lotes 2-4:
// título como botón que cubre la tarjeta (.stretched-link), asa de
// arrastre enfocable, parpadeo de urgentes y el icono de recurrente.
// ─────────────────────────────────────────────────────────────
export default function TaskCard({ task, onClick, onDelete, overlay, compact = false, stretch = false, done = false, dragHandleProps = null }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const priority = priorityOf(task)
  const due = dueInfo(task.due_date)
  // Una urgente ya terminada (done) no debe alarmar
  const urgentBlink = task.priority === 'urgent' && !done && !overlay
  const gripLabel = `Mover tarea: ${task.title}`

  // El título es un botón real que cubre toda la tarjeta (.stretched-link):
  // se abre con clic o con Tab + Enter. En la copia que se arrastra no hay botón.
  // (line-clamp va en un <span>: aplicado al propio <button> no es fiable)
  const titleClass = `text-sm font-semibold leading-snug ${done ? 'text-ink-muted line-through' : 'text-ink'}`
  const title = onClick ? (
    <p className={titleClass}>
      <button type="button" onClick={onClick} className="stretched-link block w-full text-left cursor-pointer">
        <span className="line-clamp-2">{task.title}</span>
      </button>
    </p>
  ) : (
    <p className={titleClass}><span className="line-clamp-2">{task.title}</span></p>
  )

  const dueBadge = due && (
    <span className={`flex items-center gap-1 text-[11px] font-medium ${done ? 'text-ink-subtle' : due.overdue ? 'text-danger' : due.soon ? 'text-pill-orange' : 'text-ink-subtle'}`}>
      <CalendarIcon />
      {due.overdue && !done ? 'Vencida · ' : ''}{due.label}
    </span>
  )

  const shell = `group/card relative bg-card rounded-xl border select-none transition-colors
    ${overlay ? 'border-accent/60 shadow-2xl shadow-black/50 rotate-1' : 'border-line hover:border-line-strong hover:bg-card-hover'}
    ${urgentBlink ? 'animate-urgent' : ''}`

  if (compact) {
    return (
      <div className={`${stretch ? 'h-full' : ''} ${shell} flex flex-col justify-center gap-1.5 px-3 py-2`}>
        <div className="flex items-center gap-2">
          {dragHandleProps && <GripHandle dragHandleProps={dragHandleProps} label={gripLabel} />}
          <Pill tone={priority.tone}>{priority.label}</Pill>
          {task.recurrence && (
            <span className="shrink-0 text-accent" title={`Se repite: ${recurrenceLabel(task.recurrence)}`}><RecurrenceIcon /></span>
          )}
          <span className="ml-auto">{dueBadge}</span>
          {onDelete && <DeleteControl task={task} confirming={confirmingDelete} setConfirming={setConfirmingDelete} onDelete={onDelete} />}
        </div>
        {title}
      </div>
    )
  }

  return (
    <div className={`${shell} p-3.5`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">{title}</div>
        <div className="relative z-10 flex items-center gap-0.5 -mt-0.5 -mr-1" onClick={e => e.stopPropagation()}>
          {onDelete && <DeleteControl task={task} confirming={confirmingDelete} setConfirming={setConfirmingDelete} onDelete={onDelete} />}
          {dragHandleProps && <GripHandle dragHandleProps={dragHandleProps} label={gripLabel} />}
        </div>
      </div>

      {task.description && (
        <p className="mt-1.5 text-xs text-ink-muted line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <Pill tone={priority.tone}>{priority.label}</Pill>
        {task.tags?.slice(0, 3).map(tag => <Pill key={tag} tone={tagTone(tag)}>{tag}</Pill>)}
        {task.tags?.length > 3 && <Pill tone="neutral">+{task.tags.length - 3}</Pill>}
      </div>

      {(due || task.recurrence) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-line">
          {dueBadge}
          {task.recurrence && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
              <RecurrenceIcon />
              {recurrenceLabel(task.recurrence)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
