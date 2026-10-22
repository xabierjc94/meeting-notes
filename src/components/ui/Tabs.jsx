import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────
// Pestañas con subrayado lima (patrón ARIA "tablist"):
//   - role="tablist" / role="tab" + aria-selected: los lectores de
//     pantalla anuncian "pestaña 2 de 5, seleccionada".
//   - Con `panelId`, cada pestaña apunta a su panel (aria-controls) y el
//     panel se nombra con la pestaña activa: id = `${panelId}-tab-${item.id}`.
//   - Flechas ← →, Inicio y Fin mueven entre pestañas (lo que espera un usuario de
//     teclado); solo la activa está en el orden de Tab ("roving tabindex").
// En móvil se desplazan horizontalmente si no caben.
// ─────────────────────────────────────────────────────────────
export default function Tabs({ items, value, onChange, label, panelId, className = '' }) {
  const refs = useRef([])

  // En móvil la tira se desplaza: al cambiar de pestaña (también desde la
  // URL), la activa se trae a la vista para que no quede medio oculta
  const selectedIndex = items.findIndex(item => item.id === value)
  useEffect(() => {
    refs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selectedIndex])

  const onKeyDown = (e, index) => {
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    const next = (keys[e.key] + items.length) % items.length
    onChange(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={`flex items-end gap-1 overflow-x-auto no-scrollbar border-b border-line ${className}`}>
      {items.map((item, i) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="tab"
            id={panelId ? `${panelId}-tab-${item.id}` : undefined}
            aria-controls={panelId}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`shrink-0 flex items-center gap-2 px-3 h-10 -mb-px border-b-2 text-sm font-medium transition-colors
              ${selected ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
