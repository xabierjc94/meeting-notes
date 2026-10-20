import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: Paleta de comandos (Ctrl+K / ⌘K)
//
// Una caja de búsqueda que lleva a cualquier sitio sin usar el ratón,
// como en Slack, Linear o VS Code. Escribes, filtras y pulsas Enter.
//
// Accesibilidad (patrón ARIA "combobox" con "listbox"):
//   - el foco se queda en el campo de texto; las flechas mueven una
//     selección "virtual" (aria-activedescendant) por la lista;
//   - Esc cierra y el foco vuelve a donde estaba antes de abrirla.
//
// Versión inicial: navegación y acciones. Buscar dentro de notas y
// proyectos llegará en una fase posterior.
// ─────────────────────────────────────────────────────────────

const COMMANDS = [
  { id: 'go-notes', group: 'Ir a', label: 'Notas', icon: ICONS.note, to: '/dashboard' },
  { id: 'go-tasks', group: 'Ir a', label: 'Tareas', icon: ICONS.tasks, to: '/tasks' },
  { id: 'go-library', group: 'Ir a', label: 'Biblioteca', icon: ICONS.library, to: '/biblioteca' },
  { id: 'new-note', group: 'Crear', label: 'Nueva nota', icon: ICONS.plus, to: '/dashboard', state: { newNote: true }, hint: 'Alt+N' },
  { id: 'new-project', group: 'Crear', label: 'Nuevo proyecto', icon: ICONS.folder, to: '/tasks', state: { newProject: true } },
]

// Sin tildes ni mayúsculas: "biblio" encuentra "Biblioteca" y "tareas" encuentra "Tareas"
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listId = useId()
  const optionId = (i) => `${listId}-opt-${i}`

  const results = useMemo(() => {
    const q = normalize(query.trim())
    return q ? COMMANDS.filter((c) => normalize(`${c.group} ${c.label}`).includes(q)) : COMMANDS
  }, [query])

  // Si cambia la lista, la selección no puede apuntar fuera de ella
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0))

  useEffect(() => {
    const previous = document.activeElement
    inputRef.current?.focus()
    return () => {
      // Si se abrió desde el cajón móvil, el botón "Buscar" quedó dentro de
      // un aside `inert` (no enfocable): devolvemos el foco al ☰ visible
      if (previous && previous !== document.body && previous.isConnected && !previous.closest('[inert]')) previous.focus()
      else document.querySelector('main [aria-label="Abrir menú"]')?.focus()
    }
  }, [])

  const run = (cmd) => {
    onClose()
    navigate(cmd.to, cmd.state ? { state: cmd.state } : undefined)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((activeIndex + 1) % Math.max(results.length, 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((activeIndex - 1 + results.length) % Math.max(results.length, 1)) }
    else if (e.key === 'Enter' && results[activeIndex]) { e.preventDefault(); run(results[activeIndex]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    // Ventana modal: Tab no debe sacar el foco a la página de detrás
    else if (e.key === 'Tab') e.preventDefault()
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar y navegar"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-line rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
      >
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Icon d={ICONS.search} className="w-4 h-4 text-ink-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            placeholder="Buscar o ir a…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            className="flex-1 h-12 bg-transparent text-sm text-ink placeholder:text-ink-subtle outline-none"
          />
          <kbd className="hidden sm:block text-[11px] text-ink-subtle border border-line rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Anuncio para lectores de pantalla al filtrar */}
        <p className="sr-only" aria-live="polite">
          {results.length === 0 ? 'Sin resultados' : `${results.length} resultado${results.length === 1 ? '' : 's'}`}
        </p>
        <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li role="presentation" className="px-3 py-6 text-center text-sm text-ink-muted">Nada coincide con «{query}»</li>
          )}
          {results.map((cmd, i) => {
            const header = results[i - 1]?.group !== cmd.group ? cmd.group : null
            const selected = i === activeIndex
            return (
              <li key={cmd.id} role="presentation">
                {header && <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle" aria-hidden="true">{header}</p>}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(cmd)}
                  className={`flex items-center gap-3 h-10 px-3 rounded-xl text-sm cursor-pointer ${selected ? 'bg-card-hover text-ink' : 'text-ink-muted'}`}
                >
                  <Icon d={cmd.icon} className={`w-4 h-4 ${selected ? 'text-accent' : ''}`} />
                  <span className="flex-1">{cmd.label}</span>
                  {cmd.hint && <kbd className="text-[11px] text-ink-subtle">{cmd.hint}</kbd>}
                  {selected && <span className="text-[11px] text-ink-subtle" aria-hidden="true">↵</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body
  )
}
