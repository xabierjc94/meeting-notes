// Se ejecuta en el build de Docker antes de `vite build`.
// Vite incrusta estas variables en el JS público, así que un valor mal pegado
// no falla en el build: llega a producción y rompe el login ("Invalid API key").

const url = process.env.VITE_SUPABASE_URL ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const errors = []

if (!url) errors.push('Falta VITE_SUPABASE_URL.')
if (!key) errors.push('Falta VITE_SUPABASE_ANON_KEY.')

if (/\s/.test(url) || /\s/.test(key)) {
  errors.push('Hay espacios o saltos de línea en VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.')
}

if (url && !/^https:\/\/[^/]+$/.test(url.replace(/\/$/, ''))) {
  errors.push(`VITE_SUPABASE_URL debe ser solo el dominio con https:// (recibido: "${url}").`)
}

if (key.startsWith('sb_secret_')) {
  errors.push('VITE_SUPABASE_ANON_KEY es una clave SECRETA (sb_secret_...). Nunca debe ir en el frontend: usa la publishable/anon.')
} else if (key.startsWith('eyJ')) {
  const parts = key.split('.')
  if (parts.length !== 3 || parts.some(p => p.length === 0) || parts[2].length < 43) {
    errors.push(
      `VITE_SUPABASE_ANON_KEY está incompleta: un JWT tiene 3 partes separadas por puntos ` +
      `y esta tiene ${parts.length} (longitudes ${parts.map(p => p.length).join('/')}). ¿Se copió a medias?`
    )
  } else {
    let payload = null
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    } catch {
      errors.push('VITE_SUPABASE_ANON_KEY no se puede decodificar: el contenido del JWT está dañado.')
    }
    if (payload?.role === 'service_role') {
      errors.push('VITE_SUPABASE_ANON_KEY es la clave service_role. Nunca debe ir en el frontend: salta todas las reglas RLS.')
    } else if (payload && payload.role !== 'anon') {
      errors.push(`VITE_SUPABASE_ANON_KEY tiene rol "${payload.role}", se esperaba "anon".`)
    }
    const host = url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
    if (payload?.ref && host && payload.ref !== host) {
      errors.push(`La clave es del proyecto "${payload.ref}" pero la URL apunta a "${host}".`)
    }
  }
} else if (key && !key.startsWith('sb_publishable_')) {
  errors.push('VITE_SUPABASE_ANON_KEY no tiene un formato reconocido (se esperaba eyJ... o sb_publishable_...).')
}

if (errors.length) {
  console.error('\nERROR en las variables de Supabase:\n' + errors.map(e => `  - ${e}`).join('\n') + '\n')
  process.exit(1)
}

console.log('Variables de Supabase OK.')
