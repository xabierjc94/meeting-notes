// Indicador de carga. role="status" + texto oculto: el lector de
// pantalla dice "Cargando" en vez de nada.
const SIZES = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-[3px]' }
const TONES = {
  accent: 'border-accent/25 border-t-accent',
  ink: 'border-ink/25 border-t-ink',
  dark: 'border-accent-ink/25 border-t-accent-ink', // sobre un botón lima
}

// label={null}: decorativo (aria-hidden), para cuando el texto de al lado ya
// dice lo que pasa ("Entrando…") y no queremos que se anuncie dos veces
export default function Spinner({ size = 'sm', tone = 'accent', label = 'Cargando', className = '' }) {
  if (label === null) {
    return <span aria-hidden="true" className={`inline-block rounded-full animate-spin ${SIZES[size]} ${TONES[tone]} ${className}`} />
  }
  return (
    <span role="status" className={`inline-block rounded-full animate-spin ${SIZES[size]} ${TONES[tone]} ${className}`}>
      <span className="sr-only">{label}</span>
    </span>
  )
}
