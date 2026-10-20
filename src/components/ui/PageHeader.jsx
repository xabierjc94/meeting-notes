import { Link } from 'react-router-dom'
import { useAppSidebar } from '../layout/AppSidebarContext'
import Icon from './Icon'
import { ICONS } from './icons'

// ─────────────────────────────────────────────────────────────
// Cabecera de página: migas ("Tareas / Proyecto demo"), título y
// acciones, como la barra superior del diseño de referencia.
//   - En móvil incluye el botón ☰ que abre el menú lateral.
//   - Las migas van en <nav aria-label="Ruta"> con aria-current en la
//     última: así un lector de pantalla sabe dónde estás.
//   - @container: los elementos se recolocan según el ancho de la
//     propia cabecera (cambia al plegar la barra lateral), no de la pantalla.
// ─────────────────────────────────────────────────────────────
export default function PageHeader({ breadcrumb = [], title, icon = null, meta = null, actions = null, children }) {
  const { openMobile } = useAppSidebar()

  return (
    <header className="@container shrink-0 bg-canvas border-b border-line px-3 sm:px-6 pt-3 pb-3 sm:pt-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openMobile}
          aria-label="Abrir menú"
          className="md:hidden shrink-0 w-10 h-10 -ml-1 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card transition-colors"
        >
          <Icon d={ICONS.menu} className="w-5 h-5" />
        </button>

        {breadcrumb.length > 0 && (
          <nav aria-label="Ruta" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumb.map((crumb, i) => {
                const last = i === breadcrumb.length - 1
                return (
                  <li key={i} className={`flex items-center gap-1.5 ${last ? 'min-w-0' : 'shrink-0'}`}>
                    {i > 0 && <span className="text-ink-subtle" aria-hidden="true">/</span>}
                    {crumb.to && !last
                      ? <Link to={crumb.to} className="text-ink font-semibold hover:text-accent transition-colors">{crumb.label}</Link>
                      : <span aria-current={last ? 'page' : undefined} className={`truncate ${last ? 'text-ink-muted' : 'text-ink font-semibold'}`}>{crumb.label}</span>}
                  </li>
                )
              })}
            </ol>
          </nav>
        )}

        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {title && (
        <div className="flex items-center gap-3 mt-3 sm:mt-4 min-w-0">
          {icon}
          <h1 className="min-w-0 truncate text-xl sm:text-2xl font-bold text-ink tracking-tight">{title}</h1>
          {meta && <div className="hidden @md:flex items-center gap-2 shrink-0">{meta}</div>}
        </div>
      )}

      {children}
    </header>
  )
}
