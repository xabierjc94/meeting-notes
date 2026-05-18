import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle, Color, FontFamily, FontSize, LineHeight } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Image } from '@tiptap/extension-image'
import { CharacterCount } from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import { supabase } from '../../lib/supabaseClient'
import { useBiblioteca } from '../../context/BibliotecaContext'
import { useDebounce } from '../../hooks/useDebounce'
import DocumentToolbar from './DocumentToolbar'

const PRINT_STYLES = `
@media print {
  body > * { display: none !important; }
  .doc-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
  .doc-print-area .ProseMirror { padding: 2cm !important; }
}
`

export default function DocumentEditor({ docId, onBack }) {
  const [initialData, setInitialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const { data, error } = await supabase
          .from('biblioteca')
          .select('*')
          .eq('id', docId)
          .single()
        if (error) throw error
        setInitialData(data)
      } catch (err) {
        setFetchError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [docId])

  if (loading) return <EditorSkeleton />
  if (fetchError) return (
    <div className="flex items-center justify-center h-full bg-[#f0f0f0]">
      <div className="text-center bg-white p-8 rounded-xl shadow">
        <p className="text-sm text-red-500 font-medium">Error al cargar el documento</p>
        <p className="text-xs text-slate-400 mt-1">{fetchError}</p>
      </div>
    </div>
  )

  return <DocumentEditorInner initialData={initialData} onBack={onBack} />
}

function DocumentEditorInner({ initialData, onBack }) {
  const { updateDocumento, updateDocumentoLocal } = useBiblioteca()
  const docId = initialData.id
  const isHtmlImport = initialData.content?.type === 'html_import'
  const printAreaRef = useRef(null)

  const [title, setTitle] = useState(initialData.title || '')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [exporting, setExporting] = useState(false)
  const [exportingWord, setExportingWord] = useState(false)
  const [openingWord, setOpeningWord] = useState(false)
  const [wordError, setWordError] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [showFind, setShowFind] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [spellCheck, setSpellCheck] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [bubbleLinkMode, setBubbleLinkMode] = useState(false)
  const [bubbleLinkUrl, setBubbleLinkUrl] = useState('')

  const save = useCallback(async (changes) => {
    setSaveStatus('saving')
    try {
      await updateDocumento(docId, changes)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [docId, updateDocumento])

  const debouncedSave = useDebounce(save, 800)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Empieza a escribir...' }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Image.configure({ inline: false }),
      CharacterCount,
      Typography,
    ],
    content: isHtmlImport ? initialData.content.html : (initialData.content || ''),
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved')
      debouncedSave({ content: editor.getJSON() })
    },
    onCreate: ({ editor }) => {
      if (isHtmlImport) save({ content: editor.getJSON() })
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[900px]',
        style: 'font-family: Calibri, sans-serif; font-size: 12pt; line-height: 1.5; color: #000;',
      },
    },
  })

  // Sync spellCheck with the ProseMirror DOM element
  useEffect(() => {
    if (!editor) return
    const el = editor.view.dom
    if (el) el.spellcheck = spellCheck
  }, [editor, spellCheck])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); handlePrint() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowFind(v => !v) }
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(v => !v) }
      if (e.key === 'Escape' && focusMode) setFocusMode(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [focusMode])

  const handlePrint = () => window.print()

  const handleExportWord = async () => {
    if (!editor) return
    setExportingWord(true)
    try {
      const HTMLtoDOCX = (await import('html-to-docx')).default
      const html = `<!DOCTYPE html><html><body>${editor.getHTML()}</body></html>`
      const blob = await HTMLtoDOCX(html, null, {
        table: { row: { cantSplit: true } },
        footer: false,
        pageNumber: false,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'documento'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exportando Word:', err)
    } finally {
      setExportingWord(false)
    }
  }

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      const pageEl = printAreaRef.current
      if (!pageEl) return
      const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      const pageH = pdf.internal.pageSize.getHeight()
      let y = 0
      while (y < pdfH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH)
        y += pageH
      }
      pdf.save(`${title || 'documento'}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    updateDocumentoLocal(docId, { title: val })
    setSaveStatus('unsaved')
    debouncedSave({ title: val })
  }

  const handleOpenInWord = async () => {
    if (!editor) return
    setOpeningWord(true)
    setWordError(null)
    try {
      const HTMLtoDOCX = (await import('html-to-docx')).default
      const html = `<!DOCTYPE html><html><body>${editor.getHTML()}</body></html>`
      const blob = await HTMLtoDOCX(html, null, { table: { row: { cantSplit: true } }, footer: false, pageNumber: false })
      const fileName = `${docId}.docx`
      const { error: uploadError } = await supabase.storage
        .from('biblioteca-docs')
        .upload(fileName, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })
      if (uploadError) throw uploadError
      await updateDocumento(docId, { storage_path: fileName })
      const { data: { publicUrl } } = supabase.storage.from('biblioteca-docs').getPublicUrl(fileName)
      window.location.href = `ms-word:ofe|u|${publicUrl}`
    } catch (err) {
      console.error('Error abriendo en Word:', err)
      setWordError(err.message || 'Error al abrir en Word.')
    } finally {
      setOpeningWord(false)
    }
  }

  const handleReplace = () => {
    if (!editor || !findText) return
    const content = editor.getText()
    if (!content.includes(findText)) return
    const html = editor.getHTML().replaceAll(findText, replaceText)
    editor.commands.setContent(html)
    debouncedSave({ content: editor.getJSON() })
  }

  const wordCount = editor ? editor.storage.characterCount?.words() ?? 0 : 0
  const charCount = editor ? editor.storage.characterCount?.characters() ?? 0 : 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className={`flex flex-col h-full overflow-hidden transition-colors duration-300 ${focusMode ? 'bg-[#111827]' : 'bg-[#f0f0f0]'}`}>

        {/* ── Barra de título ── */}
        {!focusMode ? (
          <div className="bg-[#2b579a] px-4 py-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium shrink-0 hover:bg-white/10 px-2 py-1 rounded-lg transition-all"
                  title="Volver a documentos"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Documentos
                </button>
              )}
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder="Sin título"
                className="bg-transparent text-white text-sm font-medium outline-none placeholder-white/40 flex-1 min-w-0"
              />
              {initialData.file_name && (
                <span className="text-white/40 text-xs truncate hidden sm:block">({initialData.file_name})</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SaveIndicator status={saveStatus} />
              {/* Focus mode toggle */}
              <button
                onClick={() => setFocusMode(true)}
                title="Modo enfoque (F11)"
                className="text-white/60 hover:text-white text-xs hover:bg-white/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
                </svg>
                <span className="hidden sm:inline">Enfocar</span>
              </button>
              {/* Zoom */}
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))}
                  className="text-white/60 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10">−</button>
                <span className="text-white/70 text-xs w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 10))}
                  className="text-white/60 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10">+</button>
              </div>
            </div>
          </div>
        ) : (
          /* Focus mode minimal header */
          <div className="bg-black/50 backdrop-blur px-6 py-2 flex items-center justify-between shrink-0 border-b border-white/5">
            <span className="text-white/50 text-sm font-medium truncate">{title || 'Sin título'}</span>
            <div className="flex items-center gap-3">
              <SaveIndicator status={saveStatus} />
              <button
                onClick={() => setFocusMode(false)}
                title="Salir del modo enfoque (ESC)"
                className="text-white/40 hover:text-white/80 text-xs flex items-center gap-1.5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5-5M4 4l5 5M15 9l5-5m0 0l-5-5m5 5l-5 5M9 15l-5 5m0 0l5 5m-5-5l5-5M15 15l5 5m0 0l-5 5m5-5l-5-5" />
                </svg>
                ESC
              </button>
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
        {!focusMode && (
          <div className="shrink-0">
            <DocumentToolbar
              editor={editor}
              onExportPdf={handleExportPdf}
              exporting={exporting}
              onExportWord={handleExportWord}
              exportingWord={exportingWord}
              onOpenInWord={handleOpenInWord}
              openingWord={openingWord}
              onPrint={handlePrint}
              spellCheck={spellCheck}
              onToggleSpellCheck={() => setSpellCheck(v => !v)}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode(v => !v)}
            />
          </div>
        )}

        {/* ── Error Word ── */}
        {wordError && !focusMode && (
          <div className="shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-red-600">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>No se pudo abrir Word:</strong> {wordError}</span>
            </div>
            <button onClick={() => setWordError(null)} className="text-red-400 hover:text-red-600 ml-3 shrink-0">✕</button>
          </div>
        )}

        {/* ── Panel Buscar / Reemplazar ── */}
        {showFind && !focusMode && (
          <div className="shrink-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-yellow-800">Buscar:</span>
            <input value={findText} onChange={e => setFindText(e.target.value)}
              placeholder="Texto a buscar..." autoFocus
              className="text-xs border border-yellow-300 rounded px-2 py-1 outline-none focus:border-yellow-500 w-36" />
            <span className="text-xs font-semibold text-yellow-800">Reemplazar:</span>
            <input value={replaceText} onChange={e => setReplaceText(e.target.value)}
              placeholder="Reemplazar por..."
              className="text-xs border border-yellow-300 rounded px-2 py-1 outline-none focus:border-yellow-500 w-36" />
            <button onClick={handleReplace}
              className="text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 font-medium">
              Reemplazar todo
            </button>
            <button onClick={() => setShowFind(false)}
              className="text-xs text-yellow-700 hover:text-yellow-900 ml-auto">✕ Cerrar</button>
          </div>
        )}

        {/* ── Regla ── */}
        {!focusMode && <Ruler />}

        {/* ── BubbleMenu flotante al seleccionar texto ── */}
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 120, placement: 'top', maxWidth: 'none' }}
            shouldShow={({ editor, view, state, from, to }) => {
              return from !== to && !editor.isActive('image') && !editor.isActive('table')
            }}
          >
            <BubbleToolbar
              editor={editor}
              bubbleLinkMode={bubbleLinkMode}
              setBubbleLinkMode={setBubbleLinkMode}
              bubbleLinkUrl={bubbleLinkUrl}
              setBubbleLinkUrl={setBubbleLinkUrl}
            />
          </BubbleMenu>
        )}

        {/* ── Área del documento ── */}
        <div className={`flex-1 overflow-y-auto py-8 transition-colors duration-300 ${focusMode ? 'bg-[#111827]' : 'bg-[#e8e8e8]'}`}>
          <div
            ref={printAreaRef}
            className="doc-print-area mx-auto bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2),0_4px_20px_rgba(0,0,0,0.12)]"
            style={{
              width: '794px',
              maxWidth: '98%',
              minHeight: '1123px',
              padding: '96px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              marginBottom: zoom < 100 ? `${(1 - zoom / 100) * -1123}px` : '40px',
            }}
          >
            <EditorContent
              editor={editor}
              className="
                prose prose-sm max-w-none
                [&_.tiptap]:outline-none
                [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-300
                [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
                [&_.tiptap_p.is-editor-empty:first-child::before]:float-left
                [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none
                [&_.tiptap_p.is-editor-empty:first-child::before]:h-0
                [&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mb-4 [&_.tiptap_h1]:mt-6
                [&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:mt-5
                [&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:mt-4
                [&_.tiptap_h4]:text-base [&_.tiptap_h4]:font-semibold [&_.tiptap_h4]:mb-2 [&_.tiptap_h4]:mt-3
                [&_.tiptap_p]:mb-2 [&_.tiptap_p]:leading-relaxed
                [&_.tiptap_table]:border-collapse [&_.tiptap_table]:w-full [&_.tiptap_table]:my-4
                [&_.tiptap_td]:border [&_.tiptap_td]:border-gray-400 [&_.tiptap_td]:p-2 [&_.tiptap_td]:min-w-[2rem] [&_.tiptap_td]:align-top
                [&_.tiptap_th]:border [&_.tiptap_th]:border-gray-400 [&_.tiptap_th]:p-2 [&_.tiptap_th]:bg-gray-100 [&_.tiptap_th]:font-semibold
                [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-blue-400 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:text-gray-600 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:my-4
                [&_.tiptap_pre]:bg-gray-100 [&_.tiptap_pre]:rounded [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:font-mono [&_.tiptap_pre]:text-sm [&_.tiptap_pre]:my-3
                [&_.tiptap_code]:bg-gray-100 [&_.tiptap_code]:px-1 [&_.tiptap_code]:rounded [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-sm
                [&_.tiptap_hr]:border-gray-300 [&_.tiptap_hr]:my-6
                [&_.tiptap_a]:text-blue-600 [&_.tiptap_a]:underline [&_.tiptap_a]:cursor-pointer
                [&_.tiptap_img]:max-w-full [&_.tiptap_img]:rounded
                [&_.tiptap_ul[data-type=taskList]]:list-none [&_.tiptap_ul[data-type=taskList]]:pl-0
                [&_.tiptap_li[data-type=taskItem]]:flex [&_.tiptap_li[data-type=taskItem]]:gap-2 [&_.tiptap_li[data-type=taskItem]]:items-start [&_.tiptap_li[data-type=taskItem]]:my-1
                [&_.tiptap_li[data-type=taskItem]>label]:flex [&_.tiptap_li[data-type=taskItem]>label]:items-center [&_.tiptap_li[data-type=taskItem]>label]:gap-1.5 [&_.tiptap_li[data-type=taskItem]>label>input]:mt-0.5
              "
            />
          </div>
        </div>

        {/* ── Barra de estado inferior ── */}
        {!focusMode ? (
          <div className="shrink-0 bg-[#2b579a] px-4 py-1 flex items-center justify-between text-xs text-white/70">
            <div className="flex items-center gap-4">
              <span>Palabras: <span className="text-white font-medium">{wordCount.toLocaleString()}</span></span>
              <span>Caracteres: <span className="text-white font-medium">{charCount.toLocaleString()}</span></span>
              <span className="hidden sm:inline">Lectura: <span className="text-white font-medium">~{readingTime} min</span></span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFind(v => !v)} className="hover:text-white transition-colors" title="Buscar y reemplazar (Ctrl+F)">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
              <span className="opacity-30">|</span>
              <button onClick={handlePrint} className="hover:text-white transition-colors" title="Imprimir (Ctrl+P)">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
              </button>
              <span className="opacity-30">|</span>
              <button
                onClick={() => setFocusMode(true)}
                className="hover:text-white transition-colors"
                title="Modo enfoque (F11)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-black/40 px-6 py-1.5 flex items-center justify-center text-xs text-white/25">
            {wordCount.toLocaleString()} palabras · {charCount.toLocaleString()} caracteres · ~{readingTime} min lectura · <kbd className="ml-1 px-1 py-0.5 bg-white/10 rounded text-[10px]">ESC</kbd>&nbsp;para salir
          </div>
        )}
      </div>
    </>
  )
}

/* ─── BubbleMenu Toolbar ─── */
function BubbleToolbar({ editor, bubbleLinkMode, setBubbleLinkMode, bubbleLinkUrl, setBubbleLinkUrl }) {
  const inputRef = useRef(null)

  const applyLink = () => {
    if (bubbleLinkUrl) editor.chain().focus().setLink({ href: bubbleLinkUrl }).run()
    else editor.chain().focus().unsetLink().run()
    setBubbleLinkMode(false)
    setBubbleLinkUrl('')
  }

  useEffect(() => {
    if (bubbleLinkMode && inputRef.current) inputRef.current.focus()
  }, [bubbleLinkMode])

  if (bubbleLinkMode) {
    return (
      <div className="flex items-center gap-1.5 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 px-2 py-1.5">
        <input
          ref={inputRef}
          type="url"
          value={bubbleLinkUrl}
          onChange={e => setBubbleLinkUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') { setBubbleLinkMode(false); setBubbleLinkUrl('') } }}
          placeholder="https://..."
          className="text-xs bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 outline-none focus:border-blue-500 w-44 placeholder-gray-500"
        />
        <button onMouseDown={e => { e.preventDefault(); applyLink() }} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500">OK</button>
        <button onMouseDown={e => { e.preventDefault(); setBubbleLinkMode(false); setBubbleLinkUrl('') }} className="text-xs text-gray-400 hover:text-white px-1.5 py-1 rounded hover:bg-gray-700">✕</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 px-1.5 py-1">
      <BBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita (Ctrl+B)">
        <b className="text-[11px]">N</b>
      </BBtn>
      <BBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva (Ctrl+I)">
        <i className="text-[11px] not-italic font-serif font-bold">K</i>
      </BBtn>
      <BBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Subrayado (Ctrl+U)">
        <span className="text-[11px] font-bold underline">S</span>
      </BBtn>
      <BBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
        <span className="text-[11px] font-bold line-through">T</span>
      </BBtn>

      <div className="w-px h-4 bg-gray-700 mx-0.5" />

      <BBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()} title="Resaltar en amarillo">
        <span className="text-[11px]">✎</span>
      </BBtn>

      <BBtn
        active={editor.isActive('link')}
        onClick={() => { setBubbleLinkUrl(editor.getAttributes('link').href || ''); setBubbleLinkMode(true) }}
        title="Insertar enlace"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      </BBtn>

      {editor.isActive('link') && (
        <BBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Quitar enlace">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M10.68 10.68a2 2 0 002.64 2.64M6.09 6.09A5 5 0 005 8.58l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            <path d="M10 13a5 5 0 005-1.46l3-3a5 5 0 00-5-8.51" />
          </svg>
        </BBtn>
      )}

      <div className="w-px h-4 bg-gray-700 mx-0.5" />

      {/* Heading shortcuts */}
      {['H1', 'H2', 'H3'].map((h, i) => (
        <BBtn
          key={h}
          active={editor.isActive('heading', { level: i + 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: i + 1 }).run()}
          title={`Título ${i + 1}`}
        >
          <span className="text-[10px] font-bold">{h}</span>
        </BBtn>
      ))}

      <div className="w-px h-4 bg-gray-700 mx-0.5" />

      {/* Alineación */}
      {[
        { align: 'left', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg> },
        { align: 'center', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg> },
        { align: 'right', icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg> },
      ].map(({ align, icon }) => (
        <BBtn key={align} active={editor.isActive({ textAlign: align })} onClick={() => editor.chain().focus().setTextAlign(align).run()} title={`Alinear ${align}`}>
          {icon}
        </BBtn>
      ))}

      <div className="w-px h-4 bg-gray-700 mx-0.5" />

      {/* Limpiar formato */}
      <BBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpiar formato">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.06 9.06L14.94 3.94a1.5 1.5 0 00-2.12 0L3 13.75V21h7.25l9.81-9.81a1.5 1.5 0 000-2.13z"/>
          <line x1="17" y1="3" x2="21" y2="7"/>
          <line x1="3" y1="21" x2="9" y2="21"/>
        </svg>
      </BBtn>
    </div>
  )
}

function BBtn({ active, onClick, title, children }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick?.() }}
      title={title}
      className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-all
        ${active ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  )
}

/* ─── Regla ─── */
function Ruler() {
  const TOTAL_W = 794
  const MARGIN = 96
  const ticks = []
  for (let px = 0; px <= TOTAL_W; px += 24) {
    const isInch = px % 96 === 0
    const inch = px / 96
    ticks.push({ px, isInch, inch })
  }

  return (
    <div className="shrink-0 bg-[#f3f3f3] border-b border-gray-300 overflow-hidden h-6">
      <div className="mx-auto relative" style={{ width: '794px', maxWidth: '100%', height: '100%' }}>
        <div className="absolute top-0 bottom-0 left-0 bg-[#d8d8d8]" style={{ width: MARGIN }} />
        <div className="absolute top-0 bottom-0 right-0 bg-[#d8d8d8]" style={{ width: MARGIN }} />
        <div className="absolute top-0 bottom-0 bg-white" style={{ left: MARGIN, right: MARGIN }} />
        {ticks.map(({ px, isInch, inch }) => (
          <div key={px} className="absolute bottom-0" style={{ left: px }}>
            <div className={`absolute bottom-0 bg-gray-500 ${isInch ? 'h-3 w-px' : 'h-1.5 w-px'}`} />
            {isInch && inch > 0 && inch < TOTAL_W / 96 && (
              <span className="absolute bottom-3 text-[8px] text-gray-500 -translate-x-1/2" style={{ left: 0 }}>{inch}"</span>
            )}
          </div>
        ))}
        <div className="absolute top-0 bg-blue-500" style={{ left: MARGIN - 1, width: 2, height: 6 }} />
        <div className="absolute top-0 bg-blue-500" style={{ left: TOTAL_W - MARGIN - 1, width: 2, height: 6 }} />
      </div>
    </div>
  )
}

/* ─── Save Indicator ─── */
function SaveIndicator({ status }) {
  const base = 'flex items-center gap-1.5 text-xs font-medium'
  if (status === 'saved') return <span className={`${base} text-white/60`}><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Guardado</span>
  if (status === 'saving') return <span className={`${base} text-white/60`}><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
  if (status === 'unsaved') return <span className={`${base} text-yellow-300/80`}><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Sin guardar</span>
  if (status === 'error') return <span className={`${base} text-red-300`}><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Error</span>
  return null
}

/* ─── Skeleton ─── */
function EditorSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] animate-pulse">
      <div className="h-8 bg-[#2b579a]/80 shrink-0" />
      <div className="h-16 bg-[#f3f3f3] border-b border-gray-300 shrink-0" />
      <div className="flex-1 flex items-start justify-center pt-12">
        <div className="w-[794px] max-w-[98%] min-h-48 bg-white shadow-lg p-24 space-y-3">
          <div className="h-6 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-50 rounded w-full" />
          <div className="h-4 bg-gray-50 rounded w-5/6" />
          <div className="h-4 bg-gray-50 rounded w-4/6" />
        </div>
      </div>
    </div>
  )
}
