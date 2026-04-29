import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotes } from '../context/NotesContext'
import NoteCard from '../components/notes/NoteCard'
import NoteEditor from '../components/editor/NoteEditor'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { notes, loading, error, activeNoteId, createNote } = useNotes()
  const [creating, setCreating] = useState(false)

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
  }

  const handleCreateNote = async () => {
    setCreating(true)
    try { await createNote() } catch (err) { console.error(err) } finally { setCreating(false) }
  }

  const activeNote = notes.find((n) => n.id === activeNoteId)

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 flex flex-col border-r border-gray-200 bg-gray-50 shrink-0">
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-semibold text-gray-800 text-sm">MeetingNotes</span>
          </div>
          <button
            onClick={handleCreateNote}
            disabled={creating}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                       bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                       text-white font-medium transition-colors"
          >
            {creating
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            }
            Nueva nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="space-y-2 px-1 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 px-2 pt-2">Error: {error}</p>
          ) : notes.length === 0 ? (
            <div className="px-2 pt-4 text-center">
              <p className="text-xs text-gray-400">Sin notas todavía</p>
              <p className="text-xs text-gray-400">Crea tu primera nota arriba</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">
                {user?.user_metadata?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors" title="Cerrar sesión">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto">
        {activeNote ? (
          <NoteEditor key={activeNoteId} noteId={activeNoteId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Selecciona una nota</p>
              <p className="text-gray-400 text-sm mt-1">o crea una nueva con el botón del sidebar</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
