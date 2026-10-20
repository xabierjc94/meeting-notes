// ─────────────────────────────────────────────────────────────
// Botón del sistema de diseño. Sustituye al botón con degradado
// violeta que estaba copiado 18 veces en 12 archivos.
//   primary   → lima con texto casi negro (blanco sobre lima no se lee)
//   secondary → tarjeta con borde
//   ghost     → solo texto, fondo al pasar el ratón
//   danger    → acciones destructivas
// `as` permite pintarlo como Link de react-router: <Button as={Link} to="/…">
// ─────────────────────────────────────────────────────────────
const VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover font-semibold',
  secondary: 'bg-card text-ink border border-line hover:bg-card-hover font-medium',
  ghost: 'text-ink-muted hover:text-ink hover:bg-card font-medium',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 font-semibold',
}

const SIZES = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
}

export default function Button({ as: Component = 'button', variant = 'primary', size = 'md', icon = null, className = '', children, ...props }) {
  const extra = Component === 'button' && !props.type ? { type: 'button' } : {}
  return (
    <Component
      {...extra}
      {...props}
      className={`inline-flex items-center justify-center shrink-0 whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </Component>
  )
}
