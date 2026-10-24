// ─────────────────────────────────────────────────────────────
// CONCEPTO: columnas calculadas ("buckets")
//
// Hoy, Mañana, Esta semana y Próximamente NO se guardan en la base de
// datos: se calculan cada vez a partir de la fecha límite (due_date) y
// del día de hoy. Igual que un calendario decide en qué casilla va cada
// día. Por eso una tarea "pasa sola" de Mañana a Hoy al cambiar el día.
//
// Todas las fechas son textos 'AAAA-MM-DD'. Este formato se puede comparar
// como texto: '2026-10-24' < '2026-10-25' funciona igual que con fechas,
// porque año, mes y día van de mayor a menor peso y con ceros a la izquierda.
//
// Funciones puras (sin React ni Supabase): se pueden probar con Node
// (docs/plans/probar-buckets.mjs).
// ─────────────────────────────────────────────────────────────
import { parseISODate, toISODate, addDays, endOfWeek } from './dates.js'

export const BUCKETS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'proximamente', label: 'Próximamente' },
]

export const bucketLabel = (id) => BUCKETS.find(b => b.id === id)?.label ?? ''

// Suma días a una fecha 'AAAA-MM-DD' y devuelve otra 'AAAA-MM-DD'
export const shiftISO = (iso, n) => toISODate(addDays(parseISODate(iso), n))

// Domingo de la semana de `iso` (la semana empieza en lunes)
export const sundayOf = (iso) => toISODate(endOfWeek(parseISODate(iso)))

// ¿En qué columna cae una tarea pendiente?
//   dueDate:  'AAAA-MM-DD' o null (sin fecha)
//   todayStr: 'AAAA-MM-DD' (hoy, en hora local)
// Devuelve 'hoy' | 'manana' | 'semana' | 'proximamente'
export function bucketOf(dueDate, todayStr) {
  const tomorrow = shiftISO(todayStr, 1)
  const sunday = sundayOf(todayStr)
  if (!dueDate) return 'proximamente'          // sin fecha
  if (dueDate <= todayStr) return 'hoy'        // hoy y atrasadas
  if (dueDate === tomorrow) return 'manana'    // antes que "semana": en domingo, mañana ya es otra semana
  if (dueDate <= sunday) return 'semana'       // de pasado mañana al domingo
  return 'proximamente'
}

// Días que se pueden elegir al mover una tarea a esa columna (para el
// calendario). null = la columna no admite fechas ese día (p. ej. "Esta
// semana" en sábado o domingo, cuando ya no quedan días después de mañana).
export function bucketDateRange(bucketId, todayStr) {
  const tomorrow = shiftISO(todayStr, 1)
  const sunday = sundayOf(todayStr)
  switch (bucketId) {
    case 'hoy': return { min: todayStr, max: todayStr, allowEmpty: false }
    case 'manana': return { min: tomorrow, max: tomorrow, allowEmpty: false }
    case 'semana': {
      const min = shiftISO(todayStr, 2)
      return min <= sunday ? { min, max: sunday, allowEmpty: false } : null
    }
    case 'proximamente': {
      // Desde el lunes siguiente; si mañana ya es ese lunes (hoy es domingo),
      // ese día es "Mañana", así que empieza el martes
      const nextMonday = shiftISO(sunday, 1)
      const min = nextMonday > tomorrow ? nextMonday : shiftISO(tomorrow, 1)
      return { min, max: null, allowEmpty: true }
    }
    default: return null
  }
}

// Fecha que recibe una tarea creada desde una columna ("Añadir tarea")
export function defaultDateFor(bucketId, todayStr) {
  switch (bucketId) {
    case 'hoy': return todayStr
    case 'manana': return shiftISO(todayStr, 1)
    case 'semana': return bucketDateRange('semana', todayStr)?.max ?? null
    default: return null
  }
}

// Orden dentro de una columna: fecha límite (sin fecha al final), luego
// de la más antigua a la más reciente
export function compareTasks(a, b) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return (a.created_at || '').localeCompare(b.created_at || '') || String(a.id).localeCompare(String(b.id))
}

export const isDone = (task) => task.completed_at != null

// Atrasada: pendiente y con fecha anterior a hoy
export const isOverdue = (task, todayStr) => !isDone(task) && !!task.due_date && task.due_date < todayStr
