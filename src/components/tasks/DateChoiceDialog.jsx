import { useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import DatePicker from '../ui/DatePicker'
import { bucketDateRange, bucketLabel, shiftISO } from '../../lib/taskBuckets'
import { parseISODate } from '../../lib/dates'

const DAY_FMT = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' })
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// ─────────────────────────────────────────────────────────────
// Elegir la fecha al mover una tarea a "Esta semana" o "Próximamente".
//   - Esta semana: como mucho 5 días (de pasado mañana al domingo), así
//     que se muestran como botones: un clic y listo.
//   - Próximamente: "Sin fecha" o un día desde el lunes siguiente con el
//     calendario (que no deja elegir días anteriores).
// La tarea no se mueve hasta pulsar "Mover": Cancelar la deja donde estaba.
// ─────────────────────────────────────────────────────────────
export default function DateChoiceDialog({ task, bucketId, today, onConfirm, onClose }) {
  const range = bucketDateRange(bucketId, today)
  const fits = (d) => d && range && d >= range.min && (!range.max || d <= range.max)
  // Si la fecha actual ya encaja en la columna, se propone esa
  const [date, setDate] = useState(fits(task.due_date) ? task.due_date : bucketId === 'semana' ? range?.max ?? '' : '')
  const [saving, setSaving] = useState(false)
  const firstRef = useRef(null)

  const days = []
  if (bucketId === 'semana' && range) {
    for (let d = range.min; d <= range.max; d = shiftISO(d, 1)) days.push(d)
  }

  const confirm = async () => {
    setSaving(true)
    try { await onConfirm(date || null) } finally { setSaving(false) }
  }

  return (
    <Modal
      title={`Mover a ${bucketLabel(bucketId)}`}
      size="sm"
      onClose={onClose}
      initialFocusRef={firstRef}
      footer={
        <>
          <Button onClick={confirm} disabled={saving || (bucketId === 'semana' && !date)} className="flex-1">
            {saving ? 'Moviendo…' : 'Mover'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
        </>
      }
    >
      <p className="text-sm text-ink-muted mb-4">
        ¿Para qué día es <span className="text-ink font-medium">{task.title}</span>?
      </p>

      {bucketId === 'semana' ? (
        <div role="radiogroup" aria-label="Día de esta semana" className="grid gap-2">
          {days.map((d, i) => {
            const selected = d === date
            return (
              <button
                key={d}
                ref={i === 0 ? firstRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDate(d)}
                className={`h-11 px-4 rounded-xl border text-sm font-medium text-left transition-colors ${
                  selected ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-ink hover:bg-card-hover'
                }`}
              >
                {capitalize(DAY_FMT.format(parseISODate(d)))}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            ref={firstRef}
            type="button"
            aria-pressed={!date}
            onClick={() => setDate('')}
            className={`h-11 px-4 rounded-xl border text-sm font-medium text-left transition-colors ${
              !date ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong text-ink hover:bg-card-hover'
            }`}
          >
            Sin fecha
          </button>
          <div>
            <span className="block text-xs font-medium text-ink-muted mb-1.5">O un día concreto (desde el lunes que viene)</span>
            <DatePicker value={date} onChange={setDate} min={range?.min} placeholder="Elegir día" className="w-full" />
          </div>
        </div>
      )}
    </Modal>
  )
}
