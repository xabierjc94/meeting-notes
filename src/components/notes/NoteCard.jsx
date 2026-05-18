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

export default function NoteCard({ note, variant = 'light' }) {
  const { activeNoteId, setActiveNote, deleteNote } = useNotes()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isActive = activeNoteId === note.id

  const handleDelete = async () => {
    setDeleting(true)
    setConfirmDelete(false)
    try {
      await deleteNote(note.id)
    } catch {
      setDeleting(false)
    }
  }

  const isDark = variant === 'dark'

  return (
    <div
      onClick={() => setActiveNote(note.id)}
      className={`
        group relative px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
        ${isActive
          ? isDark
            ? 'bg-white/10 border border-violet-400/30 shadow-lg shadow-violet-500/10'
            : 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 shadow-sm'
          : isDark
            ? 'hover:bg-white/5 border border-transparent hover:border-white/10'
            : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
        }
        ${deleting ? 'opacity-40 pointer-events-none' : ''}
        ${isActive ? 'animate-scaleIn' : ''}
      `}
    >
      <p className={`text-sm font-semibold truncate pr-8 transition-colors ${
        isActive
          ? isDark ? 'text-white' : 'text-violet-700'
          : isDark ? 'text-slate-200' : 'text-slate-700'
      }`}>
        {note.title || 'Sin título'}
      </p>

      <div className="flex items-center gap-1.5 mt-1.5">
        {note.meeting_date && (
          <>
            <span className={`text-xs flex items-center gap-1 ${isActive ? (isDark ? 'text-violet-300' : 'text-violet-400') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(note.meeting_date)}
            </span>
            <span className={`text-xs ${isActive ? (isDark ? 'text-violet-400' : 'text-violet-300') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>·</span>
          </>
        )}
        <span className={`text-xs ${isActive ? (isDark ? 'text-violet-300' : 'text-violet-400') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
          {timeAgo(note.updated_at)}
        </span>
      </div>

      {/* Visible always on mobile, hover-only on desktop */}
      {!deleting && (
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200
            ${isDark
              ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            }`}
          title="Borrar nota"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Borrar nota"
          message={`¿Borrar "${note.title || 'Sin título'}"? Esta acción no se puede deshacer.`}
          confirmLabel="Borrar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
