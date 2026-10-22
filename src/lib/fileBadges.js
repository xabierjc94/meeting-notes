// Etiqueta de tipo de archivo (Word, PDF, Excel…) compartida por las tarjetas
// de la Biblioteca y las ventanas de vista previa. Fondo pastel + texto oscuro
// del mismo tono (como Pill): todas las combinaciones superan 9:1 de contraste.
export const FILE_BADGES = {
  docx: { bg: 'bg-pill-sky', text: 'text-pill-sky-ink', label: 'Word' },
  doc: { bg: 'bg-pill-sky', text: 'text-pill-sky-ink', label: 'Word' },
  pdf: { bg: 'bg-pill-red', text: 'text-pill-red-ink', label: 'PDF' },
  xlsx: { bg: 'bg-pill-mint', text: 'text-pill-mint-ink', label: 'Excel' },
  xls: { bg: 'bg-pill-mint', text: 'text-pill-mint-ink', label: 'Excel' },
  txt: { bg: 'bg-card-hover', text: 'text-ink-muted', label: 'TXT' },
  md: { bg: 'bg-pill-lilac', text: 'text-pill-lilac-ink', label: 'MD' },
}

// Documento creado en la app (sin archivo de origen)
export const DEFAULT_FILE_BADGE = { bg: 'bg-accent-soft', text: 'text-accent', label: 'DOC' }

export function getFileBadge(fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  return FILE_BADGES[ext] ?? null
}
