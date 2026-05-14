import { useEffect } from 'react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-4 sm:p-6 animate-scaleIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-400 active:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-red-500/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
