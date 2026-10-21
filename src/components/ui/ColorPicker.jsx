import { useId } from 'react'
import { PALETTE } from '../../lib/palette'

// ─────────────────────────────────────────────────────────────
// Selector de color como grupo de opciones (radiogroup), igual que unos
// botones de opción nativos:
//   - Tab entra en el grupo una sola vez (en el color marcado),
//   - las flechas cambian de color,
//   - el lector de pantalla dice "Lima, botón de opción, marcado".
// ─────────────────────────────────────────────────────────────
export default function ColorPicker({ label = 'Color', value, onChange, colors = PALETTE }) {
  const labelId = useId()
  // -1 si el color es antiguo: ninguna opción aparece marcada (la primera sigue siendo alcanzable con Tab)
  const selectedIndex = colors.findIndex(c => c.value === value)

  const onKey = (e, index) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const nextIndex = (index + delta + colors.length) % colors.length
    onChange(colors[nextIndex].value)
    e.currentTarget.parentElement.querySelectorAll('[role=radio]')[nextIndex]?.focus()
  }

  return (
    <div>
      <span id={labelId} className="block text-xs font-medium text-ink-muted mb-1.5">{label}</span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2.5">
        {colors.map((c, i) => {
          const selected = i === selectedIndex
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.name}
              title={c.name}
              tabIndex={selected || (selectedIndex === -1 && i === 0) ? 0 : -1}
              onClick={() => onChange(c.value)}
              onKeyDown={e => onKey(e, i)}
              className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${selected ? 'ring-2 ring-offset-2 ring-offset-card ring-ink scale-110' : ''}`}
              style={{ backgroundColor: c.value }}
            />
          )
        })}
      </div>
      {/* Color propio de algo antiguo que ya no está en la paleta */}
      {selectedIndex === -1 && (
        <p className="mt-2 text-xs text-ink-subtle">Color actual conservado. Elige otro para cambiarlo.</p>
      )}
    </div>
  )
}
