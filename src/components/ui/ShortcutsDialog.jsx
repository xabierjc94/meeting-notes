import Modal from './Modal'

// Ventana de ayuda con atajos de teclado.
// Usa el Modal común: entra en la pila de ventanas (Esc solo cierra la de
// arriba), atrapa el foco con Tab y lo devuelve al botón "?" al cerrarse.
// size="lg": más ancho y en dos columnas (la lista del editor de documentos es larga)
export default function ShortcutsDialog({ groups, onClose, size = 'md' }) {
  return (
    <Modal title="Atajos de teclado" size={size} onClose={onClose}>
      <div className={size === 'lg' ? 'grid sm:grid-cols-2 gap-x-8 gap-y-5' : 'space-y-5'}>
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">{group.label}</h3>
            <dl className="space-y-1.5">
              {group.items.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-ink">{label}</dt>
                  <dd className="shrink-0 font-mono text-xs text-accent bg-canvas border border-line rounded-md px-2 py-0.5">{keys}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
