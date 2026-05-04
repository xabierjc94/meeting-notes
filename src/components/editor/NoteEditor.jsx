import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../../lib/supabaseClient'
import { useNotes } from '../../context/NotesContext'
import { useDebounce } from '../../hooks/useDebounce'
import EditorToolbar from './EditorToolbar'

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
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="text-center animate-scaleIn">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
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

function EditorInner({ initialData }) {
  const { updateNote, updateNoteLocal } = useNotes()
  const noteId = initialData.id

  const [title, setTitle] = useState(initialData.title || '')
  const [meetingDate, setMeetingDate] = useState(initialData.meeting_date || '')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [isTitleFocused, setIsTitleFocused] = useState(false)

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

  const debouncedSave = useDebounce(save, 1000)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribe el contenido de la reunión...',
      }),
    ],
    content: initialData.content,
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved')
      debouncedSave({ content: editor.getJSON() })
    },
  })

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
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

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  return (
    <div className="animate-fadeIn">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
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
                className="w-full text-xl sm:text-[1.75rem] font-bold text-slate-900 bg-transparent
                           border-none outline-none resize-none leading-tight
                           placeholder-slate-200 transition-colors duration-200"
              />
            </div>
            <div className="shrink-0 pt-1 sm:pt-2">
              <SaveIndicator status={saveStatus} />
            </div>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2 mt-2 sm:mt-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${
              meetingDate ? 'bg-violet-50 border border-violet-200/50' : 'bg-transparent border border-transparent'
            }`}>
              <svg className={`w-4 h-4 shrink-0 transition-colors ${meetingDate ? 'text-violet-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={meetingDate}
                onChange={handleDateChange}
                className={`text-sm bg-transparent border-none outline-none cursor-pointer transition-colors ${
                  meetingDate ? 'text-violet-600' : 'text-slate-300 hover:text-slate-500'
                }`}
              />
              {!meetingDate && (
                <span className="text-sm text-slate-300">Fecha de reunión</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8">
        <EditorToolbar editor={editor} />

        <EditorContent
          editor={editor}
          className="prose prose-slate prose-sm max-w-none min-h-[400px]
                     focus:outline-none
                     [&_.tiptap]:outline-none
                     [&_.tiptap_p.is-editor-empty:first-child::before]:text-slate-300
                     [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                     [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
                     [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
                     [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>
    </div>
  )
}

function SaveIndicator({ status }) {
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
  if (status === 'error') return (
    <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
      <span className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/50" />
      Error al guardar
    </span>
  )
  return null
}

function EditorSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 bg-white border-b border-slate-100 px-4 sm:px-10 py-3 sm:py-4">
        <div className="h-8 sm:h-10 bg-slate-100 rounded-xl w-2/3 mb-3" />
        <div className="h-8 sm:h-9 bg-slate-50 rounded-xl w-1/4" />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-4 sm:py-8">
        <div className="h-10 bg-slate-50 rounded-xl mb-6" />
        <div className="space-y-3">
          <div className="h-4 bg-slate-50 rounded-lg w-full" />
          <div className="h-4 bg-slate-50 rounded-lg w-5/6" />
          <div className="h-4 bg-slate-50 rounded-lg w-4/6" />
        </div>
      </div>
    </div>
  )
}
