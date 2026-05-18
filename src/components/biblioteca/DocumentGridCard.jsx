import { useState } from 'react'
import { useBiblioteca } from '../../context/BibliotecaContext'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EXT_COLORS = {
  docx: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Word' },
  doc:  { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Word' },
  pdf:  { bg: 'bg-red-100',  text: 'text-red-700',  label: 'PDF'  },
  xlsx: { bg: 'bg-green-100', text: 'text-green-700', label: 'Excel' },
  xls:  { bg: 'bg-green-100', text: 'text-green-700', label: 'Excel' },
  txt:  { bg: 'bg-gray-100', text: 'text-gray-600', label: 'TXT'  },
  md:   { bg: 'bg-purple-100', text: 'text-purple-700', label: 'MD' },
}

function getFileExt(fileName) {
  return fileName?.split('.').pop()?.toLowerCase() || null
}

export default function DocumentGridCard({ doc, onOpen, onPreview }) {
  const { deleteDocumento } = useBiblioteca()
  const [deleting, setDeleting] = useState(false)
  const ext = getFileExt(doc.file_name)
  const badge = ext ? EXT_COLORS[ext] : null

  const handleDelete = (e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este documento?')) return
    setDeleting(true)
    deleteDocumento(doc.id).catch(() => setDeleting(false))
  }

  const handlePreview = (e) => {
    e.stopPropagation()
    onPreview?.(doc)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    onOpen(doc.id)
  }

  return (
    <div
      className="group relative flex flex-col text-left bg-white border border-slate-200 rounded-2xl p-5
                 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10
                 transition-all duration-200 select-none"
      style={{ opacity: deleting ? 0.5 : 1 }}
    >
      {/* Icono del documento */}
      <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center mb-4 border border-emerald-100 group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Título */}
      <p className="text-sm font-semibold text-slate-800 truncate w-full mb-1">
        {doc.title || 'Sin título'}
      </p>

      {/* Fecha */}
      <p className="text-xs text-slate-400">{formatDate(doc.updated_at)}</p>

      {/* Badge tipo archivo */}
      {badge && (
        <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      )}

      {/* Botones acción (aparecen en hover) */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">

        {/* Vista previa */}
        <button
          onClick={handlePreview}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     bg-white border border-slate-200 text-slate-400
                     hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50
                     transition-all duration-150 shadow-sm"
          title="Vista previa"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Editar */}
        <button
          onClick={handleEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     bg-white border border-slate-200 text-slate-400
                     hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50
                     transition-all duration-150 shadow-sm"
          title="Editar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Eliminar */}
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     bg-white border border-slate-200 text-slate-400
                     hover:text-red-500 hover:border-red-200 hover:bg-red-50
                     transition-all duration-150 shadow-sm"
          title="Eliminar"
        >
          {deleting
            ? <span className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          }
        </button>
      </div>
    </div>
  )
}
