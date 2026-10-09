import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useBiblioteca } from '../context/BibliotecaContext'
import { useAppSidebar } from '../components/layout/AppSidebarContext'
import MobileTopBar from '../components/layout/MobileTopBar'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import DocumentGridCard from '../components/biblioteca/DocumentGridCard'
import DocumentPreviewModal from '../components/biblioteca/DocumentPreviewModal'
import DocumentViewModal from '../components/biblioteca/DocumentViewModal'
import { isSupportedFile } from '../lib/fileTypes'
import { supabase } from '../lib/supabaseClient'

// El editor (TipTap) pesa ~120 KB: se descarga solo al abrir un documento
const DocumentEditor = lazy(() => import('../components/biblioteca/DocumentEditor'))

const FOLDER_COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#84cc16', '#14b8a6', '#6366f1', '#64748b',
]

// ─── Plantillas de documento (TipTap JSON) ────────────────────────
// Niveles de encabezado = los mismos que produce el botón T1 del toolbar (level 1).
const tplHeading = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] })
const tplParagraph = () => ({ type: 'paragraph' })

// El editor de Biblioteca registra TaskList/TaskItem, así que "Acuerdos" usa lista de tareas.
const buildActaTemplate = () => ({
  type: 'doc',
  content: [
    tplHeading(1, 'Asistentes'),
    tplParagraph(),
    tplHeading(1, 'Orden del día'),
    tplParagraph(),
    tplHeading(1, 'Acuerdos'),
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
      ],
    },
    tplHeading(1, 'Próximos pasos'),
    tplParagraph(),
  ],
})

const buildPropuestaTemplate = () => ({
  type: 'doc',
  content: [
    tplHeading(1, 'Resumen'),
    tplParagraph(),
    tplHeading(1, 'Contexto'),
    tplParagraph(),
    tplHeading(1, 'Propuesta'),
    tplParagraph(),
    tplHeading(1, 'Presupuesto'),
    tplParagraph(),
    tplHeading(1, 'Siguientes pasos'),
    tplParagraph(),
  ],
})

const DOC_TEMPLATES = [
  {
    id: 'blank',
    name: 'En blanco',
    desc: 'Documento vacío',
    buildContent: () => null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: 'acta',
    name: 'Acta de reunión',
    desc: 'Asistentes y acuerdos',
    buildContent: buildActaTemplate,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'propuesta',
    name: 'Propuesta',
    desc: 'Proyecto y presupuesto',
    buildContent: buildPropuestaTemplate,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
]

// ─── Modal selector de plantilla ──────────────────────────────────
function TemplateModal({ onSelect, onClose, creating }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h3 className="text-base font-bold text-white">Nuevo documento</h3>
          <p className="text-xs text-slate-400 mt-0.5">Elige una plantilla para empezar</p>
        </div>
        <div className="px-6 py-5 space-y-2.5">
          {DOC_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              disabled={creating}
              onClick={() => onSelect(tpl)}
              className="w-full flex items-center gap-3.5 text-left bg-white/5 border border-white/10 rounded-xl px-4 py-3.5
                         hover:bg-white/10 hover:border-violet-400/30 disabled:opacity-50 transition-all duration-200"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-violet-500/15 border border-violet-400/20 text-violet-300 flex items-center justify-center">
                {tpl.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{tpl.name}</p>
                <p className="text-xs text-slate-400">{tpl.desc}</p>
              </div>
              {creating && (
                <div className="ml-auto w-4 h-4 shrink-0 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>
        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-white/10 hover:bg-white/15 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
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
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <h3 className="text-base font-bold text-white">
            {initial ? 'Renombrar carpeta' : 'Nueva carpeta'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Nombre</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Contratos, Marketing, Proyectos..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
              <svg className="w-4 h-4" fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">{name || 'Sin nombre'}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-white/10 hover:bg-white/15 transition-all">
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
      className="group relative flex flex-col text-left bg-white/5 border border-white/10 rounded-2xl p-5 cursor-pointer
                 hover:bg-white/10 hover:shadow-lg transition-all duration-200 select-none overflow-hidden"
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

        <p className="text-sm font-bold text-white truncate w-full mb-1">{carpeta.name}</p>
        <p className="text-xs text-slate-400">{docCount} documento{docCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Acciones */}
      <div className="absolute top-3 right-3 flex gap-1 transition-all duration-150">
        <button
          onClick={e => { e.stopPropagation(); onRename(carpeta) }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-400/30 hover:bg-emerald-500/10 transition-all shadow-sm"
          title="Renombrar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all shadow-sm"
          title="Eliminar carpeta"
        >
          {deleting
            ? <span className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Acciones rápidas del rail (menú plegado) ─────────────────────
function BibliotecaRailActions({ handleCreateDoc, creating, importing }) {
  const busy = creating || importing
  return (
    <>
      <button
        onClick={handleCreateDoc}
        disabled={busy}
        title="Nuevo documento"
        aria-label="Nuevo documento"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
      >
        {creating
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <Icon d={ICONS.plus} />}
      </button>
      <label
        htmlFor="biblioteca-file-input"
        title="Importar documento"
        aria-label="Importar documento"
        className={`w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all
                    ${busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        {importing
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
          : <Icon d={ICONS.upload} />}
      </label>
    </>
  )
}

// ─── Sección de la barra lateral (se pinta dentro del marco común) ─
function BibliotecaSidebarSection({
  handleCreateDoc, creating, importing,
  searchQuery, setSearchQuery,
  totalDocs,
  carpetas, documentos,
  currentFolderId, onSelectFolder,
  onCreateFolder,
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-6 pb-4">
        <h2 className="text-white font-semibold text-sm mb-3">Tu biblioteca</h2>

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
          <p className="text-center text-[10px] text-slate-600">Word · PDF · TXT</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-5 pb-3">
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
      <div className="px-4 pb-2 flex-1 min-h-0 overflow-y-auto">
        <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2 px-1">Ubicaciones</p>

        {/* Todos */}
        <button
          onClick={() => onSelectFolder(null)}
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
              onClick={() => onSelectFolder(carpeta.id)}
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
      <div className="px-4 pb-4">
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
        <div key={i} className="animate-pulse bg-white/5 rounded-2xl border border-white/10 h-40" />
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
      <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
        <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1">Biblioteca vacía</h3>
        <p className="text-sm text-slate-400 mb-5">Crea tu primer documento, una carpeta o importa un archivo</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={onCreateDoc}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo documento
          </button>
          <button onClick={onCreateFolder}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-slate-300 hover:bg-white/10 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            Nueva carpeta
          </button>
          <button onClick={onImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-slate-300 hover:bg-white/10 transition-all">
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
            className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
          >
            Biblioteca
          </button>
          <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: currentFolder.color }} />
            <span className="text-xs font-bold text-white">{currentFolder.name}</span>
          </div>
          <span className="text-xs text-slate-400 ml-auto">{visibleDocs.length} documento{visibleDocs.length !== 1 ? 's' : ''}</span>
        </div>
      ) : searchQuery ? (
        <p className="text-xs text-slate-400 mb-4">
          {visibleDocs.length} resultado{visibleDocs.length !== 1 ? 's' : ''} para "<span className="font-medium text-slate-300">{searchQuery}</span>"
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
          <p className="text-sm font-semibold text-slate-300">Carpeta vacía</p>
          <p className="text-xs text-slate-400">Crea un documento o mueve uno existente aquí</p>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────
export default function BibliotecaPage() {
  const { user } = useAuth()
  const {
    documentos, carpetas, loading, error, activeDocId,
    createDocumento, setActiveDoc,
    createCarpeta, updateCarpeta, deleteCarpeta,
  } = useBiblioteca()
  const { panelEl, railEl, closeMobile } = useAppSidebar()

  const [creating, setCreating]         = useState(false)
  const [importing, setImporting]       = useState(false)
  const [importError, setImportError]   = useState(null)
  const [searchQuery, setSearchQuery]   = useState('')
  const [pendingFile, setPendingFile]   = useState(null)
  const [previewData, setPreviewData]   = useState(null)
  const [viewingDoc, setViewingDoc]     = useState(null)
  const [currentFolderId, setCurrentFolderIdRaw] = useState(null)
  const [folderModal, setFolderModal]   = useState(null) // null | 'create' | { id, name, color }
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  // Cambiar de carpeta limpia la búsqueda
  const setCurrentFolderId = (id) => {
    setCurrentFolderIdRaw(id)
    setSearchQuery('')
  }

  // Elegir carpeta desde el menú cierra el documento abierto (si no, el cambio
  // no se ve) y, en móvil, el drawer. El autoguardado pendiente se completa igual.
  const handleSelectFolder = (id) => {
    setCurrentFolderId(id)
    setActiveDoc(null)
    closeMobile()
  }

  // "Nuevo documento" abre el selector de plantillas (cerrando antes el drawer móvil)
  const handleCreateDoc = () => {
    closeMobile()
    setShowTemplateModal(true)
  }

  const handleOpenCreateFolder = () => {
    closeMobile()
    setFolderModal('create')
  }

  const handleCreateFromTemplate = async (tpl) => {
    setCreating(true)
    try {
      const content = tpl.buildContent()
      // "En blanco" (content null) se comporta exactamente como la creación de siempre
      await createDocumento(content
        ? { folder_id: currentFolderId, content }
        : { folder_id: currentFolderId })
      setShowTemplateModal(false)
    } catch (err) { console.error(err) } finally { setCreating(false) }
    closeMobile()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Ya hay archivo: cerrar el drawer móvil para que el modal de preview quede a la vista
    closeMobile()
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
      // mammoth + pdfjs pesan ~1 MB: se descargan solo al importar
      const { importFile } = await import('../lib/fileImport')
      const result = await importFile(pendingFile)
      const title = pendingFile.name.replace(/\.[^/.]+$/, '')
      const content = result.type === 'html' ? { type: 'html_import', html: result.data } : result.data
      await createDocumento({ title, content, file_name: pendingFile.name, file_path: storagePath, folder_id: currentFolderId })
      setPendingFile(null)
      setPreviewData(null)
      closeMobile()
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {panelEl && createPortal(
        <BibliotecaSidebarSection
          handleCreateDoc={handleCreateDoc}
          creating={creating}
          importing={importing}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalDocs={documentos.length}
          carpetas={carpetas}
          documentos={documentos}
          currentFolderId={currentFolderId}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={handleOpenCreateFolder}
        />,
        panelEl
      )}
      {railEl && createPortal(
        <BibliotecaRailActions handleCreateDoc={handleCreateDoc} creating={creating} importing={importing} />,
        railEl
      )}

      {/* Input de archivo único: fuera de la sección para que exista también con el menú plegado.
          Lo usan el label de la sección, el del rail y el botón Importar del estado vacío */}
      <input id="biblioteca-file-input" type="file" accept=".docx,.doc,.pdf,.txt,.md" className="hidden" onChange={handleFileSelected} disabled={creating || importing} />

      {/* Modal selector de plantilla */}
      {showTemplateModal && (
        <TemplateModal
          onSelect={handleCreateFromTemplate}
          onClose={() => { if (!creating) setShowTemplateModal(false) }}
          creating={creating}
        />
      )}

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
        <div className="fixed top-4 right-4 z-50 bg-red-500/15 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
          <span className="text-sm text-red-300">{importError}</span>
          <button onClick={() => setImportError(null)} className="text-red-400 hover:text-red-300 ml-1">✕</button>
        </div>
      )}

      <MobileTopBar
        action={
          <button
            onClick={handleCreateDoc}
            disabled={creating}
            aria-label="Nuevo documento"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
          >
            {creating
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Icon d={ICONS.plus} className="w-5 h-5" />
            }
          </button>
        }
      >
        {activeDocId
          ? <button onClick={() => setActiveDoc(null)} className="flex items-center gap-1 text-sm font-medium text-emerald-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Documentos
            </button>
          : <span className="font-bold text-white text-sm">
              {carpetas.find(c => c.id === currentFolderId)?.name || 'Biblioteca'}
            </span>
        }
      </MobileTopBar>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-hidden bg-slate-950">
        {activeDocId ? (
          <div className="h-full animate-fadeIn">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            }>
              <DocumentEditor key={activeDocId} docId={activeDocId} onBack={() => setActiveDoc(null)} />
            </Suspense>
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
    </div>
  )
}
