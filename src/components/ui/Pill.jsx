// Pastilla pastel (prioridad, etiqueta, estado): fondo claro + texto
// oscuro del mismo tono, como en el diseño de referencia. Todas las
// combinaciones superan 9:1 de contraste.
const TONES = {
  rose: 'bg-pill-rose text-pill-rose-ink',
  yellow: 'bg-pill-yellow text-pill-yellow-ink',
  mint: 'bg-pill-mint text-pill-mint-ink',
  red: 'bg-pill-red text-pill-red-ink',
  orange: 'bg-pill-orange text-pill-orange-ink',
  sky: 'bg-pill-sky text-pill-sky-ink',
  lilac: 'bg-pill-lilac text-pill-lilac-ink',
  accent: 'bg-accent text-accent-ink',
  neutral: 'bg-card-hover text-ink-muted',
}

export default function Pill({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-4 whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}
