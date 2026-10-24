import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BUCKETS, bucketDateRange } from '../../lib/taskBuckets'

const MENU_WIDTH = 224

// ─────────────────────────────────────────────────────────────
// Menú "⋯" de una tarjeta: moverla a Hoy, Mañana, Esta semana…,
// Próximamente… o a una columna extra, y activar o quitar "En curso".
// Es la alternativa al arrastre: todo se puede hacer con el teclado.
//
// Patrón de teclado de un menú (ARIA "menu"):
//   - Enter / Espacio / ↓ en el botón lo abren con el foco en la 1.ª opción
//   - ↑ ↓ Inicio Fin recorren las opciones; Enter elige
//   - Esc o Tab lo cierran y el foco vuelve al botón ⋯
//
// Se pinta en un portal (directamente en <body>, posición fija): las
// columnas tienen su propio scroll y recortarían un menú que sobresale.
// ─────────────────────────────────────────────────────────────
export default function TaskMoveMenu({ task, location, customColumns, today, onMoveBucket, onMoveColumn, onToggleProgress }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const items = [
    ...BUCKETS.map(b => {
      const asks = b.id === 'semana' || b.id === 'proximamente'
      return {
        key: `bucket:${b.id}`,
        label: asks ? `${b.label}…` : b.label,
        // "Esta semana" no tiene días libres en sábado ni domingo
        disabled: b.id === 'semana' && !bucketDateRange('semana', today),
        run: () => onMoveBucket(b.id),
      }
    }),
    ...customColumns.map((c, i) => ({
      key: `col:${c.id}`,
      label: c.name,
      color: c.color,
      separator: i === 0,
      run: () => onMoveColumn(c.id),
    })),
    {
      key: 'progress',
      label: task.in_progress ? 'Quitar "En curso"' : 'Marcar "En curso"',
      separator: true,
      run: onToggleProgress,
    },
  ]

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus()
  }

  // Coloca el menú bajo el botón, alineado a su derecha; si no cabe debajo, encima
  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const h = menuRef.current.offsetHeight
    const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
    const below = r.bottom + 6
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below
    setPos({ top, left })
    menuRef.current.querySelector('[role=menuitem]:not([disabled])')?.focus()
  }, [open])

  // Clic fuera cierra (sin robar el foco a donde se ha hecho clic)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close(false)
    }
    // Con la página desplazándose, la posición fija dejaría el menú flotando lejos
    const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) close(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const onMenuKey = (e) => {
    const options = [...menuRef.current.querySelectorAll('[role=menuitem]:not([disabled])')]
    const i = options.indexOf(document.activeElement)
    const go = (n) => { e.preventDefault(); options[(n + options.length) % options.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(options.length - 1)
    // Captura de Esc: que no cierre también la ventana que haya debajo
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    // Tab también cierra; el foco vuelve al ⋯ (el menú vive al final de
    // <body> y el "siguiente" elemento sería ajeno a la tarjeta)
    else if (e.key === 'Tab') { e.preventDefault(); close() }
  }

  const choose = (item) => {
    close()
    item.run()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-menu-for={task.id}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Mover o cambiar: ${task.title}`}
        title="Mover"
        className="relative z-10 w-10 h-10 md:w-6 md:h-6 flex items-center justify-center rounded-md text-ink-subtle hover:text-ink hover:bg-card-hover transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Mover ${task.title}`}
          onKeyDown={onMenuKey}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH, zIndex: 60 }}
          className="py-1.5 bg-card border border-line rounded-xl shadow-2xl shadow-black/50"
        >
          <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle" aria-hidden="true">Mover a</p>
          {items.map(item => {
            const current = item.key === location
            return (
              <div key={item.key}>
                {item.separator && <div role="separator" className="my-1.5 border-t border-line" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled || current}
                  aria-current={current || undefined}
                  onClick={() => choose(item)}
                  className="w-full flex items-center gap-2.5 px-3 h-10 md:h-9 text-sm text-left text-ink hover:bg-card-hover focus:bg-card-hover focus:outline-none disabled:text-ink-subtle disabled:hover:bg-transparent"
                >
                  {item.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {current && <span className="text-xs text-ink-subtle">Aquí</span>}
                </button>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
