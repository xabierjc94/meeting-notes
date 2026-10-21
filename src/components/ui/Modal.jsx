import { useId } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../hooks/useModalLayer'

// Ventana estándar: hoja inferior en móvil, centrada en escritorio.
export default function Modal({ title, onClose, children, footer = null, size = 'md', initialFocusRef }) {
  const ref = useModalLayer(onClose, { initialFocusRef })
  const titleId = useId()
  const width = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${width} max-h-[92vh] flex flex-col bg-card border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slideUp sm:animate-scaleIn`}
      >
        <div className="sm:hidden flex justify-center pt-3" aria-hidden="true">
          <div className="w-10 h-1 bg-line-strong/60 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line shrink-0">
          <h2 id={titleId} className="font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
