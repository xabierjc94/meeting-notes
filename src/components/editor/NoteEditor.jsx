import { useState, useEffect, useRef } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { supabase } from '../../lib/supabaseClient'
import { useNotes } from '../../context/NotesContext'
import { useAppSidebar } from '../layout/AppSidebarContext'
import { useAutosave } from '../../hooks/useAutosave'
import { draftKey, readDraft, writeDraft, clearDraft, sameJson } from '../../lib/drafts'
import EditorToolbar from './EditorToolbar'
import DatePicker from '../ui/DatePicker'
import { noteToMarkdown, noteToHtml } from '../../lib/noteMarkdown'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: "stale-while-revalidate" (enseña lo guardado, comprueba por detrás)
//
// Si la nota está en la caché, se pinta al instante. A la vez pedimos
// la versión del servidor: si es más nueva (se editó en otro
// dispositivo) y aún no has tocado nada, la cambiamos. Si ya has
// escrito, no la pisamos: tu texto manda.
// ─────────────────────────────────────────────────────────────
export default function NoteEditor({ noteId }) {
  const { getCachedNote, cacheNote } = useNotes()
  const [cached] = useState(() => getCachedNote(noteId))
  const [initialData, setInitialData] = useState(cached ?? null)
  const [version, setVersion] = useState(0)
  const [fetchError, setFetchError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const editedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const fetchNote = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single()

        if (error) throw error
        if (cancelled) return
        const current = getCachedNote(noteId)
        const serverIsNewer = !current || Date.parse(data.updated_at) > Date.parse(current.updated_at)
        if (!serverIsNewer) return
        cacheNote(data)
        if (!current) {
          setInitialData(data)
        } else if (!editedRef.current) {
          setInitialData(data)
          setVersion(v => v + 1) // remonta el editor con la versión nueva
        }
      } catch (err) {
        // Con copia en caché (p. ej. una nota recién creada cuyo INSERT
        // aún no ha llegado) el error no impide seguir escribiendo
        if (!cancelled && !getCachedNote(noteId)) {
          console.error('Error cargando la nota:', err.message)
          setFetchError(err.message)
        }
      }
    }
    fetchNote()
    return () => { cancelled = true }
  }, [noteId, getCachedNote, cacheNote, attempt])

  const loading = !initialData && !fetchError

  if (loading) return <EditorSkeleton />
  if (fetchError) return (
    <div className="flex items-center justify-center h-full bg-slate-950">
      <div className="text-center animate-scaleIn">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-red-300 font-medium">No hemos podido abrir la nota</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Puede ser la conexión. Tu contenido no se ha perdido: vuelve a intentarlo.</p>
        <button
          onClick={() => { setFetchError(null); setAttempt(a => a + 1) }}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <EditorInner
      key={version}
      initialData={initialData}
      onEdit={() => { editedRef.current = true }}
    />
  )
}

// Compara el borrador local con lo que hay en el servidor y decide:
//   'none'     → no hay borrador
//   'discard'  → el borrador coincide con el servidor (ya se guardó)
//   'auto'     → el borrador es más nuevo: se recupera solo
//   'conflict' → la nota cambió después en otro sitio: preguntamos
function planRecovery(initialData, key, conflictKey) {
  const draft = readDraft(key)
  if (draft?.changes) {
    const changes = {}
    for (const [field, value] of Object.entries(draft.changes)) {
      const server = initialData[field]
      const same = field === 'content' ? sameJson(value, server) : (value || null) === (server || null)
      if (!same) changes[field] = value
    }
    if (Object.keys(changes).length === 0) return { type: 'discard', changes, draft }
    const serverTime = Date.parse(initialData.updated_at) || 0
    const draftTime = Date.parse(draft.ts) || 0
    return { type: draftTime >= serverTime ? 'auto' : 'conflict', changes, draft }
  }
  const conflict = readDraft(conflictKey)
  if (conflict?.changes) return { type: 'conflict', changes: conflict.changes, draft: null }
  return { type: 'none', changes: {}, draft: null }
}

// Solo los campos que se ven en la lista lateral
function listFields(changes) {
  const out = {}
  if ('title' in changes) out.title = changes.title
  if ('meeting_date' in changes) out.meeting_date = changes.meeting_date
  return out
}

function EditorInner({ initialData, onEdit }) {
  const { updateNote, updateNoteLocal } = useNotes()
  const { focusMode, setFocusMode } = useAppSidebar()
  const noteId = initialData.id
  const key = draftKey('note', noteId)
  const conflictKey = draftKey('note-conflict', noteId)

  const [recovery] = useState(() => planRecovery(initialData, key, conflictKey))
  const restored = recovery.type === 'auto' ? recovery.changes : {}

  const [title, setTitle] = useState(restored.title ?? initialData.title ?? '')
  const [meetingDate, setMeetingDate] = useState(
    ('meeting_date' in restored ? restored.meeting_date : initialData.meeting_date) || ''
  )
  const [isTitleFocused, setIsTitleFocused] = useState(false)
  const [notice, setNotice] = useState(
    recovery.type === 'auto' ? 'recovered' : recovery.type === 'conflict' ? 'conflict' : null
  )

  // Un único guardado que ACUMULA título, fecha y contenido (antes se
  // pisaban entre ellos) y deja copia local mientras no se confirma
  const { status: saveStatus, queue, retryNow } = useAutosave({
    save: (changes) => updateNote(noteId, changes),
    delay: 1000,
    draftKey: key,
  })

  // Toda edición avisa al padre (para no pisarla con una versión del
  // servidor que llegue después) y se encola para guardarse
  const edit = (changes) => {
    onEdit?.()
    queue(changes)
  }

  // Al abrir la nota, aplicamos la decisión de recuperación una sola vez
  const recoveryHandled = useRef(false)
  useEffect(() => {
    if (recoveryHandled.current) return
    recoveryHandled.current = true
    if (recovery.type === 'discard') {
      clearDraft(key)
    } else if (recovery.type === 'auto') {
      updateNoteLocal(noteId, listFields(recovery.changes))
      onEdit?.()
      queue(recovery.changes)
    } else if (recovery.type === 'conflict' && recovery.draft) {
      // Apartamos la copia en otra clave para que lo que se escriba
      // ahora no la sobrescriba mientras el usuario decide
      writeDraft(conflictKey, recovery.draft)
      clearDraft(key)
    }
  }, [recovery, key, conflictKey, noteId, queue, updateNoteLocal, onEdit])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribe el contenido de la reunión...',
      }),
      // Casillas de acciones: escribe "[ ] " al empezar una línea o Ctrl+Shift+9
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: 'content' in restored ? restored.content : initialData.content,
    onUpdate: ({ editor }) => {
      edit({ content: editor.getJSON() })
    },
  })

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    updateNoteLocal(noteId, { title: val })
    edit({ title: val })
  }

  const handleDateChange = (val) => {
    setMeetingDate(val)
    updateNoteLocal(noteId, { meeting_date: val || null })
    edit({ meeting_date: val || null })
  }

  const applyLocalCopy = () => {
    const { changes } = recovery
    if ('title' in changes) setTitle(changes.title ?? '')
    if ('meeting_date' in changes) setMeetingDate(changes.meeting_date || '')
    // setContent dispara onUpdate, que a su vez encola el contenido
    if ('content' in changes && editor) editor.commands.setContent(changes.content)
    updateNoteLocal(noteId, listFields(changes))
    edit(changes)
    clearDraft(conflictKey)
    setNotice(null)
  }

  const discardLocalCopy = () => {
    clearDraft(conflictKey)
    setNotice(null)
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  // ── Copiar: Markdown (texto plano) + HTML a la vez. Cada app pega el
  //    formato que entiende: Gmail/Slack/Docs el HTML; un .md o GitHub el texto.
  const [copyState, setCopyState] = useState(null)
  const handleCopy = async () => {
    if (!editor) return
    const md = noteToMarkdown({ title, meetingDate, content: editor.getJSON() })
    const html = noteToHtml({ title, meetingDate, bodyHtml: editor.getHTML() })
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': new Blob([md], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        })])
      } else {
        await navigator.clipboard.writeText(md)
      }
      setCopyState('ok')
    } catch {
      setCopyState('error')
    }
    setTimeout(() => setCopyState(null), 2000)
  }

  // ── Imprimir / PDF: pintamos una copia de la nota directamente en <body>
  //    (createPortal) y el CSS de impresión oculta todo lo demás. Así el
  //    PDF sale con texto real (seleccionable), no una foto de la pantalla.
  //    flushSync obliga a React a pintarla ANTES de abrir el diálogo.
  const [printing, setPrinting] = useState(false)
  const handlePrint = () => {
    if (!editor) return
    const done = () => {
      setPrinting(false)
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    flushSync(() => setPrinting(true))
    window.print()
  }

  // Ctrl+P (Cmd+P en Mac) imprime la nota, no la pantalla de la app
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handlePrint()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const headerAction = 'shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors'

  return (
    <div className="animate-fadeIn">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-3 sm:py-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <textarea
                value={title}
                onChange={handleTitleChange}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
                onInput={autoResize}
                placeholder="Sin título"
                rows={1}
                className="w-full text-xl sm:text-[1.75rem] font-bold text-white bg-transparent
                           border-none outline-none resize-none leading-tight
                           placeholder-white/40 transition-colors duration-200"
              />
            </div>
            <div className="shrink-0 pt-1 sm:pt-2">
              <SaveIndicator status={saveStatus} onRetry={retryNow} />
            </div>
          </div>

          {/* Fecha + acciones (copiar, imprimir, modo foco) */}
          <div className="flex items-center gap-1 sm:gap-2 mt-2 sm:mt-3">
            <DatePicker
              value={meetingDate}
              onChange={handleDateChange}
              placeholder="Fecha de reunión"
            />
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar la nota (con formato y como Markdown)"
              aria-label="Copiar la nota"
              className={`ml-auto ${headerAction}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {copyState === 'ok'
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
              </svg>
              <span className="hidden sm:inline" aria-live="polite">
                {copyState === 'ok' ? 'Copiada' : copyState === 'error' ? 'No se pudo copiar' : 'Copiar'}
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              title="Imprimir o guardar como PDF (Ctrl+P)"
              aria-label="Imprimir o guardar como PDF"
              className={headerAction}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setFocusMode(!focusMode)}
              aria-pressed={focusMode}
              aria-label={focusMode ? 'Salir del modo foco' : 'Modo foco'}
              title={focusMode ? 'Salir del modo foco (Esc)' : 'Modo foco: oculta el menú lateral'}
              className={headerAction}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {focusMode
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />}
              </svg>
              <span className="hidden lg:inline">{focusMode ? 'Salir del modo foco' : 'Modo foco'}</span>
            </button>
          </div>

          {notice === 'recovered' && (
            <RecoveryNotice onClose={() => setNotice(null)}>
              Hemos recuperado cambios de esta nota que no llegaron a guardarse.
            </RecoveryNotice>
          )}
          {notice === 'conflict' && (
            <RecoveryNotice
              actions={
                <>
                  <button onClick={applyLocalCopy} className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-semibold hover:bg-amber-300 transition-colors">
                    Usar la copia de este dispositivo
                  </button>
                  <button onClick={discardLocalCopy} className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 font-semibold hover:bg-white/20 transition-colors">
                    Descartarla
                  </button>
                </>
              }
            >
              Este dispositivo tiene cambios sin guardar de esta nota, pero la nota se modificó después en otro sitio.
            </RecoveryNotice>
          )}

          {/* La barra de formato vive en la cabecera fija: así no se pierde
              al bajar por una nota larga (ni con el teclado del móvil abierto) */}
          <div className="mt-3">
            <EditorToolbar editor={editor} />
          </div>
        </div>
      </div>

      {/* Editor area */}
      {/* max-w-2xl + texto de 16px: unos 70-75 caracteres por línea, lo cómodo para leer */}
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4 sm:py-8 bg-slate-950 min-h-[calc(100%-6rem)]">

        <EditorContent
          editor={editor}
          className="prose prose-invert prose-base max-w-none min-h-[400px]
                     focus:outline-none
                     [&_.tiptap_ul[data-type=taskList]]:list-none [&_.tiptap_ul[data-type=taskList]]:pl-0
                     [&_.tiptap_ul[data-type=taskList]>li]:flex [&_.tiptap_ul[data-type=taskList]>li]:items-start [&_.tiptap_ul[data-type=taskList]>li]:gap-2 [&_.tiptap_ul[data-type=taskList]>li]:pl-0
                     [&_.tiptap_ul[data-type=taskList]>li>label]:mt-[0.4em] [&_.tiptap_ul[data-type=taskList]>li>div]:flex-1
                     [&_.tiptap_ul[data-type=taskList]>li_p]:my-0
                     [&_.tiptap_li[data-checked=true]>div]:line-through [&_.tiptap_li[data-checked=true]>div]:text-slate-400
                     [&_.tiptap_input[type=checkbox]]:w-4 [&_.tiptap_input[type=checkbox]]:h-4 [&_.tiptap_input[type=checkbox]]:accent-violet-500 [&_.tiptap_input[type=checkbox]]:cursor-pointer
                     [&_.tiptap]:outline-none
                     [&_.tiptap_p.is-editor-empty:first-child::before]:text-white/50
                     [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                     [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
                     [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
                     [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>

      {printing && editor && createPortal(
        // Solo existe mientras dura la impresión. El HTML sale del editor
        // (ProseMirror solo serializa nodos de su esquema, el texto va escapado)
        <div
          className="note-print-area"
          dangerouslySetInnerHTML={{ __html: noteToHtml({ title, meetingDate, bodyHtml: editor.getHTML() }) }}
        />,
        document.body
      )}
    </div>
  )
}

function SaveIndicator({ status, onRetry }) {
  if (status === 'saved') return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
      Guardado
    </span>
  )
  if (status === 'saving') return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
      <span className="w-3 h-3 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
      Guardando...
    </span>
  )
  if (status === 'unsaved') return (
    <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
      Sin guardar
    </span>
  )
  if (status === 'offline') return (
    <span role="status" className="flex items-center gap-1.5 text-xs text-amber-400 font-medium text-right">
      <span className="w-2 h-2 shrink-0 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
      Sin conexión · copia en este dispositivo
    </span>
  )
  if (status === 'error') return (
    <span role="status" className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
      <span className="w-2 h-2 shrink-0 rounded-full bg-red-400 shadow-sm shadow-red-400/50" />
      No se pudo guardar
      <button onClick={onRetry} className="underline underline-offset-2 hover:text-red-300">
        Reintentar
      </button>
    </span>
  )
  return null
}

function RecoveryNotice({ children, actions, onClose }) {
  return (
    <div role="status" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
      <span className="flex-1 min-w-48">{children}</span>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      {onClose && (
        <button onClick={onClose} aria-label="Cerrar aviso" className="w-6 h-6 flex items-center justify-center rounded-md text-amber-200 hover:bg-amber-500/20">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="animate-pulse bg-slate-950 h-full">
      <div className="sticky top-0 bg-slate-950 border-b border-white/10 px-4 sm:px-10 py-3 sm:py-4">
        <div className="h-8 sm:h-10 bg-white/5 rounded-xl w-2/3 mb-3" />
        <div className="h-8 sm:h-9 bg-white/5 rounded-xl w-1/4" />
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="h-10 bg-white/5 rounded-xl mb-6" />
        <div className="space-y-3">
          <div className="h-4 bg-white/5 rounded-lg w-full" />
          <div className="h-4 bg-white/5 rounded-lg w-5/6" />
          <div className="h-4 bg-white/5 rounded-lg w-4/6" />
        </div>
      </div>
    </div>
  )
}
