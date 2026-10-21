import { useNotes } from '../../context/NotesContext'

// Aviso inferior tras borrar una nota: "Nota borrada · Deshacer".
// El contenedor con aria-live siempre está en el DOM para que los
// lectores de pantalla anuncien el mensaje cuando aparece.
export default function UndoDeleteToast() {
  const { pendingDelete, undoDelete, deleteError, clearDeleteError } = useNotes()

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm flex flex-col items-center gap-2 pointer-events-none"
    >
      {pendingDelete && (
        <div className="pointer-events-auto w-full flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl bg-card border border-line shadow-2xl text-sm text-ink animate-slideUp">
          <span className="flex-1 min-w-0 truncate">
            Nota borrada: <span className="font-semibold">{pendingDelete.title || 'Sin título'}</span>
          </span>
          <button
            onClick={undoDelete}
            className="shrink-0 px-3 py-1.5 rounded-lg font-semibold text-accent hover:bg-accent-soft transition-colors"
          >
            Deshacer
          </button>
        </div>
      )}
      {deleteError && (
        <div role="alert" className="pointer-events-auto w-full flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl bg-card border border-danger/40 shadow-2xl text-sm text-ink animate-slideUp">
          <span className="flex-1 min-w-0">{deleteError}</span>
          <button
            onClick={clearDeleteError}
            aria-label="Cerrar aviso"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-danger/15 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
