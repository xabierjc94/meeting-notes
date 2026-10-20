// Botón solo con icono. `label` es obligatoria: sin texto visible, es lo
// único que leen los lectores de pantalla (aria-label) y sale como tooltip.
// Móvil: 40 px de lado (objetivo táctil cómodo); escritorio: 36 px.
export default function IconButton({ label, icon, active = false, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`shrink-0 w-10 h-10 md:w-9 md:h-9 flex items-center justify-center rounded-xl transition-colors
        ${active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink hover:bg-card'} ${className}`}
    >
      {icon}
    </button>
  )
}
