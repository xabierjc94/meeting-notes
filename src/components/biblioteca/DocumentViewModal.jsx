import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const EXT_COLORS = {
  docx: { label: 'Word',  iconColor: '#2563EB' },
  doc:  { label: 'Word',  iconColor: '#2563EB' },
  pdf:  { label: 'PDF',   iconColor: '#DC2626' },
  xlsx: { label: 'Excel', iconColor: '#16A34A' },
  xls:  { label: 'Excel', iconColor: '#16A34A' },
  txt:  { label: 'TXT',   iconColor: '#6B7280' },
  md:   { label: 'MD',    iconColor: '#7C3AED' },
}

function getExt(fileName) {
  return fileName?.split('.').pop()?.toLowerCase() || null
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Extrae texto plano de nodos Tiptap JSON
function extractPlainText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  const children = (node.content || []).map(extractPlainText).join('')
  if (['paragraph', 'heading'].includes(node.type)) return children + '\n'
  if (node.type === 'hardBreak') return '\n'
  return children
}

// Convierte Tiptap JSON a HTML sencillo para preview
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function renderMarks(text, marks = []) {
  let out = esc(text)
  for (const m of marks) {
    const a = m.attrs || {}
    if (m.type === 'bold')        { out = `<strong>${out}</strong>`; continue }
    if (m.type === 'italic')      { out = `<em>${out}</em>`; continue }
    if (m.type === 'underline')   { out = `<u>${out}</u>`; continue }
    if (m.type === 'strike')      { out = `<s>${out}</s>`; continue }
    if (m.type === 'code')        { out = `<code>${out}</code>`; continue }
    if (m.type === 'link')        { out = `<a href="${esc(a.href)}" target="_blank">${out}</a>`; continue }
    if (m.type === 'textStyle') {
      let style = ''
      if (a.color)      style += `color:${esc(a.color)};`
      if (a.fontFamily) style += `font-family:${esc(a.fontFamily)};`
      if (a.fontSize)   style += `font-size:${esc(a.fontSize)};`
      if (style) out = `<span style="${style}">${out}</span>`
      continue
    }
    if (m.type === 'highlight') {
      out = `<mark style="background:${esc(a.color||'#fef08a')}">${out}</mark>`
    }
  }
  return out
}

function renderNode(node) {
  if (!node) return ''
  const a = node.attrs || {}
  const ch = () => (node.content||[]).map(renderNode).join('')
  const align = a.textAlign ? ` style="text-align:${esc(a.textAlign)}"` : ''

  switch (node.type) {
    case 'doc':           return ch()
    case 'paragraph':     return `<p${align}>${ch()||'<br>'}</p>`
    case 'heading':       return `<h${a.level||1}${align}>${ch()}</h${a.level||1}>`
    case 'text':          return renderMarks(node.text||'', node.marks||[])
    case 'hardBreak':     return '<br>'
    case 'horizontalRule':return '<hr>'
    case 'blockquote':    return `<blockquote>${ch()}</blockquote>`
    case 'codeBlock':     return `<pre><code>${esc((node.content||[]).map(n=>n.text||'').join(''))}</code></pre>`
    case 'bulletList':    return `<ul>${ch()}</ul>`
    case 'orderedList':   return `<ol${a.start?` start="${a.start}"`:''}>${ch()}</ol>`
    case 'listItem':      return `<li>${ch()}</li>`
    case 'taskList':      return `<ul class="task-list">${ch()}</ul>`
    case 'taskItem':      return `<li class="task-item"><input type="checkbox"${a.checked?' checked':''} disabled> ${ch()}</li>`
    case 'table':         return `<table><tbody>${ch()}</tbody></table>`
    case 'tableRow':      return `<tr>${ch()}</tr>`
    case 'tableCell':     return `<td>${ch()}</td>`
    case 'tableHeader':   return `<th>${ch()}</th>`
    case 'image':         return `<img src="${esc(a.src||'')}" alt="${esc(a.alt||'')}">`
    default:              return ch()
  }
}

export default function DocumentViewModal({ docId, docMeta, onClose, onOpen }) {
  // preview: { type: 'pdf'|'html'|'text', src?: string, html?: string, text?: string }
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const overlayRef = useRef(null)

  const ext   = getExt(docMeta?.file_name)
  const badge = EXT_COLORS[ext] ?? { label: 'DOC', iconColor: '#10b981' }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPreview(null)

    async function load() {
      try {
        // ── Caso 1: hay archivo original en Storage ────────────────
        if (docMeta?.file_path) {
          if (ext === 'pdf') {
            // URL firmada → embed nativo del navegador
            const { data, error: urlErr } = await supabase.storage
              .from('biblioteca-docs')
              .createSignedUrl(docMeta.file_path, 60 * 60)
            if (urlErr) throw urlErr
            if (!cancelled) setPreview({ type: 'pdf', src: data.signedUrl })
            return
          }

          if (ext === 'docx' || ext === 'doc') {
            // Descargamos el blob y lo pasamos por mammoth
            const { data: blob, error: dlErr } = await supabase.storage
              .from('biblioteca-docs')
              .download(docMeta.file_path)
            if (dlErr) throw dlErr
            const mammoth = (await import('mammoth')).default
            const buffer  = await blob.arrayBuffer()
            const result  = await mammoth.convertToHtml({ arrayBuffer: buffer })
            if (!cancelled) setPreview({ type: 'html', html: result.value })
            return
          }

          if (ext === 'txt' || ext === 'md') {
            const { data: blob, error: dlErr } = await supabase.storage
              .from('biblioteca-docs')
              .download(docMeta.file_path)
            if (dlErr) throw dlErr
            const text = await blob.text()
            if (!cancelled) setPreview({ type: 'text', text })
            return
          }
        }

        // ── Caso 2: sin archivo original → usar contenido de la BD ─
        const { data, error: dbErr } = await supabase
          .from('biblioteca')
          .select('content')
          .eq('id', docId)
          .single()
        if (dbErr) throw dbErr

        const content = data?.content
        if (!content) { if (!cancelled) setPreview(null); return }

        if (content?.type === 'html_import') {
          if (!cancelled) setPreview({ type: 'html', html: content.html })
          return
        }
        if (content?.type === 'doc') {
          const html = renderNode(content)
          if (!cancelled) setPreview({ type: 'html', html })
          return
        }
        if (typeof content === 'string') {
          if (!cancelled) setPreview({ type: 'text', text: content })
          return
        }

        if (!cancelled) setPreview(null)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error al cargar la previsualización')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [docId, docMeta?.file_path, ext])

  const isEmpty = !loading && !error && !preview

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: badge.iconColor }}
          >
            {badge.label}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate text-sm">{docMeta?.title || 'Sin título'}</p>
            <p className="text-xs text-gray-400">{formatDate(docMeta?.updated_at)}</p>
          </div>
          <button
            onClick={() => { onOpen(docId); onClose() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-emerald-600 hover:bg-emerald-500 text-white transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div
          className="overflow-auto bg-gray-50"
          style={{ flex: 1, minHeight: 0, height: (preview?.type === 'pdf' || preview?.type === 'html') ? '640px' : undefined }}
        >

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-red-500 text-center px-8">{error}</p>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-400">Documento vacío</p>
            </div>
          )}

          {/* PDF nativo */}
          {preview?.type === 'pdf' && (
            <embed
              src={preview.src}
              type="application/pdf"
              className="w-full h-full min-h-[600px]"
            />
          )}

          {/* HTML (Word original desde Storage / Tiptap JSON) */}
          {preview?.type === 'html' && (
            <iframe
              title="Vista previa documento"
              style={{ width: '100%', height: '100%', minHeight: '560px', border: 'none', display: 'block' }}
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
                mark { padding: 0 2px; border-radius: 2px; }
                .task-list { list-style: none; padding-left: 0; }
                .task-item { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px; }
              </style></head><body><div class="page">${preview.html}</div></body></html>`}
            />
          )}

          {/* Texto plano */}
          {preview?.type === 'text' && (
            <div className="p-8">
              <pre className="bg-white shadow-sm rounded-xl mx-auto max-w-2xl p-8 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {preview.text || '(vacío)'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white shrink-0">
          <p className="text-xs text-gray-400">
            {docMeta?.file_path ? 'Archivo original' : 'Contenido guardado'} · Solo lectura
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
