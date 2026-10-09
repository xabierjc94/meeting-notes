// ─────────────────────────────────────────────────────────────
// CONCEPTO: Copia de seguridad local (borrador)
//
// Mientras un cambio no está confirmado por el servidor, guardamos
// una copia en localStorage (memoria del navegador que sobrevive a
// recargas y cierres de pestaña). Si se cierra la pestaña o se va la
// conexión, al volver a abrir la nota la recuperamos.
//
// En cuanto el servidor confirma el guardado, la copia se borra:
// el borrador solo existe mientras hay algo "en el aire".
//
// localStorage puede fallar (modo privado, cuota llena), así que
// todas las operaciones van envueltas en try/catch.
// ─────────────────────────────────────────────────────────────

const PREFIX = 'meeting-notes:draft:'

export function draftKey(kind, id) {
  return `${PREFIX}${kind}:${id}`
}

export function readDraft(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeDraft(key, draft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Sin almacenamiento disponible: no hay nada que borrar
  }
}

// Compara dos valores JSON ignorando el orden de las claves.
// Hace falta porque Postgres (jsonb) puede devolver las claves de un
// objeto en otro orden que el editor, aunque el contenido sea idéntico.
export function sameJson(a, b) {
  return stableStringify(a) === stableStringify(b)
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}
