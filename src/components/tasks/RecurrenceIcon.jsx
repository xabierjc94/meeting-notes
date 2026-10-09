// Flechas en círculo: indica que la tarea se repite (o es copia de una que se repite)
export default function RecurrenceIcon({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992M3.66 14.652a8.25 8.25 0 0014.143 3.183M20.34 9.348A8.25 8.25 0 006.197 6.165" />
    </svg>
  )
}
