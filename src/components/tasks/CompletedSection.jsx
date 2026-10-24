import { useId, useState } from 'react'

const STORAGE_KEY = 'tasks-completadas-abierta'

// Si el navegador no deja usar localStorage (modo privado, cuota llena),
// la sección funciona igual: solo deja de recordar el estado
function readOpen() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}
function saveOpen(value) {
  try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0') } catch { /* sin storage: solo dura la sesión */ }
}

// ─────────────────────────────────────────────────────────────
// Sección "Completadas" al pie del tablero (y de la Lista).
// Plegada la primera vez; recuerda si la dejaste abierta en este navegador.
// Patrón "disclosure": un botón con aria-expanded que muestra u oculta la
// región que indica aria-controls (el lector de pantalla dice "contraído").
// ─────────────────────────────────────────────────────────────
export default function CompletedSection({ tasks, renderTask, layout = 'grid' }) {
  const [open, setOpen] = useState(readOpen)
  const regionId = useId()

  if (tasks.length === 0) return null

  const toggle = () => {
    const next = !open
    setOpen(next)
    saveOpen(next)
  }

  return (
    <section aria-label="Tareas completadas" className="rounded-2xl bg-surface">
      <h3>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={regionId}
          className="w-full flex items-center gap-3 px-4 h-12 rounded-2xl text-left hover:bg-card-hover/60 transition-colors"
        >
          <svg className={`w-4 h-4 text-ink-muted transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-bold text-ink">Completadas</span>
          <span className="text-xs font-semibold text-ink-subtle">{tasks.length}</span>
        </button>
      </h3>
      <div id={regionId} hidden={!open} className="px-3 pb-3">
        {/* grid: tarjetas del tablero; list: filas de la vista Lista */}
        <div className={layout === 'list' ? 'flex flex-col' : 'grid gap-2 md:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]'}>
          {tasks.map(renderTask)}
        </div>
      </div>
    </section>
  )
}
