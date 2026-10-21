import { useState, useMemo, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import { useBiblioteca } from '../context/BibliotecaContext'
import { useAppSidebar } from '../components/layout/AppSidebarContext'
import MobileTopBar from '../components/layout/MobileTopBar'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Pill from '../components/ui/Pill'
import Spinner from '../components/ui/Spinner'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ColorPicker from '../components/ui/ColorPicker'
import { PALETTE } from '../lib/palette'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import DocumentGridCard from '../components/biblioteca/DocumentGridCard'
import DocumentPreviewModal from '../components/biblioteca/DocumentPreviewModal'
import DocumentViewModal from '../components/biblioteca/DocumentViewModal'
import { isSupportedFile } from '../lib/fileTypes'
import { supabase } from '../lib/supabaseClient'

// El editor (TipTap) pesa ~120 KB: se descarga solo al abrir un documento
const DocumentEditor = lazy(() => import('../components/biblioteca/DocumentEditor'))

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
// Modal común: pila de ventanas, foco atrapado y devuelto al cerrar
function TemplateModal({ onSelect, onClose, creating }) {
  return (
    <Modal
      title="Nuevo documento"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose} disabled={creating} className="flex-1">Cancelar</Button>}
    >
      <p className="text-xs text-ink-muted -mt-1 mb-4">Elige una plantilla para empezar</p>
      <div className="space-y-2.5">
        {DOC_TEMPLATES.map(tpl => (
          <button
            key={tpl.id}
            type="button"
            disabled={creating}
            onClick={() => onSelect(tpl)}
            className="w-full flex items-center gap-3.5 text-left bg-canvas border border-line rounded-xl px-4 py-3.5
                       hover:bg-card-hover hover:border-line-strong disabled:opacity-50 transition-colors"
          >
            <div className="w-10 h-10 shrink-0 rounded-lg bg-accent-soft text-accent flex items-center justify-center" aria-hidden="true">
              {tpl.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{tpl.name}</p>
              <p className="text-xs text-ink-muted">{tpl.desc}</p>
            </div>
            {creating && <Spinner className="ml-auto" label="Creando documento" />}
          </button>
        ))}
      </div>
    </Modal>
  )
}

// ─── Modal crear/renombrar carpeta ────────────────────────────────
function FolderModal({ initial, onConfirm, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || PALETTE[0].value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try { await onConfirm({ name: name.trim(), color }) } finally { setSaving(false) }
  }

  return (
    <Modal
      title={initial ? 'Renombrar carpeta' : 'Nueva carpeta'}
      size="sm"
      onClose={onClose}
      initialFocusRef={inputRef}
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="submit" form="folder-form" disabled={!name.trim() || saving} className="flex-1">
            {saving ? 'Guardando…' : (initial ? 'Guardar' : 'Crear carpeta')}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
        </>
      }
    >
      <form id="folder-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="folder-name" className="block text-xs font-medium text-ink-muted mb-1.5">Nombre</label>
          <input
            id="folder-name"
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Contratos, Marketing, Proyectos…"
            className="field"
          />
        </div>
        <ColorPicker value={color} onChange={setColor} />
        {/* Vista previa */}
        <div className="flex items-center gap-2.5 bg-canvas border border-line rounded-xl px-3 py-2.5" aria-hidden="true">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
            <svg className="w-4 h-4" fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink">{name || 'Sin nombre'}</span>
        </div>
      </form>
    </Modal>
  )
}

// ─── Tarjeta de carpeta en el grid ────────────────────────────────
// Antes era un <div onClick>: con teclado no se podía abrir. Ahora el nombre
// es un botón real que cubre la tarjeta (.stretched-link) y las acciones
// quedan por encima (z-10) para poder pulsarlas por separado.
function FolderGridCard({ carpeta, docCount, onClick, onRename, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    setConfirming(false)
    setDeleting(true)
    onDelete(carpeta.id).catch(() => setDeleting(false))
  }

  const action = 'w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted transition-colors'

  return (
    <div
      className={`group relative flex flex-col bg-card border border-line rounded-2xl p-5 hover:bg-card-hover transition-colors ${deleting ? 'opacity-50' : ''}`}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: carpeta.color + '22' }} aria-hidden="true">
        <svg className="w-6 h-6" fill="none" stroke={carpeta.color} strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>

      <p className="text-sm font-bold text-ink truncate pr-16 mb-1">
        <button type="button" onClick={onClick} className="stretched-link text-left">
          {carpeta.name}
        </button>
      </p>
      <p className="text-xs text-ink-muted">{docCount} documento{docCount !== 1 ? 's' : ''}</p>

      <div className="absolute z-10 top-3 right-3 flex gap-1">
        <button
          type="button"
          onClick={() => onRename(carpeta)}
          className={`${action} hover:text-ink hover:bg-line`}
          title="Renombrar"
          aria-label={`Renombrar carpeta ${carpeta.name}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={deleting}
          className={`${action} hover:text-danger hover:bg-danger/10`}
          title="Eliminar carpeta"
          aria-label={`Eliminar carpeta ${carpeta.name}`}
        >
          {deleting
            ? <Spinner label="Eliminando carpeta" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          }
        </button>
      </div>

      {/* Nuestro diálogo en vez de confirm() del navegador: mismo estilo que
          el resto de la app y Cancelar enfocado por defecto */}
      {confirming && (
        <ConfirmDialog
          title="Eliminar carpeta"
          message={`¿Eliminar la carpeta "${carpeta.name}"? Los documentos se moverán a la raíz.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

// Un <label> no se alcanza con Tab ni responde a Enter: lo convertimos en
// "botón" (tabIndex + role) y Enter/Espacio abren el selector de archivos
const openFilePickerOnKey = (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  document.getElementById('biblioteca-file-input')?.click()
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
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-ink transition-colors"
      >
        {creating
          ? <Spinner tone="dark" label="Creando documento" />
          : <Icon d={ICONS.plus} />}
      </button>
      <label
        htmlFor="biblioteca-file-input"
        role="button"
        tabIndex={busy ? -1 : 0}
        onKeyDown={openFilePickerOnKey}
        title="Importar documento"
        aria-label="Importar documento"
        className={`w-10 h-10 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card-hover transition-all
                    ${busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      >
        {importing
          ? <Spinner label="Importando" />
          : <Icon d={ICONS.upload} />}
      </label>
    </>
  )
}

// ─── Sección de la barra lateral (se pinta dentro del marco común) ─
function BibliotecaSidebarSection({
  handleCreateDoc, creating, importing,
  searchQuery, setSearchQuery,
  carpetas, documentos,
  currentFolderId, onSelectFolder,
  onCreateFolder,
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-6 pb-4">
        <h2 className="text-ink font-semibold text-sm mb-3">Tu biblioteca</h2>

        {/* Botones acción */}
        <div className="space-y-2">
          <Button
            onClick={handleCreateDoc}
            disabled={creating || importing}
            icon={creating ? <Spinner tone="dark" label="Creando documento" /> : <Icon d={ICONS.plus} />}
            className="w-full"
          >
            Nuevo documento
          </Button>
          <Button
            variant="secondary"
            onClick={onCreateFolder}
            disabled={creating || importing}
            icon={<Icon d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />}
            className="w-full"
          >
            Nueva carpeta
          </Button>
          {/* Un <label> que apunta al input de archivo: pulsarlo abre el selector */}
          <Button
            as="label"
            htmlFor="biblioteca-file-input"
            role="button"
            tabIndex={creating || importing ? -1 : 0}
            onKeyDown={openFilePickerOnKey}
            variant="ghost"
            size="sm"
            icon={importing ? <Spinner label="Importando" /> : <Icon d={ICONS.upload} className="w-3.5 h-3.5" />}
            className={`w-full ${creating || importing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            {importing ? 'Importando…' : 'Importar archivo'}
          </Button>
          <p className="text-center text-[10px] text-ink-subtle">Word · PDF · TXT</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-5 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            aria-label="Buscar documentos"
            placeholder="Buscar documentos…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="field pl-9 pr-9 py-2 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-line transition-colors"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
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
        <p className="text-[10px] text-ink-subtle font-semibold uppercase tracking-wider mb-2 px-1">Ubicaciones</p>

        {/* Todos */}
        <button
          onClick={() => onSelectFolder(null)}
          aria-current={currentFolderId === null ? 'true' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all mb-0.5
            ${currentFolderId === null
              ? 'bg-card-hover text-ink'
              : 'text-ink-muted hover:bg-card hover:text-ink'}`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          <span className="flex-1 text-left">Todos los documentos</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
            ${currentFolderId === null ? 'bg-line text-ink' : 'bg-card text-ink-muted'}`}>
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
              aria-current={isActive ? 'true' : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all mb-0.5
                ${isActive ? 'bg-card-hover text-ink' : 'text-ink-muted hover:bg-card hover:text-ink'}`}
            >
              <span className="w-3.5 h-3.5 rounded-md shrink-0" style={{ backgroundColor: carpeta.color }} />
              <span className="flex-1 text-left truncate">{carpeta.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
                ${isActive ? 'bg-line text-ink' : 'bg-card text-ink-muted'}`}>
                {count}
              </span>
            </button>
          )
        })}

        {carpetas.length === 0 && (
          <p className="text-[10px] text-ink-muted italic px-3 py-2">Sin carpetas aún</p>
        )}
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
    <div className="p-8 grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="animate-pulse bg-card rounded-2xl border border-line h-40" />
      ))}
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p role="alert" className="text-sm text-danger">{error}</p>
    </div>
  )

  // Documentos a mostrar según contexto
  const visibleDocs = documentos

  const isEmpty = visibleDocs.length === 0 && carpetas.length === 0

  if (isEmpty && !searchQuery) return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center border border-line" aria-hidden="true">
        <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-ink mb-1">Biblioteca vacía</h3>
        <p className="text-sm text-ink-muted mb-5">Crea tu primer documento, una carpeta o importa un archivo</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={onCreateDoc} icon={<Icon d={ICONS.plus} />}>Nuevo documento</Button>
          <Button variant="secondary" onClick={onCreateFolder} icon={<Icon d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />}>Nueva carpeta</Button>
          <Button variant="secondary" onClick={onImport} icon={<Icon d={ICONS.upload} />}>Importar</Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full">

      {/* La carpeta actual se muestra en la cabecera (PageHeader) */}
      {searchQuery && (
        <p className="text-xs text-ink-muted mb-4" aria-live="polite">
          {visibleDocs.length} resultado{visibleDocs.length !== 1 ? 's' : ''} para "<span className="font-medium text-ink">{searchQuery}</span>"
        </p>
      )}

      {/* auto-fill + mínimo de 14rem: caben tantas columnas como permita el
          espacio libre (que cambia al plegar la barra lateral) */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">

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
          <p className="text-sm font-semibold text-ink">Carpeta vacía</p>
          <p className="text-xs text-ink-muted">Crea un documento o mueve uno existente aquí</p>
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

  const currentFolder = carpetas.find(c => c.id === currentFolderId) ?? null
  // Cabecera: documentos de la carpeta abierta, o todos en la raíz
  const headerCount = currentFolder ? documentos.filter(d => d.folder_id === currentFolder.id).length : documentos.length
  const activeDocTitle = activeDocId ? (documentos.find(d => d.id === activeDocId)?.title?.trim() || 'Sin título') : null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Helmet><title>{activeDocTitle ? `${activeDocTitle} — Biblioteca — MeetingNotes` : 'Biblioteca — MeetingNotes'}</title></Helmet>
      {panelEl && createPortal(
        <BibliotecaSidebarSection
          handleCreateDoc={handleCreateDoc}
          creating={creating}
          importing={importing}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
        <div role="alert" className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-card border border-danger/40 rounded-xl pl-4 pr-2 py-2 flex items-center gap-2 shadow-2xl">
          <span className="flex-1 text-sm text-ink">{importError}</span>
          <button onClick={() => setImportError(null)} aria-label="Cerrar aviso" className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-danger/15 transition-colors">
            <Icon d="M6 18L18 6M6 6l12 12" />
          </button>
        </div>
      )}

      {/* Con un documento abierto, el editor tiene su propia barra; en móvil
          dejamos la barra superior con "← Documentos" para volver */}
      {activeDocId ? (
        <MobileTopBar>
          <button onClick={() => setActiveDoc(null)} className="flex items-center gap-1 text-sm font-medium text-accent">
            <Icon d="M15 19l-7-7 7-7" />
            Documentos
          </button>
        </MobileTopBar>
      ) : (
        <PageHeader
          breadcrumb={currentFolder
            ? [{ label: 'Biblioteca', onClick: () => setCurrentFolderId(null) }, { label: currentFolder.name }]
            : []}
          title={currentFolder?.name ?? 'Biblioteca'}
          icon={currentFolder
            ? <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: currentFolder.color + '22' }} aria-hidden="true">
                <svg className="w-5 h-5" fill="none" stroke={currentFolder.color} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </span>
            : null}
          meta={!loading && <Pill tone="neutral">{headerCount} documento{headerCount !== 1 ? 's' : ''}</Pill>}
          actions={
            <Button onClick={handleCreateDoc} disabled={creating} aria-label="Nuevo documento" icon={creating ? <Spinner tone="dark" label="Creando documento" /> : <Icon d={ICONS.plus} />} className="max-sm:w-10 max-sm:px-0">
              <span className="hidden sm:inline">Nuevo documento</span>
            </Button>
          }
        />
      )}

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-hidden bg-canvas">
        {activeDocId ? (
          <div className="h-full animate-fadeIn">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Spinner size="md" label="Cargando documento" />
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
