import { useState } from 'react'
import { useBiblioteca } from '../../context/BibliotecaContext'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DocumentCard({ doc }) {
  const { activeDocId, setActiveDoc, deleteDocumento } = useBiblioteca()
  const isActive = doc.id === activeDocId
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este documento?')) return
    setDeleting(true)
    try {
      await deleteDocumento(doc.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={() => setActiveDoc(doc.id)}
      disabled={deleting}
      className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative
        ${isActive
          ? 'bg-white/15 shadow-sm ring-1 ring-white/20'
          : 'hover:bg-white/8'
        }`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
          ${isActive ? 'bg-emerald-500/20' : 'bg-white/8 group-hover:bg-white/12'}`}>
          <svg className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate leading-snug
            ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
            {doc.title || 'Sin título'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(doc.updated_at)}</p>
        </div>

        <button
          onClick={handleDelete}
          className="shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center
                     rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          {deleting
            ? <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          }
        </button>
      </div>
    </button>
  )
}
