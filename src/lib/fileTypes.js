// Separado de fileImport.js para poder validar archivos sin descargar
// mammoth ni pdfjs (que solo se cargan al importar de verdad).

export const SUPPORTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

export function getExtension(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  return ['docx', 'doc', 'pdf', 'txt', 'md'].includes(ext) ? ext : null
}

export function isSupportedFile(file) {
  return !!(SUPPORTED_TYPES[file.type] || getExtension(file.name))
}
