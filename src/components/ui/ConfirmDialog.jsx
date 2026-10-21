import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../hooks/useModalLayer'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: Portal
//
// Aunque el diálogo es `fixed`, si se pinta DENTRO de una tarjeta de la
// barra lateral queda atrapado en la "capa" (stacking context) de sus
// antepasados: el panel principal, que va después en la página, se pinta
// encima. createPortal lo saca y lo pinta directamente en <body>, por
// encima de todo, se abra desde donde se abra.
//
// useModalLayer lo mete en la pila de ventanas: si se abre sobre otro
// modal (borrar desde el formulario de una tarea), Esc solo cierra este.
// ─────────────────────────────────────────────────────────────
export default function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  const titleId = useId()
  const messageId = useId()
  // El foco entra en "Cancelar": la opción segura si se pulsa Enter sin mirar
  const cancelRef = useRef(null)
  const ref = useModalLayer(onCancel, { initialFocusRef: cancelRef })

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      // En React los clics de un portal suben igualmente por sus "padres" del
      // árbol de componentes (la tarjeta): los cortamos aquí
      onClick={(e) => { e.stopPropagation(); onCancel() }}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-2xl p-4 sm:p-6 animate-scaleIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-danger/10 border border-danger/25 rounded-xl flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 id={titleId} className="text-base font-semibold text-ink mb-1">{title}</h3>
        <p id={messageId} className="text-sm text-ink-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 h-11 border border-line rounded-xl text-sm font-medium text-ink hover:bg-card-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 bg-danger hover:opacity-90 text-canvas rounded-xl text-sm font-semibold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
