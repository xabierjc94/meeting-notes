import { useState, useRef, useEffect } from 'react'
import { useBiblioteca } from '../../context/BibliotecaContext'
import ConfirmDialog from '../ui/ConfirmDialog'
import Spinner from '../ui/Spinner'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EXT_COLORS = {
  docx: { bg: 'bg-pill-sky', text: 'text-pill-sky-ink', label: 'Word' },
  doc: { bg: 'bg-pill-sky', text: 'text-pill-sky-ink', label: 'Word' },
  pdf: { bg: 'bg-pill-red', text: 'text-pill-red-ink', label: 'PDF' },
  xlsx: { bg: 'bg-pill-mint', text: 'text-pill-mint-ink', label: 'Excel' },
  xls: { bg: 'bg-pill-mint', text: 'text-pill-mint-ink', label: 'Excel' },
  txt: { bg: 'bg-card-hover', text: 'text-ink-muted', label: 'TXT' },
  md: { bg: 'bg-pill-lilac', text: 'text-pill-lilac-ink', label: 'MD' },
}

export default function DocumentGridCard({ doc, onOpen, onPreview }) {
  const { deleteDocumento, carpetas, moveDocToFolder } = useBiblioteca()
  const [deleting, setDeleting]       = useState(false)
  const [showMove, setShowMove]       = useState(false)
  const [moving, setMoving]           = useState(false)
  const [confirming, setConfirming]   = useState(false)
  const moveRef = useRef(null)
  const moveBtnRef = useRef(null)

  const ext   = doc.file_name?.split('.').pop()?.toLowerCase() || null
  const badge = ext ? EXT_COLORS[ext] : null
  const currentFolder = carpetas.find(c => c.id === doc.folder_id)

  // Cerrar dropdown al click fuera
  useEffect(() => {
    if (!showMove) return
    const handler = (e) => { if (moveRef.current && !moveRef.current.contains(e.target)) setShowMove(false) }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setShowMove(false); moveBtnRef.current?.focus() } }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [showMove])

  const handleDelete = () => {
    setConfirming(false)
    setDeleting(true)
    deleteDocumento(doc.id).catch(() => setDeleting(false))
  }

  const handleMoveToFolder = async (folderId) => {
    setMoving(true)
    setShowMove(false)
    moveBtnRef.current?.focus()
    try { await moveDocToFolder(doc.id, folderId) } catch { /* el contexto ya avisa del error */ }
    setMoving(false)
  }

  const title = doc.title || 'Sin título'
  const action = 'w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-line transition-colors'
  const moveItem = 'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-card-hover transition-colors'

  // ─────────────────────────────────────────────────────────────
  // El título es un botón real que cubre la tarjeta (.stretched-link): se abre
  // con un clic en cualquier parte o con Tab + Enter. Las acciones van en la
  // fila de arriba con z-10, por encima de ese botón, y no tapan el icono.
  // ─────────────────────────────────────────────────────────────
  return (
    // showMove → z-20: la fila de acciones (z-10) forma su propia capa y el menú
    // solo puede quedar por encima de las tarjetas vecinas si sube la tarjeta entera
    <div className={`group relative flex flex-col bg-card border border-line rounded-2xl p-5 hover:bg-card-hover transition-colors ${deleting ? 'opacity-50' : ''} ${showMove ? 'z-20' : ''}`}>
      {/* Franja con el color de la carpeta (si tiene) */}
      {currentFolder && (
        <div className="absolute top-0 left-5 right-5 h-0.5 rounded-b-full" style={{ backgroundColor: currentFolder.color }} aria-hidden="true" />
      )}

      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="w-10 h-10 shrink-0 bg-accent-soft rounded-xl flex items-center justify-center" aria-hidden="true">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="relative z-10 flex gap-0.5">
          <button type="button" onClick={() => onPreview?.(doc)} className={action} title="Vista previa" aria-label={`Vista previa de ${title}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          {carpetas.length > 0 && (
            <div className="relative" ref={moveRef}>
              <button
                type="button"
                ref={moveBtnRef}
                onClick={() => setShowMove(v => !v)}
                aria-expanded={showMove}
                aria-haspopup="true"
                className={`${action} ${moving || showMove ? 'text-accent bg-accent-soft' : ''}`}
                title="Mover a carpeta"
                aria-label={`Mover ${title} a una carpeta`}
              >
                {moving
                  ? <Spinner label="Moviendo" />
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                }
              </button>

              {showMove && (
                <div className="absolute top-full right-0 mt-1 z-[200] bg-card border border-line rounded-xl shadow-2xl min-w-[160px] py-1 overflow-hidden">
                  <p className="px-3 py-1.5 text-[10px] text-ink-subtle font-semibold uppercase tracking-wider border-b border-line">
                    Mover a
                  </p>
                  {/* onClick (no onMouseDown): así también funciona con el teclado */}
                  <button type="button" onClick={() => handleMoveToFolder(null)} aria-current={!doc.folder_id ? 'true' : undefined}
                    className={`${moveItem} ${!doc.folder_id ? 'text-ink-muted' : 'text-ink'}`}>
                    <svg className="w-3.5 h-3.5 text-ink-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                    Sin carpeta
                    {!doc.folder_id && <span className="ml-auto text-accent" aria-hidden="true">✓</span>}
                  </button>
                  {carpetas.map(c => (
                    <button key={c.id} type="button" onClick={() => handleMoveToFolder(c.id)} aria-current={doc.folder_id === c.id ? 'true' : undefined}
                      className={`${moveItem} ${doc.folder_id === c.id ? 'text-ink-muted' : 'text-ink'}`}>
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c.color }} aria-hidden="true" />
                      <span className="truncate">{c.name}</span>
                      {doc.folder_id === c.id && <span className="ml-auto text-accent shrink-0" aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={deleting}
            className={`${action} hover:text-danger hover:bg-danger/10`}
            title="Eliminar"
            aria-label={`Eliminar ${title}`}
          >
            {deleting
              ? <Spinner label="Eliminando" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            }
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-ink truncate mb-1">
        <button type="button" onClick={() => onOpen(doc.id)} className="stretched-link text-left" title={title}>
          {title}
        </button>
      </p>
      <p className="text-xs text-ink-muted">{formatDate(doc.updated_at)}</p>

      {(badge || currentFolder) && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {badge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          )}
          {currentFolder && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-card-hover text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentFolder.color }} aria-hidden="true" />
              {currentFolder.name}
            </span>
          )}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title="Eliminar documento"
          message={`¿Eliminar "${title}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
