// ─────────────────────────────────────────────────────────────
// CONCEPTO: Slug
//
// Un "slug" es la versión de un nombre apta para una URL:
//   "Reunión de Marketing 2026" → "reunion-de-marketing-2026"
//
// Así la URL del tablero es /tasks/reunion-de-marketing-2026 en vez de
// /tasks/3f2a9c1e-7b4d-4c1a-9e7f-0b2d6a8c5e11 (el id de la base de datos).
//
// No se guarda en la base de datos: se calcula a partir de la lista de
// proyectos del usuario. Si dos proyectos se llaman igual, el más
// reciente lleva un sufijo: "reunion", "reunion-2"…
// ─────────────────────────────────────────────────────────────

const MAX_LENGTH = 60

export function slugify(text) {
  const slug = (text || '')
    .normalize('NFD')                 // "ó" → "o" + tilde suelta
    .replace(/[̀-ͯ]/g, '')  // quitamos las tildes sueltas
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')      // espacios y símbolos → guion
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, '')
  return slug || 'proyecto'
}

// Devuelve un Map id → slug único. Se reparte por orden de creación para
// que un proyecto nuevo no le "robe" la URL a uno que ya existía.
export function buildSlugs(items) {
  const ordered = [...items].sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '') || String(a.id).localeCompare(String(b.id))
  )
  const used = new Set()
  const slugs = new Map()
  for (const item of ordered) {
    const base = slugify(item.name)
    let slug = base
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
    used.add(slug)
    slugs.set(item.id, slug)
  }
  return slugs
}
