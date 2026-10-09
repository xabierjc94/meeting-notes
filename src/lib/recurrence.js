// Reglas de repetición de tareas. Los valores coinciden con el CHECK de
// la columna tasks.recurrence (ver recurring-tasks-migration.sql).
export const RECURRENCE_OPTIONS = [
  { value: '',         label: 'No se repite' },
  { value: 'daily',    label: 'Cada día' },
  { value: 'weekdays', label: 'Días laborables (L-V)' },
  { value: 'weekly',   label: 'Cada semana' },
  { value: 'monthly',  label: 'Cada mes' },
  { value: 'yearly',   label: 'Cada año' },
]

export function recurrenceLabel(value) {
  return RECURRENCE_OPTIONS.find(o => o.value === value)?.label ?? null
}
