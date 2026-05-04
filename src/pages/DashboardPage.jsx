import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotes } from '../context/NotesContext'
import NoteCard from '../components/notes/NoteCard'
import NoteEditor from '../components/editor/NoteEditor'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getInitials(name, email) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email ? email.slice(0, 2).toUpperCase() : 'UN'
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { notes, loading, error, activeNoteId, createNote } = useNotes()
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
  }

  const handleCreateNote = async () => {
    setCreating(true)
    try { await createNote() } catch (err) { console.error(err) } finally { setCreating(false) }
  }

  const activeNote = notes.find((n) => n.id === activeNoteId)

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.meeting_date || '').toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    const thisWeek = thisWeekStart.toISOString().split('T')[0]

    return {
      total: notes.length,
      today: notes.filter(n => n.updated_at?.startsWith(today)).length,
      thisWeek: notes.filter(n => n.updated_at?.startsWith(thisWeek)).length,
      recent: notes.filter(n => n.updated_at && n.updated_at >= thisWeek).length,
    }
  }, [notes])

  const greeting = getGreeting()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-80 flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shrink-0 animate-slideInLeft relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -left-16 w-36 h-36 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header section */}
        <div className="relative z-10 px-6 pt-7 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30 ring-1 ring-violet-400/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">MeetingNotes</span>
          </div>

          <div className="mb-5">
            <p className="text-xs text-violet-300/60 font-medium mb-1">{greeting}, {userName}</p>
            <h2 className="text-white font-semibold text-sm">¿Qué vas a documentar hoy?</h2>
          </div>

          <button
            onClick={handleCreateNote}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold
                       bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-400 disabled:to-purple-400
                       text-white transition-all duration-300 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
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

        {/* Search */}
        <div className="relative z-10 px-5 pb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white
                         placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/30
                         transition-all duration-200"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 relative z-10">
          {loading ? (
            <div className="space-y-2 px-2 pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-white/5 rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-3 pt-6 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
              <p className="text-xs text-red-300/80">{error}</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="px-3 pt-8 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 animate-float">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">
                {searchQuery ? 'Sin resultados' : 'Sin notas todavía'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                {searchQuery ? 'Prueba con otro término' : 'Crea tu primera nota con el botón de arriba'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} variant="dark" />
              ))}
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="relative z-10 border-t border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-xl flex items-center justify-center shrink-0 border border-violet-400/20">
                <span className="text-xs font-bold text-violet-200">{getInitials(user?.user_metadata?.full_name, user?.email)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {user?.user_metadata?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
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
      <main className="flex-1 overflow-y-auto">
        {activeNote ? (
          <div className="animate-fadeIn">
            <NoteEditor key={activeNoteId} noteId={activeNoteId} />
          </div>
        ) : (
          <EmptyState stats={stats} onCreateNote={handleCreateNote} />
        )}
      </main>
    </div>
  )
}

function EmptyState({ stats, onCreateNote }) {
  return (
    <div className="flex items-center justify-center h-full relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Decorative elements */}
      <div className="absolute top-16 right-24 w-24 h-24 bg-violet-200/30 rounded-3xl rotate-12 animate-float pointer-events-none" />
      <div className="absolute bottom-24 left-20 w-16 h-16 bg-purple-200/30 rounded-2xl -rotate-12 animate-float-delay pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-8 h-8 bg-violet-100/50 rounded-full animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-12 h-12 bg-indigo-100/30 rounded-xl rotate-45 animate-pulse-glow pointer-events-none" />

      <div className="text-center relative z-10 animate-scaleIn max-w-md px-8">
        {/* Hero icon */}
        <div className="relative inline-block mb-8">
          <div className="w-28 h-28 bg-gradient-to-br from-violet-100 via-purple-100 to-indigo-100 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-violet-200/40 border border-violet-200/50 animate-float">
            <svg className="w-14 h-14 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-2 -right-2 bg-white rounded-xl px-3 py-1.5 shadow-lg border border-slate-100 animate-float-delay">
            <span className="text-xs font-bold text-violet-600">{stats.total} notas</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Tus reuniones, organizadas</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Selecciona una nota del panel izquierdo o crea una nueva para empezar a documentar tus reuniones.
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-200/50 transition-all duration-300">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.today}</p>
            <p className="text-xs text-slate-400 mt-0.5">Hoy</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-200/50 transition-all duration-300">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.recent}</p>
            <p className="text-xs text-slate-400 mt-0.5">Esta semana</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-200/50 transition-all duration-300">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total</p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onCreateNote}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                     text-white transition-all duration-300 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear primera nota
        </button>
      </div>
    </div>
  )
}
