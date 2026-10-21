import { useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// Paleta del rediseño. Los proyectos que ya existen conservan su color:
// es una elección del usuario y está guardada en la base de datos.
const PROJECT_COLORS = [
  { value: '#b4f53c', name: 'Lima' },
  { value: '#4ade80', name: 'Verde' },
  { value: '#2dd4bf', name: 'Turquesa' },
  { value: '#38bdf8', name: 'Azul cielo' },
  { value: '#c4b5fd', name: 'Lila' },
  { value: '#f9a8d4', name: 'Rosa' },
  { value: '#f87171', name: 'Rojo' },
  { value: '#fb923c', name: 'Naranja' },
  { value: '#facc15', name: 'Amarillo' },
  { value: '#a3a3a3', name: 'Gris' },
]

export default function ProjectModal({ project, onClose, onSave, position }) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Foco inicial con ref (React 19 no escribe el atributo autofocus en el HTML,
  // así que useModalLayer no lo vería)
  const nameRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), description: description.trim(), color, position })
      onClose()
    } catch {
      setError('No se pudo guardar el proyecto. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Grupo de opciones (radiogroup): las flechas cambian de color, como en
  // un grupo de botones de opción nativo
  const onColorKey = (e, index) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = PROJECT_COLORS[(index + delta + PROJECT_COLORS.length) % PROJECT_COLORS.length]
    setColor(next.value)
    e.currentTarget.parentElement.querySelectorAll('[role=radio]')[PROJECT_COLORS.indexOf(next)]?.focus()
  }
  // -1 si el color es antiguo: ninguna opción aparece marcada (la primera sigue siendo alcanzable con Tab)
  const selectedIndex = PROJECT_COLORS.findIndex(c => c.value === color)
  const label = 'block text-xs font-medium text-ink-muted mb-1.5'

  return (
    <Modal
      title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
      onClose={onClose}
      initialFocusRef={nameRef}
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="submit" form="project-form" disabled={saving || !name.trim()} className="flex-1">
            {saving ? 'Guardando…' : project ? 'Guardar' : 'Crear proyecto'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="project-name" className={label}>Nombre</label>
          <input id="project-name" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Mi proyecto…" ref={nameRef} className="field" />
        </div>
        <div>
          <label htmlFor="project-description" className={label}>Descripción (opcional)</label>
          <input id="project-description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el proyecto…" className="field" />
        </div>
        <div>
          <span id="project-color-label" className={label}>Color</span>
          <div role="radiogroup" aria-labelledby="project-color-label" className="flex flex-wrap gap-2.5">
            {PROJECT_COLORS.map((c, i) => {
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
                  onClick={() => setColor(c.value)}
                  onKeyDown={e => onColorKey(e, i)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${selected ? 'ring-2 ring-offset-2 ring-offset-card ring-ink scale-110' : ''}`}
                  style={{ backgroundColor: c.value }}
                />
              )
            })}
          </div>
          {/* Color propio de un proyecto antiguo que ya no está en la paleta */}
          {!PROJECT_COLORS.some(c => c.value === color) && (
            <p className="mt-2 text-xs text-ink-subtle">Color actual conservado. Elige otro para cambiarlo.</p>
          )}
        </div>
        {error && <p role="alert" className="text-xs text-danger text-center">{error}</p>}
      </form>
    </Modal>
  )
}
