import { useEffect, useRef } from 'react'

// Ventana de ayuda con atajos de teclado.
// role="dialog" + aria-modal: los lectores de pantalla la anuncian como
// ventana; Esc o el botón la cierran y el foco entra en ella al abrirse.
export default function ShortcutsDialog({ groups, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-white/10">
          <h2 id="shortcuts-title" className="font-semibold text-white">Atajos de teclado</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{group.label}</h3>
              <dl className="space-y-1.5">
                {group.items.map(([label, keys]) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-slate-200">{label}</dt>
                    <dd className="shrink-0 font-mono text-xs text-violet-200 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">{keys}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
