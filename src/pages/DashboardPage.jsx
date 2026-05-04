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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-72 flex flex-col bg-white border-r border-slate-200/60 shrink-0 animate-slideInLeft">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-base tracking-tight">MeetingNotes</span>
          </div>
          <button
            onClick={handleCreateNote}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-400 disabled:to-purple-400
                       text-white transition-all duration-200 shadow-md shadow-violet-500/20 hover:shadow-violet-500/30"
          >
            {creating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            }
            Nueva nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
          {loading ? (
            <div className="space-y-2 px-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-14 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 px-2 pt-2">Error: {error}</p>
          ) : notes.length === 0 ? (
            <div className="px-2 pt-8 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">Sin notas todavía</p>
              <p className="text-xs text-slate-300 mt-1">Crea tu primera nota con el botón de arriba</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {user?.user_metadata?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-2 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 overflow-y-auto animate-fadeIn">
        {activeNote ? (
          <NoteEditor key={activeNoteId} noteId={activeNoteId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-scaleIn">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-violet-200/50">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold text-lg">Selecciona una nota</p>
              <p className="text-slate-400 text-sm mt-1.5">o crea una nueva con el botón del sidebar</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
