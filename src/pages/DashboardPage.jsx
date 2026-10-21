import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Helmet } from 'react-helmet-async'
import { useNotes } from '../context/NotesContext'
import { useAppSidebar } from '../components/layout/AppSidebarContext'
import MobileTopBar from '../components/layout/MobileTopBar'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import NoteCard from '../components/notes/NoteCard'
import UndoDeleteToast from '../components/notes/UndoDeleteToast'
import ShortcutsDialog from '../components/ui/ShortcutsDialog'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { hasOpenModal } from '../hooks/useModalLayer'

// Atajos reales: los de la página (DashboardPage) y los del editor (StarterKit + TaskList)
const NOTES_SHORTCUTS = [
  {
    label: 'General',
    items: [
      ['Nueva nota', 'Alt+N'],
      ['Buscar notas', '/'],
      ['Ver estos atajos', '?'],
      ['Imprimir o guardar como PDF', 'Ctrl+P'],
      ['Salir del modo foco', 'Esc'],
    ],
  },
  {
    label: 'Formato (en Mac, Ctrl = ⌘)',
    items: [
      ['Negrita', 'Ctrl+B'],
      ['Cursiva', 'Ctrl+I'],
      ['Tachado', 'Ctrl+Shift+S'],
      ['Código', 'Ctrl+E'],
      ['Título 1 / Título 2', 'Ctrl+Alt+1 / 2'],
      ['Lista con viñetas', 'Ctrl+Shift+8'],
      ['Lista numerada', 'Ctrl+Shift+7'],
      ['Lista de tareas', 'Ctrl+Shift+9'],
      ['Casilla al empezar línea', '[ ] + espacio'],
      ['Cita', 'Ctrl+Shift+B'],
      ['Deshacer / Rehacer', 'Ctrl+Z / Ctrl+Shift+Z'],
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// Agrupa las notas por su última edición: "Hoy", "Ayer", "Últimos 7 días",
// "Este mes" y después "septiembre de 2026"… Las fechas se comparan como
// números (Date.parse): el servidor y el navegador las escriben con formatos
// distintos y compararlas como texto daría un orden incorrecto.
// ─────────────────────────────────────────────────────────────
function groupNotesByDate(notes) {
  const now = new Date()
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const today = startOfDay(now)
  const DAY = 24 * 60 * 60 * 1000
  const sorted = [...notes].sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0))

  const groups = []
  for (const note of sorted) {
    const d = new Date(note.updated_at)
    const day = startOfDay(d)
    let label
    if (day >= today) label = 'Hoy'
    else if (day >= today - DAY) label = 'Ayer'
    else if (day >= today - 6 * DAY) label = 'Últimos 7 días'
    else if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) label = 'Este mes'
    else {
      const month = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      label = month.charAt(0).toUpperCase() + month.slice(1)
    }
    const last = groups[groups.length - 1]
    if (last?.label === label) last.notes.push(note)
    else groups.push({ label, notes: [note] })
  }
  return groups
}

// El editor (TipTap) pesa ~120 KB: se descarga solo al abrir una nota
const NoteEditor = lazy(() => import('../components/editor/NoteEditor'))

function EditorFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="md" label="Cargando editor" />
    </div>
  )
}

function NotesRailActions({ handleCreateNote, onSearch }) {
  return (
    <>
      <button
        onClick={handleCreateNote}
        title="Nueva nota"
        aria-label="Nueva nota"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover text-accent-ink transition-all hover:scale-105 active:scale-95"
      >
        <Icon d={ICONS.plus} />
      </button>
      <button
        onClick={onSearch}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card-hover transition-all"
        title="Buscar notas"
        aria-label="Buscar notas"
      >
        <Icon d={ICONS.search} />
      </button>
    </>
  )
}

function NotesSidebarSection({ loading, error, groups, searchQuery, setSearchQuery, handleCreateNote, autoFocusSearch, onSearchFocus, onSelectNote, onRetry, onShowShortcuts }) {
  return (
    <>
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="flex-1 text-ink font-semibold text-sm">¿Qué vas a documentar hoy?</h2>
          <button
            onClick={onShowShortcuts}
            title="Atajos de teclado (?)"
            aria-label="Atajos de teclado"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-ink-muted hover:text-ink hover:bg-card-hover border border-line transition-colors"
          >
            ?
          </button>
        </div>
        <Button onClick={handleCreateNote} icon={<Icon d={ICONS.plus} />} className="w-full">
          Nueva nota
        </Button>
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Icon d={ICONS.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            id="notes-search"
            type="search"
            aria-label="Buscar notas"
            autoFocus={autoFocusSearch}
            onFocus={onSearchFocus}
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="field pl-10"
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="space-y-2 px-2 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-card rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-3 pt-6 text-center">
            <div className="w-12 h-12 bg-danger/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <p className="text-sm text-danger">No hemos podido cargar tus notas</p>
            <p className="text-xs text-ink-muted mt-1">Comprueba la conexión e inténtalo de nuevo.</p>
            <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
              Reintentar
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="px-3 pt-8 text-center">
            <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4 border border-line">
              <svg className="w-8 h-8 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink-muted">
              {searchQuery ? 'Sin resultados' : 'Sin notas todavía'}
            </p>
            <p className="text-xs text-ink-muted mt-1.5">
              {searchQuery ? 'Prueba con otro término' : 'Crea tu primera nota con el botón de arriba'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h3 className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{group.label}</h3>
                <div className="space-y-1">
                  {group.notes.map((note) => (
                    <NoteCard key={note.id} note={note} onSelect={onSelectNote} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function DashboardPage() {
  const { notes, loading, error, activeNoteId, createNote, fetchNotes } = useNotes()
  const { panelEl, railEl, setCollapsed, openMobile, closeMobile, focusMode, setFocusMode } = useAppSidebar()
  const [searchQuery, setSearchQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Instantáneo: la nota se crea en local y el servidor se entera por detrás
  const handleCreateNote = () => {
    createNote()
    closeMobile()
  }

  // "Nota rápida" desde Tareas o Biblioteca llega con state.newNote.
  // Limpiamos el state con replace para que recargar no cree otra nota.
  // La ref (que sobrevive al doble montaje de StrictMode) evita crear dos.
  const wantsNewNote = location.state?.newNote === true
  const handledNavRef = useRef(null)
  useEffect(() => {
    if (!wantsNewNote || handledNavRef.current === location.key) return
    handledNavRef.current = location.key
    navigate('.', { replace: true, state: null })
    createNote()
  }, [wantsNewNote, location.key, navigate, createNote])

  // Desde el rail: desplegar el menú y enfocar el buscador (una sola vez)
  const handleRailSearch = () => {
    setFocusSearch(true)
    setCollapsed(false)
  }

  // Atajo "/": muestra la barra lateral (en móvil, el cajón) y enfoca el buscador
  const focusNotesSearch = () => {
    setFocusMode(false)
    setFocusSearch(true)
    setCollapsed(false)
    if (!window.matchMedia('(min-width: 48rem)').matches) openMobile()
    requestAnimationFrame(() => document.getElementById('notes-search')?.focus())
  }

  // ─────────────────────────────────────────────────────────────
  // Atajos de la sección Notas.
  //   Alt+N: nueva nota (Ctrl+N lo reserva el navegador para "ventana nueva")
  //   /    : buscar          ?: ver atajos
  // "/" y "?" no se activan mientras escribes (en un campo o en el editor),
  // si no, no podrías escribir esos caracteres.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
    const onKey = (e) => {
      // Con una ventana abierta (p. ej. los atajos) el teclado es suyo: "/" no
      // debe sacar el foco hacia el buscador de detrás
      if (hasOpenModal()) return
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyN') {
        e.preventDefault()
        handleCreateNote()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (e.key === '/') { e.preventDefault(); focusNotesSearch() }
      else if (e.key === '?') { e.preventDefault(); setShowShortcuts(true) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const activeNote = notes.find((n) => n.id === activeNoteId)
  // useCallback: el diálogo la usa en un efecto; estable = no re-suscribe Esc
  const closeShortcuts = useCallback(() => setShowShortcuts(false), [])

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.meeting_date || '').toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const groups = useMemo(() => groupNotesByDate(filteredNotes), [filteredNotes])

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
      {/* Título de la pestaña: así se distinguen varias pestañas abiertas */}
      <Helmet>
        <title>{activeNote ? `${activeNote.title?.trim() || 'Sin título'} — MeetingNotes` : 'Notas — MeetingNotes'}</title>
      </Helmet>
      {showShortcuts && <ShortcutsDialog groups={NOTES_SHORTCUTS} onClose={closeShortcuts} />}
      {panelEl && createPortal(
        <NotesSidebarSection
          loading={loading}
          error={error}
          groups={groups}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleCreateNote={handleCreateNote}
          autoFocusSearch={focusSearch}
          onSearchFocus={() => setFocusSearch(false)}
          onSelectNote={closeMobile}
          onRetry={fetchNotes}
          onShowShortcuts={() => setShowShortcuts(true)}
        />,
        panelEl
      )}
      {railEl && createPortal(
        <NotesRailActions handleCreateNote={handleCreateNote} onSearch={handleRailSearch} />,
        railEl
      )}

      {!focusMode && <MobileTopBar
        action={
          <button
            onClick={handleCreateNote}
            aria-label="Nueva nota"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-accent-ink transition-all"
          >
            <Icon d={ICONS.plus} className="w-5 h-5" />
          </button>
        }
      />}

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

// ─────────────────────────────────────────────────────────────
// Pantalla sin nota abierta. Estilo plano: sin orbes decorativos ni
// iconos flotando (distraían y gastaban batería con animaciones infinitas).
// Las cifras van en tarjetas `card` sin efecto hover: no son botones, y un
// hover en algo que no se puede pulsar confunde.
// ─────────────────────────────────────────────────────────────
const STAT_ICONS = {
  today: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  week: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  total: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
}

function EmptyState({ stats, onCreateNote }) {
  const items = [
    { key: 'today', label: 'Hoy', value: stats.today },
    { key: 'week', label: 'Semana', value: stats.recent },
    { key: 'total', label: 'Total', value: stats.total },
  ]
  return (
    <div className="flex items-center justify-center h-full bg-canvas">
      <div className="text-center animate-scaleIn max-w-md px-6 py-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 bg-card rounded-2xl sm:rounded-3xl flex items-center justify-center border border-line">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-ink mb-2">Tus reuniones, organizadas</h1>
        <p className="text-ink-muted text-sm mb-6 sm:mb-8 leading-relaxed">
          Selecciona una nota del menú o crea una nueva para empezar.
        </p>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {items.map(({ key, label, value }) => (
            // dt (etiqueta) va antes que dd (valor) en el HTML, como exige <dl>;
            // order-last la pinta debajo de la cifra
            <div key={key} className="flex flex-col items-center bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-line">
              <dt className="order-last text-xs text-ink-muted mt-0.5">{label}</dt>
              <dd className="flex flex-col items-center text-lg sm:text-xl font-bold text-ink">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-accent-soft rounded-lg flex items-center justify-center mb-1.5 sm:mb-2" aria-hidden="true">
                  <Icon d={STAT_ICONS[key]} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                </span>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <Button onClick={onCreateNote} icon={<Icon d={ICONS.plus} />}>
          {stats.total > 0 ? 'Nueva nota' : 'Crear primera nota'}
        </Button>
      </div>
    </div>
  )
}
