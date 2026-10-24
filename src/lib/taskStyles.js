// ─────────────────────────────────────────────────────────────
// Estilo visual de las tareas, compartido por Tablero, Lista,
// Calendario y Timeline: así una prioridad se ve igual en todas partes.
// Los tonos son las pills pastel del sistema de diseño (src/index.css).
// OJO: las clases van escritas ENTERAS (nada de `bg-pill-${tono}`):
// Tailwind solo genera las clases que encuentra literalmente en el código.
// ─────────────────────────────────────────────────────────────

export const PRIORITY = {
  urgent: { label: 'Urgente', tone: 'red', bar: 'bg-pill-red text-pill-red-ink', dot: 'bg-pill-red' },
  high: { label: 'Alta', tone: 'orange', bar: 'bg-pill-orange text-pill-orange-ink', dot: 'bg-pill-orange' },
  medium: { label: 'Media', tone: 'yellow', bar: 'bg-pill-yellow text-pill-yellow-ink', dot: 'bg-pill-yellow' },
  low: { label: 'Baja', tone: 'mint', bar: 'bg-pill-mint text-pill-mint-ink', dot: 'bg-pill-mint' },
}

export const priorityOf = (task) => PRIORITY[task.priority] || PRIORITY.medium

// Las etiquetas rotan entre tres tonos según un "hash" del texto: la misma
// etiqueta sale SIEMPRE del mismo color (#diseño siempre lila, por ejemplo)
// sin tener que guardar el color en la base de datos.
const TAG_TONES = ['lilac', 'rose', 'sky']
export function tagTone(tag) {
  let h = 0
  for (const ch of tag) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TAG_TONES[h % TAG_TONES.length]
}
