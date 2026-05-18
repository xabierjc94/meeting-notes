import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href

export const SUPPORTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

export function isSupportedFile(file) {
  return !!(SUPPORTED_TYPES[file.type] || getExtension(file.name))
}

function getExtension(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  return ['docx', 'doc', 'pdf', 'txt', 'md'].includes(ext) ? ext : null
}

// .docx → HTML string (mammoth)
async function parseDocx(file) {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  return { html: result.value, warnings: result.messages }
}

// .pdf → texto plano extraído página a página
async function parsePdf(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n\n'
  }

  return fullText.trim()
}

// .txt / .md → string
async function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

// Convierte texto plano en nodos Tiptap JSON (párrafos)
function textToTiptapJson(text) {
  const lines = text.split('\n')
  const content = lines
    .map(line => line.trim())
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    }))

  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

// Función principal: detecta tipo y parsea
export async function importFile(file) {
  const ext = SUPPORTED_TYPES[file.type] || getExtension(file.name)

  if (!ext) throw new Error(`Formato no soportado: ${file.name}`)

  if (ext === 'docx' || ext === 'doc') {
    const { html } = await parseDocx(file)
    // Devuelve HTML para que Tiptap lo renderice con setContent
    return { type: 'html', data: html }
  }

  if (ext === 'pdf') {
    const text = await parsePdf(file)
    return { type: 'json', data: textToTiptapJson(text) }
  }

  if (ext === 'txt' || ext === 'md') {
    const text = await parseTxt(file)
    return { type: 'json', data: textToTiptapJson(text) }
  }

  throw new Error(`Formato no soportado: ${ext}`)
}
