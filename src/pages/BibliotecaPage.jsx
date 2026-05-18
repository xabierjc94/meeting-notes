import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBiblioteca } from '../context/BibliotecaContext'
import DocumentGridCard from '../components/biblioteca/DocumentGridCard'
import DocumentEditor from '../components/biblioteca/DocumentEditor'
import DocumentPreviewModal from '../components/biblioteca/DocumentPreviewModal'
import DocumentViewModal from '../components/biblioteca/DocumentViewModal'
import { importFile, isSupportedFile } from '../lib/fileImport'
import { supabase } from '../lib/supabaseClient'

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

// ─── Sidebar ───────────────────────────────────────────────────
function Sidebar({ greeting, userName, user, handleCreateDoc, creating, onFileChange, importing, handleSignOut, searchQuery, setSearchQuery, totalDocs }) {
  return (
    <div className="w-72 h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden shrink-0">
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -left-16 w-36 h-36 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">MeetingNotes</span>
        </div>

        <p className="text-xs text-emerald-300/60 font-medium mb-1">{greeting}, {userName}</p>
        <h2 className="text-white font-semibold text-sm mb-4">Tu biblioteca</h2>

        {/* Navegación */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
          <Link to="/dashboard" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Notas
          </Link>
          <Link to="/tasks" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            Tareas
          </Link>
          <div className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
            Biblio
          </div>
        </div>

        {/* Botones acción */}
        <div className="space-y-2">
          <button
            onClick={handleCreateDoc}
            disabled={creating || importing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                       disabled:opacity-50 text-white transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            {creating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            }
            Nuevo documento
          </button>

          <label
            htmlFor="biblioteca-file-input"
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/20
                       text-slate-300 hover:text-white transition-all duration-200
                       ${creating || importing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            {importing
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            }
            {importing ? 'Importando...' : 'Importar archivo'}
          </label>
          <input
            id="biblioteca-file-input"
            type="file"
            accept=".docx,.doc,.pdf,.txt,.md"
            className="hidden"
            onChange={onFileChange}
            disabled={creating || importing}
          />
          <p className="text-center text-[10px] text-slate-600">Word · PDF · TXT</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative z-10 px-4 pb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white
                       placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 px-4 pb-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Total documentos</span>
            <span className="text-sm font-bold text-emerald-400">{totalDocs}</span>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Footer usuario */}
      <div className="relative z-10 border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-xl flex items-center justify-center shrink-0 border border-emerald-400/20">
              <span className="text-[10px] font-bold text-emerald-200">{getInitials(user?.user_metadata?.full_name, user?.email)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.user_metadata?.full_name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Cerrar sesión">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Grid de documentos ────────────────────────────────────────
function DocumentsGrid({ documentos, loading, error, searchQuery, onOpen, onPreview, onCreateDoc, onImport }) {
  if (loading) return (
    <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-200 h-40" />
      ))}
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-red-400">{error}</p>
    </div>
  )

  if (documentos.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center border border-emerald-200/50 shadow-inner">
        <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-700 mb-1">Biblioteca vacía</h3>
        <p className="text-sm text-slate-400 mb-5">Crea tu primer documento o importa uno existente</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCreateDoc}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo documento
          </button>
          <button onClick={onImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar archivo
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 overflow-y-auto h-full">
      {searchQuery && (
        <p className="text-xs text-slate-400 mb-4">{documentos.length} resultado{documentos.length !== 1 ? 's' : ''} para "<span className="font-medium text-slate-600">{searchQuery}</span>"</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Tarjeta "Nuevo" siempre primera */}
        <button
          onClick={onCreateDoc}
          className="flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl p-5 h-40
                     hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-400 hover:text-emerald-600 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xs font-semibold">Nuevo documento</span>
        </button>

        {documentos.map(doc => (
          <DocumentGridCard key={doc.id} doc={doc} onOpen={onOpen} onPreview={onPreview} />
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────
export default function BibliotecaPage() {
  const { user, signOut } = useAuth()
  const { documentos, loading, error, activeDocId, createDocumento, setActiveDoc } = useBiblioteca()
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null) // { id, title, file_name, updated_at }

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
  }

  const handleCreateDoc = async () => {
    setCreating(true)
    try { await createDocumento() } catch (err) { console.error(err) } finally { setCreating(false) }
    setSidebarOpen(false)
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isSupportedFile(file)) { setImportError('Formato no soportado.'); return }

    setPendingFile(file)
    setPreviewData({ type: 'loading' })
    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      if (ext === 'pdf') {
        setPreviewData({ type: 'pdf', objectUrl: URL.createObjectURL(file) })
      } else if (ext === 'docx' || ext === 'doc') {
        const mammoth = (await import('mammoth')).default
        const buffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
        setPreviewData({ type: 'html', html: result.value })
      } else {
        setPreviewData({ type: 'text', text: await file.text() })
      }
    } catch (err) {
      setPreviewData({ type: 'error', message: err.message || 'No se pudo leer el archivo.' })
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingFile) return
    setImporting(true)
    try {
      // 1. Subir archivo original a Supabase Storage
      const ext = pendingFile.name.split('.').pop()?.toLowerCase()
      const storagePath = `${user.id}/${Date.now()}_${pendingFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('biblioteca-docs')
        .upload(storagePath, pendingFile, { contentType: pendingFile.type, upsert: false })
      if (uploadError) throw uploadError

      // 2. Extraer contenido para el editor
      const result = await importFile(pendingFile)
      const title = pendingFile.name.replace(/\.[^/.]+$/, '')
      const content = result.type === 'html'
        ? { type: 'html_import', html: result.data }
        : result.data

      // 3. Crear documento con ruta del archivo original
      await createDocumento({ title, content, file_name: pendingFile.name, file_path: storagePath })
      setPendingFile(null)
      setPreviewData(null)
      setSidebarOpen(false)
    } catch (err) {
      console.error('Error importando:', err)
      setImportError(err.message || 'Error al importar.')
      setPendingFile(null)
      setPreviewData(null)
    } finally {
      setImporting(false)
    }
  }

  const handleCancelPreview = () => {
    if (previewData?.type === 'pdf' && previewData.objectUrl) URL.revokeObjectURL(previewData.objectUrl)
    setPendingFile(null)
    setPreviewData(null)
  }

  const handleOpenDoc = (id) => setActiveDoc(id)
  const handleBack    = () => setActiveDoc(null)

  // Documento activo completo (para saber si es .docx y tiene file_path)
  const activeDoc = documentos.find(d => d.id === activeDocId) ?? null

  const handlePreviewDoc = (doc) => setViewingDoc(doc)
  const handleCloseViewModal = () => setViewingDoc(null)

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documentos
    const q = searchQuery.toLowerCase()
    return documentos.filter(d => (d.title || '').toLowerCase().includes(q))
  }, [documentos, searchQuery])

  const greeting = getGreeting()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  const sidebar = (
    <Sidebar
      greeting={greeting}
      userName={userName}
      user={user}
      handleCreateDoc={handleCreateDoc}
      creating={creating}
      onFileChange={handleFileSelected}
      importing={importing}
      handleSignOut={handleSignOut}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      totalDocs={documentos.length}
    />
  )

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">
      {/* Modal preview de importación */}
      {pendingFile && previewData && (
        <DocumentPreviewModal
          file={pendingFile}
          previewData={previewData}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelPreview}
          importing={importing}
        />
      )}

      {/* Modal previsualización de documento guardado */}
      {viewingDoc && (
        <DocumentViewModal
          docId={viewingDoc.id}
          docMeta={viewingDoc}
          onClose={handleCloseViewModal}
          onOpen={(id) => { handleCloseViewModal(); handleOpenDoc(id) }}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col animate-slideInLeft">
        {sidebar}
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden animate-slideInLeft">{sidebar}</div>
        </>
      )}

      {/* Área principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {activeDocId
            ? <button onClick={handleBack} className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Documentos
              </button>
            : <span className="font-bold text-slate-800 text-sm">Biblioteca</span>
          }
          <button onClick={handleCreateDoc} disabled={creating} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          </button>
        </header>

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50">
          {activeDocId ? (
            <div className="h-full animate-fadeIn">
              <DocumentEditor key={activeDocId} docId={activeDocId} onBack={handleBack} />
            </div>
          ) : (
            <DocumentsGrid
              documentos={filteredDocs}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              onOpen={handleOpenDoc}
              onPreview={handlePreviewDoc}
              onCreateDoc={handleCreateDoc}
              onImport={() => document.getElementById('biblioteca-file-input')?.click()}
            />
          )}
        </div>
      </main>
    </div>
  )
}
