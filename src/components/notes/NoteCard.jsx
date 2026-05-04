import { useState } from 'react'
import { useNotes } from '../../context/NotesContext'

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

export default function NoteCard({ note }) {
  const { activeNoteId, setActiveNote, deleteNote } = useNotes()
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const isActive = activeNoteId === note.id

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`¿Borrar "${note.title || 'Sin título'}"?`)) return
    setDeleting(true)
    try {
      await deleteNote(note.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div
      onClick={() => setActiveNote(note.id)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`
        relative px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 shadow-sm'
          : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
        }
        ${deleting ? 'opacity-40 pointer-events-none' : ''}
        ${isActive ? 'animate-scaleIn' : ''}
      `}
    >
      <p className={`text-sm font-semibold truncate pr-7 transition-colors ${isActive ? 'text-violet-700' : 'text-slate-700'}`}>
        {note.title || 'Sin título'}
      </p>

      <div className="flex items-center gap-1.5 mt-1">
        {note.meeting_date && (
          <>
            <span className={`text-xs ${isActive ? 'text-violet-400' : 'text-slate-400'}`}>{formatDate(note.meeting_date)}</span>
            <span className={`text-xs ${isActive ? 'text-violet-300' : 'text-slate-300'}`}>·</span>
          </>
        )}
        <span className={`text-xs ${isActive ? 'text-violet-400' : 'text-slate-400'}`}>{timeAgo(note.updated_at)}</span>
      </div>

      {showDelete && !deleting && (
        <button
          onClick={handleDelete}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
          title="Borrar nota"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}
