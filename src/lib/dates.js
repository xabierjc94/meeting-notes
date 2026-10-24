// ─────────────────────────────────────────────────────────────
// Utilidades de fechas para Calendario y Timeline (sin librerías).
//
// CONCEPTO: fechas "de calendario" vs instantes
// Una tarea vence "el 20 de octubre", no "el 20 a las 00:00 UTC".
// Por eso trabajamos con fechas LOCALES a mediodía: si construyéramos
// los días a medianoche, el cambio de hora (octubre/marzo) puede restar
// una hora y hacer que "sumar un día" caiga en el mismo día.
// Y las convertimos a texto 'AAAA-MM-DD' (como guarda Supabase la
// columna due_date) con los componentes locales, nunca con toISOString(),
// que pasaría a UTC y podría restar un día.
// ─────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0')

// 'AAAA-MM-DD' → Date local a mediodía
export function parseISODate(str) {
  if (!str) return null
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

// Timestamp (p. ej. created_at '2026-10-20T23:30:00+00:00') → día LOCAL a
// mediodía. A diferencia de parseISODate, aquí sí importa la zona horaria:
// las 23:30 UTC ya son el día 21 en Madrid.
export function dayFromTimestamp(ts) {
  if (!ts) return null
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
}

// Date → 'AAAA-MM-DD' (componentes locales)
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Día de hoy, normalizado a mediodía local
export function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, 12)
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1, 12)
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Lunes de la semana de `date` (en España la semana empieza en lunes)
export function startOfWeek(date) {
  const offset = (date.getDay() + 6) % 7 // lunes = 0 … domingo = 6
  return addDays(date, -offset)
}

// Domingo de la semana de `date` (último día de una semana que empieza en lunes)
export function endOfWeek(date) {
  return addDays(startOfWeek(date), 6)
}

// Hoy como texto 'AAAA-MM-DD' en hora LOCAL (nunca toISOString: a las
// 00:30 en España daría todavía el día anterior, que es la fecha en UTC)
export function todayISO() {
  return toISODate(today())
}

// Días enteros entre dos fechas (b - a), inmune al cambio de hora
export function diffDays(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / 86400000)
}

export function eachDay(start, count) {
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

// Cuadrícula de un mes para el calendario: 6 semanas × 7 días (42 días),
// empezando en el lunes anterior (o igual) al día 1. Siempre 6 filas para
// que el calendario no cambie de altura al pasar de mes.
export function monthGrid(year, month) {
  return eachDay(startOfWeek(new Date(year, month, 1, 12)), 42)
}

const MONTH_FMT = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
const DAY_FMT = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const SHORT_FMT = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatMonth = (date) => capitalize(MONTH_FMT.format(date))   // "Octubre de 2026"
export const formatLongDay = (date) => capitalize(DAY_FMT.format(date))  // "Martes, 20 de octubre"
export const formatShort = (date) => SHORT_FMT.format(date)               // "20 oct"

// Cabecera de días de la semana, empezando en lunes
export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
