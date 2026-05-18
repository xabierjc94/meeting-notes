import { useEffect, useRef } from 'react'

const FILE_ICONS = {
  pdf:  { color: '#DC2626', label: 'PDF' },
  docx: { color: '#2563EB', label: 'Word' },
  doc:  { color: '#2563EB', label: 'Word' },
  txt:  { color: '#6B7280', label: 'TXT' },
  md:   { color: '#7C3AED', label: 'MD' },
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentPreviewModal({ file, previewData, onConfirm, onCancel, importing }) {
  const ext  = file?.name.split('.').pop()?.toLowerCase() || 'txt'
  const icon = FILE_ICONS[ext] || FILE_ICONS.txt
  const overlayRef = useRef(null)

  // Limpiar object URL al desmontar
  useEffect(() => {
    return () => {
      if (previewData?.type === 'pdf' && previewData.objectUrl) {
        URL.revokeObjectURL(previewData.objectUrl)
      }
    }
  }, [previewData])

  // Determina si el área de preview debe ser compacta o expandida
  const isPdfPreview = previewData?.type === 'pdf'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={e => { if (e.target === overlayRef.current) onCancel() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: '860px', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: icon.color }}
          >
            {icon.label}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{file?.name}</p>
            <p className="text-xs text-gray-400">{formatSize(file?.size || 0)} · {icon.label}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Area */}
        <div
          className="overflow-auto bg-gray-50"
          style={{ flex: 1, minHeight: 0 }}
        >
          {/* PDF — iframe con blob URL (más compatible que embed) */}
          {previewData?.type === 'pdf' && (
            <iframe
              src={previewData.objectUrl}
              title="Vista previa PDF"
              style={{ width: '100%', height: '100%', minHeight: 'clamp(200px, 60vh, 600px)', border: 'none', display: 'block' }}
            />
          )}

          {/* Word / HTML de mammoth — iframe con estilos embebidos */}
          {previewData?.type === 'html' && (
            <iframe
              title="Vista previa Word"
              style={{ width: '100%', height: '100%', minHeight: 'clamp(200px, 55vh, 560px)', border: 'none', display: 'block' }}
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
                *, *::before, *::after { box-sizing: border-box; }
                html, body { margin: 0; padding: 0; background: #f3f4f6; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; }
                .page { background: #fff; max-width: 760px; margin: 32px auto; padding: 64px 72px; box-shadow: 0 1px 8px rgba(0,0,0,0.10); border-radius: 8px; }
                h1 { font-size: 2em; font-weight: 700; margin: 0.8em 0 0.4em; }
                h2 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.3em; }
                h3 { font-size: 1.17em; font-weight: 600; margin: 0.7em 0 0.3em; }
                h4, h5, h6 { font-weight: 600; margin: 0.6em 0 0.3em; }
                p  { margin: 0 0 0.6em; }
                b, strong { font-weight: 700; }
                i, em { font-style: italic; }
                u { text-decoration: underline; }
                s, del { text-decoration: line-through; }
                ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0 0.8em; }
                ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0 0.8em; }
                li { margin-bottom: 0.25em; }
                table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 13px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
                th { background: #f8fafc; font-weight: 600; }
                a  { color: #2563eb; text-decoration: underline; }
                img { max-width: 100%; height: auto; border-radius: 4px; margin: 0.5em 0; }
                blockquote { border-left: 3px solid #e2e8f0; padding: 0.3em 0 0.3em 1em; color: #64748b; margin: 0.8em 0; font-style: italic; }
                pre  { background: #1e293b; color: #a5f3fc; padding: 1em; border-radius: 6px; overflow-x: auto; font-size: 12px; }
                code { background: #f1f5f9; padding: 0.1em 0.3em; border-radius: 3px; font-size: 12px; font-family: monospace; }
                pre code { background: none; padding: 0; }
              </style></head><body><div class="page">${previewData.html}</div></body></html>`}
            />
          )}

          {/* TXT / MD */}
          {previewData?.type === 'text' && (
            <div className="p-4 md:p-8">
              <pre className="bg-white shadow-sm rounded-xl mx-auto max-w-2xl p-4 md:p-8 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewData.text}
              </pre>
            </div>
          )}

          {/* Cargando */}
          {previewData?.type === 'loading' && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Procesando documento...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {previewData?.type === 'error' && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-500">{previewData.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-white shrink-0">
          <p className="text-xs text-gray-400">
            {previewData?.type === 'pdf'
              ? 'El texto del PDF se extraerá para edición'
              : previewData?.type === 'html'
              ? 'El formato Word se conservará en el editor'
              : 'El contenido se cargará como texto'}
          </p>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={importing || previewData?.type === 'loading' || previewData?.type === 'error'}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white
                         disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {importing
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importando...</>
                : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Importar y editar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
