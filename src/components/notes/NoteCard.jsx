import { useState } from 'react'
import { useNotes } from '../../context/NotesContext'
import ConfirmDialog from '../ui/ConfirmDialog'

function formatDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (seconds < 60)    return 'ahora mismo'
  if (seconds < 3600)  return `hace ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)}d`
  return formatDate(isoString)
}

// La variante clara ya no existía en la app (solo se usaba la oscura):
// una sola apariencia = menos ramas que mantener.
export default function NoteCard({ note, onSelect }) {
  const { activeNoteId, setActiveNote, deleteNote } = useNotes()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isActive = activeNoteId === note.id

  // La tarjeta desaparece al instante; el aviso "Deshacer" lo pinta DashboardPage
  const handleDelete = () => {
    setConfirmDelete(false)
    deleteNote(note.id)
  }

  const metaColor = isActive ? 'text-ink-muted' : 'text-ink-subtle'

  return (
    <div
      className={`group relative pl-4 pr-3 py-3 rounded-xl transition-colors
        ${isActive ? 'bg-card' : 'hover:bg-card'}`}
    >
      {/* Nota activa: barra lima de 2 px a la izquierda (como el diseño de
          referencia). Va aparte para no mover el texto al activarse. */}
      {isActive && <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full bg-accent" aria-hidden="true" />}

      {/* Botón real (Tab + Enter) que cubre toda la tarjeta con .stretched-link */}
      <p className={`text-sm font-semibold pr-8 ${isActive ? 'text-ink' : 'text-ink-muted group-hover:text-ink'}`}>
        <button
          type="button"
          onClick={() => { setActiveNote(note.id); onSelect?.() }}
          aria-current={isActive ? 'true' : undefined}
          className="stretched-link block w-full text-left cursor-pointer"
        >
          <span className="block truncate">{note.title || 'Sin título'}</span>
        </button>
      </p>

      <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${metaColor}`}>
        {note.meeting_date && (
          <>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(note.meeting_date)}
            </span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span>{timeAgo(note.updated_at)}</span>
      </div>

      <button
        onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
        className="absolute z-10 right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-ink-subtle hover:text-danger hover:bg-danger/10 transition-colors"
        title="Borrar nota"
        aria-label={`Borrar nota ${note.title || 'Sin título'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {confirmDelete && (
        <ConfirmDialog
          title="Borrar nota"
          message={`¿Borrar "${note.title || 'Sin título'}"? Podrás deshacerlo durante unos segundos.`}
          confirmLabel="Borrar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
