import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(str) {
  const d = parseDate(str)
  if (!d) return null
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha', className = '' }) {
  const today = new Date()
  const selected = parseDate(value)
  const initial = selected || today

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
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
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
      if (selected) { setYear(selected.getFullYear()); setMonth(selected.getMonth()) }
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

  const handleDay = (day) => {
    if (!day) return
    onChange(toYMD(new Date(year, month, day)))
    setOpen(false)
  }

  const isToday = (day) =>
    day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const isSelected = (day) =>
    day && selected &&
    selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          value
            ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500'
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
            className="ml-0.5 text-violet-400 hover:text-violet-700 transition-colors leading-none"
          >
            ×
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, width: popupPos.width, zIndex: 9999 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4"
        >
          {/* Month/year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-800">{MONTHS[month]} {year}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleDay(day)}
                disabled={!day}
                className={`h-8 w-full rounded-lg text-sm font-medium transition-all ${
                  !day
                    ? 'cursor-default'
                    : isSelected(day)
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30 hover:bg-violet-500'
                    : isToday(day)
                    ? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {day ?? ''}
              </button>
            ))}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { onChange(toYMD(today)); setOpen(false) }}
              className="w-full text-xs font-medium text-violet-600 hover:text-violet-700 py-1 rounded-lg hover:bg-violet-50 transition-colors"
            >
              Hoy — {today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
