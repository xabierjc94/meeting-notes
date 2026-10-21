import { useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import ColorPicker from '../ui/ColorPicker'
import { PALETTE } from '../../lib/palette'

export default function ProjectModal({ project, onClose, onSave, position }) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || PALETTE[0].value)
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
        <ColorPicker value={color} onChange={setColor} />
        {error && <p role="alert" className="text-xs text-danger text-center">{error}</p>}
      </form>
    </Modal>
  )
}
