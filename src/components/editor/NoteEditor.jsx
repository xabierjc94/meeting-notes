import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabaseClient'
import { useNotes } from '../../context/NotesContext'
import { useAutosave } from '../../hooks/useAutosave'
import { draftKey, readDraft, writeDraft, clearDraft, sameJson } from '../../lib/drafts'
import EditorToolbar from './EditorToolbar'
import DatePicker from '../ui/DatePicker'

export default function NoteEditor({ noteId }) {
  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single()

        if (error) throw error
        setInitialData(data)
      } catch (err) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchNote()
  }, [noteId])

  if (loading) return <EditorSkeleton />
  if (fetchError) return (
    <div className="flex items-center justify-center h-full bg-slate-950">
      <div className="text-center animate-scaleIn">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-red-500 font-medium">Error al cargar la nota</p>
        <p className="text-xs text-slate-400 mt-1">{fetchError}</p>
      </div>
    </div>
  )

  return <EditorInner initialData={initialData} />
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

function EditorInner({ initialData }) {
  const { updateNote, updateNoteLocal } = useNotes()
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

  // Al abrir la nota, aplicamos la decisión de recuperación una sola vez
  const recoveryHandled = useRef(false)
  useEffect(() => {
    if (recoveryHandled.current) return
    recoveryHandled.current = true
    if (recovery.type === 'discard') {
      clearDraft(key)
    } else if (recovery.type === 'auto') {
      updateNoteLocal(noteId, listFields(recovery.changes))
      queue(recovery.changes)
    } else if (recovery.type === 'conflict' && recovery.draft) {
      // Apartamos la copia en otra clave para que lo que se escriba
      // ahora no la sobrescriba mientras el usuario decide
      writeDraft(conflictKey, recovery.draft)
      clearDraft(key)
    }
  }, [recovery, key, conflictKey, noteId, queue, updateNoteLocal])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribe el contenido de la reunión...',
      }),
    ],
    content: 'content' in restored ? restored.content : initialData.content,
    onUpdate: ({ editor }) => {
      queue({ content: editor.getJSON() })
    },
  })

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    updateNoteLocal(noteId, { title: val })
    queue({ title: val })
  }

  const handleDateChange = (val) => {
    setMeetingDate(val)
    updateNoteLocal(noteId, { meeting_date: val || null })
    queue({ meeting_date: val || null })
  }

  const applyLocalCopy = () => {
    const { changes } = recovery
    if ('title' in changes) setTitle(changes.title ?? '')
    if ('meeting_date' in changes) setMeetingDate(changes.meeting_date || '')
    // setContent dispara onUpdate, que a su vez encola el contenido
    if ('content' in changes && editor) editor.commands.setContent(changes.content)
    updateNoteLocal(noteId, listFields(changes))
    queue(changes)
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

  return (
    <div className="animate-fadeIn">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-10 py-3 sm:py-4">
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

          {/* Date picker */}
          <div className="flex items-center gap-2 mt-2 sm:mt-3">
            <DatePicker
              value={meetingDate}
              onChange={handleDateChange}
              placeholder="Fecha de reunión"
            />
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
        </div>
      </div>

      {/* Editor area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8 bg-slate-950 min-h-[calc(100%-6rem)]">
        <EditorToolbar editor={editor} />

        <EditorContent
          editor={editor}
          className="prose prose-invert prose-sm max-w-none min-h-[400px]
                     focus:outline-none
                     [&_.tiptap]:outline-none
                     [&_.tiptap_p.is-editor-empty:first-child::before]:text-white/50
                     [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                     [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
                     [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
                     [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8">
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
