import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { parseISODate as parseDate, toISODate as toYMD } from '../../lib/dates'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function formatDisplay(str) {
  const d = parseDate(str)
  if (!d) return null
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// min / max ('AAAA-MM-DD', opcionales): los días fuera de ese rango se ven
// apagados y no se pueden elegir (p. ej. "Esta semana" solo admite de
// pasado mañana al domingo). clearLabel añade un botón para quitar la fecha.
export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', className = '', min = null, max = null, clearLabel = null }) {
  const today = new Date()
  const selected = parseDate(value)
  // Sin fecha elegida, se abre en el mes del primer día permitido
  const initial = selected || (min && toYMD(today) < min ? parseDate(min) : today)

  const [open, setOpen] = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth())
  const btnRef = useRef(null)
  const popupRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Captura (true) + stopPropagation: este Esc llega ANTES que el del modal
    // que contiene el selector, y solo cierra el calendario desplegable
    function handleKey(e) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [open])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const maxWidth = Math.min(288, window.innerWidth - 16)
      let left = r.left
      if (left + maxWidth > window.innerWidth - 8) left = window.innerWidth - maxWidth - 8
      if (left < 8) left = 8
      const top = r.bottom + 6
      setPopupPos({ top, left, width: maxWidth })
      setYear(initial.getFullYear()); setMonth(initial.getMonth())
    }
    setOpen(o => !o)
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Los textos 'AAAA-MM-DD' se comparan como texto (mismo orden que las fechas)
  const inRange = (ymd) => (!min || ymd >= min) && (!max || ymd <= max)
  const dayYMD = (day) => toYMD(new Date(year, month, day, 12))
  const isDisabled = (day) => !day || !inRange(dayYMD(day))
  const todayAllowed = inRange(toYMD(today))

  const handleDay = (day) => {
    if (isDisabled(day)) return
    onChange(dayYMD(day))
    setOpen(false)
  }

  const isToday = (day) =>
    day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const isSelected = (day) =>
    day && selected &&
    selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day

  return (
    <div className={`relative block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          value
            ? 'border-accent/50 bg-accent-soft text-accent hover:bg-accent-soft'
            : 'border-line bg-card text-ink-muted hover:border-line-strong hover:text-ink'
        }`}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="ml-0.5 text-accent hover:text-accent transition-colors leading-none"
          >
            ×
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, width: popupPos.width, zIndex: 9999 }}
          className="bg-card rounded-2xl shadow-2xl border border-line p-4"
        >
          {/* Month/year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card-hover transition-colors text-ink-muted"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-ink">{MONTHS[month]} {year}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-card-hover transition-colors text-ink-muted"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-ink-muted py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleDay(day)}
                disabled={isDisabled(day)}
                className={`h-8 w-full rounded-lg text-sm font-medium transition-all ${
                  !day
                    ? 'cursor-default'
                    : isDisabled(day)
                    ? 'text-ink-subtle/50 line-through cursor-not-allowed'
                    : isSelected(day)
                    ? 'bg-accent text-accent-ink hover:bg-accent-hover'
                    : isToday(day)
                    ? 'bg-accent-soft text-accent hover:bg-accent-soft'
                    : 'text-ink hover:bg-card-hover'
                }`}
              >
                {day ?? ''}
              </button>
            ))}
          </div>

          {/* Atajos: Hoy (si el rango lo permite) y quitar la fecha */}
          {(todayAllowed || clearLabel) && (
            <div className="mt-3 pt-3 border-t border-line flex gap-2">
              {todayAllowed && (
                <button
                  type="button"
                  onClick={() => { onChange(toYMD(today)); setOpen(false) }}
                  className="flex-1 text-xs font-medium text-accent hover:text-accent py-1 rounded-lg hover:bg-accent-soft transition-colors"
                >
                  Hoy — {today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </button>
              )}
              {clearLabel && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false) }}
                  className="flex-1 text-xs font-medium text-ink-muted hover:text-ink py-1 rounded-lg hover:bg-card-hover transition-colors"
                >
                  {clearLabel}
                </button>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
