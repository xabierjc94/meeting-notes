import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBiblioteca } from '../context/BibliotecaContext'
import DocumentGridCard from '../components/biblioteca/DocumentGridCard'
import DocumentEditor from '../components/biblioteca/DocumentEditor'
import DocumentPreviewModal from '../components/biblioteca/DocumentPreviewModal'
import DocumentViewModal from '../components/biblioteca/DocumentViewModal'
import { importFile, isSupportedFile } from '../lib/fileImport'
import { supabase } from '../lib/supabaseClient'

const FOLDER_COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#84cc16', '#14b8a6', '#6366f1', '#64748b',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getInitials(name, email) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email ? email.slice(0, 2).toUpperCase() : 'UN'
}

// ─── Modal crear/renombrar carpeta ────────────────────────────────
function FolderModal({ initial, onConfirm, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || '#10b981')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try { await onConfirm({ name: name.trim(), color }) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">
            {initial ? 'Renombrar carpeta' : 'Nueva carpeta'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Nombre</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Contratos, Marketing, Proyectos..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
              <svg className="w-4 h-4" fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">{name || 'Sin nombre'}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={!name.trim() || saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all">
              {saving ? 'Guardando...' : (initial ? 'Guardar' : 'Crear carpeta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta de carpeta en el grid ────────────────────────────────
function FolderGridCard({ carpeta, docCount, onClick, onRename, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = (e) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la carpeta "${carpeta.name}"? Los documentos se moverán a la raíz.`)) return
    setDeleting(true)
    onDelete(carpeta.id).catch(() => setDeleting(false))
  }

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col text-left bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer
                 hover:shadow-lg transition-all duration-200 select-none overflow-hidden"
      style={{ opacity: deleting ? 0.5 : 1, borderTopColor: carpeta.color, borderTopWidth: 3 }}
    >
      {/* Fondo sutil */}
      <div className="absolute inset-0 opacity-5 rounded-2xl" style={{ backgroundColor: carpeta.color }} />

      <div className="relative">
        {/* Icono carpeta */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: carpeta.color + '22' }}>
          <svg className="w-6 h-6" fill="none" stroke={carpeta.color} strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        </div>

        <p className="text-sm font-bold text-slate-800 truncate w-full mb-1">{carpeta.name}</p>
        <p className="text-xs text-slate-400">{docCount} documento{docCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Acciones */}
      <div className="absolute top-3 right-3 flex gap-1 transition-all duration-150">
        <button
          onClick={e => { e.stopPropagation(); onRename(carpeta) }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
          title="Renombrar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
          title="Eliminar carpeta"
        >
          {deleting
            ? <span className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────
function Sidebar({
  greeting, userName, user,
  handleCreateDoc, creating,
  onFileChange, importing,
  handleSignOut,
  searchQuery, setSearchQuery,
  totalDocs,
  carpetas, documentos,
  currentFolderId, setCurrentFolderId,
  onCreateFolder,
}) {
  return (
    <div className="w-72 h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden shrink-0">
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -left-16 w-36 h-36 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">MeetingNotes</span>
        </div>

        <p className="text-xs text-emerald-300/60 font-medium mb-1">{greeting}, {userName}</p>
        <h2 className="text-white font-semibold text-sm mb-4">Tu biblioteca</h2>

        {/* Navegación app */}
        <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
          <Link to="/dashboard" title="Notas" className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span className="text-[10px] font-semibold">Notas</span>
          </Link>
          <Link to="/tasks" title="Tareas" className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <span className="text-[10px] font-semibold">Tareas</span>
          </Link>
          <div title="Biblioteca" className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-white/10 text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
            <span className="text-[10px] font-semibold">Biblioteca</span>
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
          <button
            onClick={onCreateFolder}
            disabled={creating || importing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       bg-white/8 hover:bg-white/14 border border-white/15 hover:border-white/30
                       disabled:opacity-50 text-slate-300 hover:text-white transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Nueva carpeta
          </button>
          <label
            htmlFor="biblioteca-file-input"
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                       bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15
                       text-slate-400 hover:text-slate-300 transition-all duration-200
                       ${creating || importing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            {importing
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            }
            {importing ? 'Importando...' : 'Importar archivo'}
          </label>
          <input id="biblioteca-file-input" type="file" accept=".docx,.doc,.pdf,.txt,.md" className="hidden" onChange={onFileChange} disabled={creating || importing} />
          <p className="text-center text-[10px] text-slate-600">Word · PDF · TXT</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative z-10 px-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-all"
              title="Limpiar búsqueda"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Árbol de carpetas */}
      <div className="relative z-10 px-4 pb-2 flex-1 overflow-y-auto">
        <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2 px-1">Ubicaciones</p>

        {/* Todos */}
        <button
          onClick={() => setCurrentFolderId(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all mb-0.5
            ${currentFolderId === null
              ? 'bg-white/12 text-white'
              : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'}`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          <span className="flex-1 text-left">Todos los documentos</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
            ${currentFolderId === null ? 'bg-white/20 text-white' : 'bg-white/8 text-slate-500'}`}>
            {documentos.length}
          </span>
        </button>

        {/* Cada carpeta */}
        {carpetas.map(carpeta => {
          const count = documentos.filter(d => d.folder_id === carpeta.id).length
          const isActive = currentFolderId === carpeta.id
          return (
            <button
              key={carpeta.id}
              onClick={() => setCurrentFolderId(carpeta.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all mb-0.5
                ${isActive ? 'bg-white/12 text-white' : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'}`}
            >
              <span className="w-3.5 h-3.5 rounded-md shrink-0" style={{ backgroundColor: carpeta.color }} />
              <span className="flex-1 text-left truncate">{carpeta.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
                ${isActive ? 'bg-white/20 text-white' : 'bg-white/8 text-slate-500'}`}>
                {count}
              </span>
            </button>
          )
        })}

        {carpetas.length === 0 && (
          <p className="text-[10px] text-slate-600 italic px-3 py-2">Sin carpetas aún</p>
        )}
      </div>

      {/* Stats */}
      <div className="relative z-10 px-4 pb-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">Total documentos</span>
            <span className="text-sm font-bold text-emerald-400">{totalDocs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Carpetas</span>
            <span className="text-sm font-bold text-teal-400">{carpetas.length}</span>
          </div>
        </div>
      </div>

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

// ─── Grid de documentos ────────────────────────────────────────────
function DocumentsGrid({
  documentos, allDocumentos, carpetas, loading, error, searchQuery,
  currentFolderId, setCurrentFolderId,
  onOpen, onPreview, onCreateDoc, onImport,
  onCreateFolder, onRenameFolder, onDeleteFolder,
}) {
  const currentFolder = carpetas.find(c => c.id === currentFolderId) ?? null

  if (loading) return (
    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

  // Documentos a mostrar según contexto
  const visibleDocs = documentos

  const isEmpty = visibleDocs.length === 0 && carpetas.length === 0

  if (isEmpty && !searchQuery) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center border border-emerald-200/50 shadow-inner">
        <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-700 mb-1">Biblioteca vacía</h3>
        <p className="text-sm text-slate-400 mb-5">Crea tu primer documento, una carpeta o importa un archivo</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={onCreateDoc}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo documento
          </button>
          <button onClick={onCreateFolder}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            Nueva carpeta
          </button>
          <button onClick={onImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 overflow-y-auto h-full">

      {/* Breadcrumb cuando hay carpeta activa */}
      {currentFolder ? (
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            Biblioteca
          </button>
          <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: currentFolder.color }} />
            <span className="text-xs font-bold text-slate-700">{currentFolder.name}</span>
          </div>
          <span className="text-xs text-slate-400 ml-auto">{visibleDocs.length} documento{visibleDocs.length !== 1 ? 's' : ''}</span>
        </div>
      ) : searchQuery ? (
        <p className="text-xs text-slate-400 mb-4">
          {visibleDocs.length} resultado{visibleDocs.length !== 1 ? 's' : ''} para "<span className="font-medium text-slate-600">{searchQuery}</span>"
        </p>
      ) : null}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        {/* Tarjetas de carpetas (solo en vista raíz, sin búsqueda) */}
        {!currentFolder && !searchQuery && carpetas.map(carpeta => (
          <FolderGridCard
            key={carpeta.id}
            carpeta={carpeta}
            docCount={allDocumentos.filter(d => d.folder_id === carpeta.id).length}
            onClick={() => setCurrentFolderId(carpeta.id)}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        ))}

        {/* Documentos */}
        {visibleDocs.map(doc => (
          <DocumentGridCard key={doc.id} doc={doc} onOpen={onOpen} onPreview={onPreview} />
        ))}
      </div>

      {/* Empty state dentro de carpeta */}
      {currentFolder && visibleDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: currentFolder.color + '22' }}>
            <svg className="w-8 h-8" fill="none" stroke={currentFolder.color} strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600">Carpeta vacía</p>
          <p className="text-xs text-slate-400">Crea un documento o mueve uno existente aquí</p>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────
export default function BibliotecaPage() {
  const { user, signOut } = useAuth()
  const {
    documentos, carpetas, loading, error, activeDocId,
    createDocumento, setActiveDoc,
    createCarpeta, updateCarpeta, deleteCarpeta,
  } = useBiblioteca()

  const [creating, setCreating]         = useState(false)
  const [importing, setImporting]       = useState(false)
  const [importError, setImportError]   = useState(null)
  const [searchQuery, setSearchQuery]   = useState('')
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [pendingFile, setPendingFile]   = useState(null)
  const [previewData, setPreviewData]   = useState(null)
  const [viewingDoc, setViewingDoc]     = useState(null)
  const [currentFolderId, setCurrentFolderIdRaw] = useState(null)
  const [folderModal, setFolderModal]   = useState(null) // null | 'create' | { id, name, color }

  // Cambiar de carpeta limpia la búsqueda
  const setCurrentFolderId = (id) => {
    setCurrentFolderIdRaw(id)
    setSearchQuery('')
  }

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
  }

  const handleCreateDoc = async () => {
    setCreating(true)
    try {
      await createDocumento({ folder_id: currentFolderId })
    } catch (err) { console.error(err) } finally { setCreating(false) }
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
      const storagePath = `${user.id}/${Date.now()}_${pendingFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('biblioteca-docs')
        .upload(storagePath, pendingFile, { contentType: pendingFile.type, upsert: false })
      if (uploadError) throw uploadError
      const result = await importFile(pendingFile)
      const title = pendingFile.name.replace(/\.[^/.]+$/, '')
      const content = result.type === 'html' ? { type: 'html_import', html: result.data } : result.data
      await createDocumento({ title, content, file_name: pendingFile.name, file_path: storagePath, folder_id: currentFolderId })
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

  // ─── Carpetas
  const handleCreateFolder = async ({ name, color }) => {
    await createCarpeta({ name, color })
    setFolderModal(null)
  }

  const handleRenameFolder = async ({ name, color }) => {
    await updateCarpeta(folderModal.id, { name, color })
    setFolderModal(null)
  }

  const handleDeleteFolder = async (id) => {
    // Si el usuario está viendo esa carpeta, volver a raíz
    if (currentFolderId === id) setCurrentFolderIdRaw(null)
    await deleteCarpeta(id)
  }

  const filteredDocs = useMemo(() => {
    if (searchQuery.trim()) {
      // Con búsqueda activa: busca en TODOS los documentos sin importar carpeta
      const q = searchQuery.toLowerCase()
      return documentos.filter(d => (d.title || '').toLowerCase().includes(q))
    }
    // Sin búsqueda: muestra solo el contexto actual
    if (currentFolderId !== null) return documentos.filter(d => d.folder_id === currentFolderId)
    return documentos.filter(d => !d.folder_id)
  }, [documentos, searchQuery, currentFolderId])

  const greeting  = getGreeting()
  const userName  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const activeDoc = documentos.find(d => d.id === activeDocId) ?? null

  const sidebarEl = (
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
      carpetas={carpetas}
      documentos={documentos}
      currentFolderId={currentFolderId}
      setCurrentFolderId={setCurrentFolderId}
      onCreateFolder={() => setFolderModal('create')}
    />
  )

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">

      {/* Modal carpeta */}
      {folderModal === 'create' && (
        <FolderModal onConfirm={handleCreateFolder} onClose={() => setFolderModal(null)} />
      )}
      {folderModal && folderModal !== 'create' && (
        <FolderModal initial={folderModal} onConfirm={handleRenameFolder} onClose={() => setFolderModal(null)} />
      )}

      {/* Modal preview importación */}
      {pendingFile && previewData && (
        <DocumentPreviewModal
          file={pendingFile}
          previewData={previewData}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelPreview}
          importing={importing}
        />
      )}

      {/* Modal preview doc guardado */}
      {viewingDoc && (
        <DocumentViewModal
          docId={viewingDoc.id}
          docMeta={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onOpen={(id) => { setViewingDoc(null); setActiveDoc(id) }}
        />
      )}

      {/* Error de importación */}
      {importError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
          <span className="text-sm text-red-600">{importError}</span>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col animate-slideInLeft">{sidebarEl}</aside>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden animate-slideInLeft">{sidebarEl}</div>
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
            ? <button onClick={() => setActiveDoc(null)} className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Documentos
              </button>
            : <span className="font-bold text-slate-800 text-sm">
                {carpetas.find(c => c.id === currentFolderId)?.name || 'Biblioteca'}
              </span>
          }
          <button onClick={handleCreateDoc} disabled={creating} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          </button>
        </header>

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50">
          {activeDocId ? (
            <div className="h-full animate-fadeIn">
              <DocumentEditor key={activeDocId} docId={activeDocId} onBack={() => setActiveDoc(null)} />
            </div>
          ) : (
            <DocumentsGrid
              documentos={filteredDocs}
              allDocumentos={documentos}
              carpetas={carpetas}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              currentFolderId={currentFolderId}
              setCurrentFolderId={setCurrentFolderId}
              onOpen={id => setActiveDoc(id)}
              onPreview={doc => setViewingDoc(doc)}
              onCreateDoc={handleCreateDoc}
              onImport={() => document.getElementById('biblioteca-file-input')?.click()}
              onCreateFolder={() => setFolderModal('create')}
              onRenameFolder={carpeta => setFolderModal(carpeta)}
              onDeleteFolder={handleDeleteFolder}
            />
          )}
        </div>
      </main>
    </div>
  )
}
