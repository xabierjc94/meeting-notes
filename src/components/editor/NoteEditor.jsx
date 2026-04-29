import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabaseClient'
import { useNotes } from '../../context/NotesContext'
import { useDebounce } from '../../hooks/useDebounce'
import EditorToolbar from './EditorToolbar'

// ─────────────────────────────────────────────────────────────
// ARQUITECTURA: dos componentes en lugar de uno
//
// NoteEditor (exterior): carga los datos de Supabase.
//   Mientras carga, muestra un skeleton.
//
// EditorInner (interior): solo se monta cuando los datos ya están
//   disponibles. Así TipTap se inicializa con el contenido correcto
//   de forma síncrona, sin necesidad de actualizar el editor después.
//
// El parent (DashboardPage) usa key={activeNoteId} en <NoteEditor>,
// lo que hace que React desmonte y remonte el componente completo
// cada vez que cambias de nota. Limpio y sin efectos secundarios.
// ─────────────────────────────────────────────────────────────

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
          .select('*')     // Aquí sí necesitamos el content completo
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
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-red-500">Error al cargar la nota: {fetchError}</p>
    </div>
  )

  return <EditorInner initialData={initialData} />
}

// ─────────────────────────────────────────────────────────────
// EditorInner: el editor real, con datos ya disponibles
// ─────────────────────────────────────────────────────────────

function EditorInner({ initialData }) {
  const { updateNote, updateNoteLocal } = useNotes()
  const noteId = initialData.id

  const [title, setTitle] = useState(initialData.title || '')
  const [meetingDate, setMeetingDate] = useState(initialData.meeting_date || '')
  const [saveStatus, setSaveStatus] = useState('saved')

  // La función de guardado — el debounce la envuelve
  const save = async (changes) => {
    setSaveStatus('saving')
    try {
      await updateNote(noteId, changes)
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      console.error('Error guardando:', err.message)
    }
  }

  // debouncedSave: misma firma que save() pero espera 1s de inactividad
  const debouncedSave = useDebounce(save, 1000)

  // ─────────────────────────────────────────
  // Inicialización de TipTap
  // ─────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribe el contenido de la reunión...',
      }),
    ],
    // initialData.content es el JSON guardado previamente (o null para nota nueva)
    content: initialData.content,
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved')
      // Guardamos el JSON completo del editor — TipTap lo serializa automáticamente
      debouncedSave({ content: editor.getJSON() })
    },
  })

  // ─────────────────────────────────────────
  // Handlers de título y fecha
  // ─────────────────────────────────────────

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    // Actualizar sidebar inmediatamente (sin esperar a Supabase)
    updateNoteLocal(noteId, { title: val })
    setSaveStatus('unsaved')
    debouncedSave({ title: val })
  }

  const handleDateChange = (e) => {
    const val = e.target.value
    setMeetingDate(val)
    updateNoteLocal(noteId, { meeting_date: val || null })
    setSaveStatus('unsaved')
    debouncedSave({ meeting_date: val || null })
  }

  // Auto-altura en el textarea del título
  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  return (
    <div className="max-w-3xl mx-auto px-12 py-10">

      {/* Indicador de guardado */}
      <div className="flex justify-end mb-6 h-5">
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Título editable — textarea para auto-altura con múltiples líneas */}
      <textarea
        value={title}
        onChange={handleTitleChange}
        onInput={autoResize}
        placeholder="Sin título"
        rows={1}
        className="w-full text-[2rem] font-bold text-gray-900 bg-transparent
                   border-none outline-none resize-none leading-tight mb-4
                   placeholder-gray-300"
      />

      {/* Fecha de la reunión */}
      <div className="flex items-center gap-2 mb-8">
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input
          type="date"
          value={meetingDate}
          onChange={handleDateChange}
          className="text-sm text-gray-400 bg-transparent border-none outline-none
                     cursor-pointer hover:text-gray-600 transition-colors"
        />
        {!meetingDate && (
          <span className="text-sm text-gray-300">Añadir fecha de reunión</span>
        )}
      </div>

      {/* Toolbar + Editor */}
      <EditorToolbar editor={editor} />

      {/* ─────────────────────────────────────────
          EditorContent: donde se renderiza TipTap
          Las clases `prose` vienen de @tailwindcss/typography
          y dan estilo automático a h1, h2, p, ul, blockquote, code...
          ───────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        className="prose prose-gray prose-sm max-w-none min-h-[400px]
                   focus:outline-none
                   [&_.tiptap]:outline-none
                   [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300
                   [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                   [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
                   [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
                   [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componentes de UI auxiliares
// ─────────────────────────────────────────────────────────────

function SaveIndicator({ status }) {
  if (status === 'saved') return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
      Guardado
    </span>
  )
  if (status === 'saving') return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
      Guardando...
    </span>
  )
  if (status === 'unsaved') return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Sin guardar
    </span>
  )
  if (status === 'error') return (
    <span className="flex items-center gap-1.5 text-xs text-red-500">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Error al guardar
    </span>
  )
  return null
}

function EditorSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-12 py-10 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-4 bg-gray-100 rounded w-1/4 mb-10" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-4 bg-gray-100 rounded w-4/6" />
      </div>
    </div>
  )
}