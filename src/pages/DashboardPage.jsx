import { useState, useMemo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useNotes } from '../context/NotesContext'
import { useAppSidebar } from '../components/layout/AppSidebarContext'
import MobileTopBar from '../components/layout/MobileTopBar'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import NoteCard from '../components/notes/NoteCard'
import UndoDeleteToast from '../components/notes/UndoDeleteToast'

// El editor (TipTap) pesa ~120 KB: se descarga solo al abrir una nota
const NoteEditor = lazy(() => import('../components/editor/NoteEditor'))

function EditorFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
    </div>
  )
}

function NotesRailActions({ handleCreateNote, creating, onSearch }) {
  return (
    <>
      <button
        onClick={handleCreateNote}
        disabled={creating}
        title="Nueva nota"
        aria-label="Nueva nota"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
      >
        {creating
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <Icon d={ICONS.plus} />}
      </button>
      <button
        onClick={onSearch}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        title="Buscar notas"
        aria-label="Buscar notas"
      >
        <Icon d={ICONS.search} />
      </button>
    </>
  )
}

function NotesSidebarSection({ loading, error, filteredNotes, searchQuery, setSearchQuery, handleCreateNote, creating, autoFocusSearch, onSearchFocus, onSelectNote }) {
  return (
    <>
      <div className="px-6 pb-4">
        <h2 className="text-white font-semibold text-sm mb-3">¿Qué vas a documentar hoy?</h2>
        <button
          onClick={handleCreateNote}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-400 disabled:to-purple-400
                     text-white transition-all duration-300 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          {creating
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Icon d={ICONS.plus} />
          }
          Nueva nota
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Icon d={ICONS.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            autoFocus={autoFocusSearch}
            onFocus={onSearchFocus}
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
      <div className="flex-1 overflow-y-auto px-3 pb-3">
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
              <NoteCard key={note.id} note={note} variant="dark" onSelect={onSelectNote} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function DashboardPage() {
  const { notes, loading, error, activeNoteId, createNote } = useNotes()
  const { panelEl, railEl, setCollapsed, closeMobile } = useAppSidebar()
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)

  const handleCreateNote = async () => {
    setCreating(true)
    try { await createNote() } catch (err) { console.error(err) } finally { setCreating(false) }
    closeMobile()
  }

  // Desde el rail: desplegar el menú y enfocar el buscador (una sola vez)
  const handleRailSearch = () => {
    setFocusSearch(true)
    setCollapsed(false)
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {panelEl && createPortal(
        <NotesSidebarSection
          loading={loading}
          error={error}
          filteredNotes={filteredNotes}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleCreateNote={handleCreateNote}
          creating={creating}
          autoFocusSearch={focusSearch}
          onSearchFocus={() => setFocusSearch(false)}
          onSelectNote={closeMobile}
        />,
        panelEl
      )}
      {railEl && createPortal(
        <NotesRailActions handleCreateNote={handleCreateNote} creating={creating} onSearch={handleRailSearch} />,
        railEl
      )}

      <MobileTopBar
        action={
          <button
            onClick={handleCreateNote}
            disabled={creating}
            aria-label="Nueva nota"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20 transition-all"
          >
            {creating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Icon d={ICONS.plus} className="w-5 h-5" />
            }
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {activeNote ? (
          <div className="animate-fadeIn">
            <Suspense fallback={<EditorFallback />}>
              <NoteEditor key={activeNoteId} noteId={activeNoteId} />
            </Suspense>
          </div>
        ) : (
          <EmptyState stats={stats} onCreateNote={handleCreateNote} />
        )}
      </div>

      <UndoDeleteToast />
    </div>
  )
}

function EmptyState({ stats, onCreateNote }) {
  return (
    <div className="flex items-center justify-center h-full relative overflow-hidden bg-slate-950">
      {/* Decorative elements - hidden on mobile */}
      <div className="hidden sm:block absolute top-16 right-24 w-24 h-24 bg-violet-600/10 rounded-3xl rotate-12 animate-float pointer-events-none" />
      <div className="hidden sm:block absolute bottom-24 left-20 w-16 h-16 bg-purple-600/10 rounded-2xl -rotate-12 animate-float-delay pointer-events-none" />
      <div className="hidden sm:block absolute top-1/4 left-1/3 w-8 h-8 bg-violet-500/10 rounded-full animate-float-slow pointer-events-none" />
      <div className="hidden sm:block absolute bottom-1/3 right-1/3 w-12 h-12 bg-indigo-500/10 rounded-xl rotate-45 animate-pulse-glow pointer-events-none" />

      <div className="text-center relative z-10 animate-scaleIn max-w-md px-6">
        {/* Hero icon */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 rounded-3xl sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-violet-900/40 border border-white/10 animate-float">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-2 -right-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-lg border border-white/10 animate-float-delay">
            <span className="text-xs font-bold text-violet-300">{stats.total} notas</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Tus reuniones, organizadas</h1>
        <p className="text-slate-400 text-sm mb-6 sm:mb-8 leading-relaxed">
          Selecciona una nota del menú o crea una nueva para empezar.
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/10 hover:border-violet-400/30 transition-all duration-300">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{stats.today}</p>
            <p className="text-xs text-slate-400 mt-0.5">Hoy</p>
          </div>
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/10 hover:border-violet-400/30 transition-all duration-300">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{stats.recent}</p>
            <p className="text-xs text-slate-400 mt-0.5">Semana</p>
          </div>
          <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/10 hover:border-violet-400/30 transition-all duration-300">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-500/10 rounded-lg flex items-center justify-center mx-auto mb-1.5 sm:mb-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{stats.total}</p>
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
