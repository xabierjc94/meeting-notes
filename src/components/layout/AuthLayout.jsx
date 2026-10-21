import Logo from '../ui/Logo'

// ─────────────────────────────────────────────────────────────
// Maqueta común de login y registro: presentación a la izquierda (solo en
// pantallas grandes) y tarjeta con el formulario a la derecha.
// Antes cada página tenía su copia, con orbes desenfocados de fondo; ahora
// es plana y un cambio aquí vale para las dos.
//   hero:     { title, text, children } del panel de presentación
//   title / subtitle / footer: los de la tarjeta
// ─────────────────────────────────────────────────────────────
export default function AuthLayout({ hero, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      <div className="flex-1 hidden lg:flex items-center justify-center p-12 bg-surface border-r border-line">
        <div className="max-w-lg animate-fadeIn">
          <div className="flex items-center gap-3 mb-10">
            <Logo size="lg" />
            <span className="text-2xl font-bold text-ink">MeetingNotes</span>
          </div>
          <h2 className="text-4xl font-bold text-ink leading-tight tracking-tight mb-4">{hero.title}</h2>
          <p className="text-lg text-ink-muted leading-relaxed">{hero.text}</p>
          {hero.children && <div className="mt-12">{hero.children}</div>}
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-scaleIn">
          <div className="bg-card border border-line rounded-3xl p-6 sm:p-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <Logo />
              <span className="text-xl font-bold text-ink">MeetingNotes</span>
            </div>

            <h1 className="text-2xl font-semibold text-ink mb-1">{title}</h1>
            <p className="text-sm text-ink-muted mb-8">{subtitle}</p>

            {children}

            <p className="mt-6 text-sm text-ink-muted text-center">{footer}</p>
          </div>
        </div>
      </main>
    </div>
  )
}

// Aviso de error del formulario. role="alert": el lector de pantalla lo lee
// en cuanto aparece, sin que el usuario tenga que buscarlo.
export function AuthError({ children }) {
  return (
    <div role="alert" className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
      <p className="text-sm text-danger">{children}</p>
    </div>
  )
}
