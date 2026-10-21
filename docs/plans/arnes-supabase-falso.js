// ─────────────────────────────────────────────────────────────
// ARNÉS DE PRUEBAS: la app real con un Supabase falso en memoria
//
// Para qué sirve: las pantallas con sesión iniciada no se pueden ver sin
// las credenciales de Javi. Este arnés monta los componentes REALES
// (AppLayout, páginas, contextos) pero sustituye Supabase por una base de
// datos en memoria, con retrasos configurables.
//
// Cómo usarlo (navegador integrado, servidor de desarrollo arrancado):
//   1. Abrir http://localhost:5174/login (puerto de .claude/launch.json)
//   2. Pegar este archivo entero en javascript_tool y ejecutar.
//   3. Montar una ruta:  await window.arnes.montar('/tasks/proyecto-demo')
//   4. Inspeccionar:     window.arnes.db  (tablas en memoria)
//                        window.arnes.log (consultas hechas)
//                        window.arnes.retrasos.insert = 1500
//   5. Al terminar: recargar la página (se restaura el Supabase real).
//
// No se importa desde la app: es una herramienta de desarrollo.
// ─────────────────────────────────────────────────────────────
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const mainSrc = await (await fetch('/src/main.jsx')).text()
  const v = (mainSrc.match(/react-dom_client\.js\?v=([a-z0-9]+)/) || [])[1]
  const dep = (name) => import(`/node_modules/.vite/deps/${name}.js?v=${v}`)
  const React = (await dep('react')).default
  const { createRoot } = (await dep('react-dom_client')).default
  const RR = await dep('react-router-dom')
  const { HelmetProvider } = await dep('react-helmet-async')
  const { supabase } = await import('/src/lib/supabaseClient.js')

  const usuario = { id: 'u-1', email: 'javi@ejemplo.test', user_metadata: { full_name: 'Javi' } }
  const hoy = new Date()
  const dia = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  const hace = (n) => { const d = new Date(hoy); d.setDate(d.getDate() - n); d.setHours(10, 0, 0, 0); return d.toISOString() }
  const doc = (t) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] })

  // ── Datos de ejemplo ──
  const db = {
    profiles: [{ id: usuario.id, role: 'user' }],
    notes: [
      { id: 'n1', title: 'Daily de producto', meeting_date: dia(0), owner_id: usuario.id, updated_at: hace(0), created_at: hace(0), content: doc('Puntos del día') },
      { id: 'n2', title: 'Retro sprint 41', meeting_date: null, owner_id: usuario.id, updated_at: hace(1), created_at: hace(1), content: doc('Qué fue bien') },
      { id: 'n3', title: 'Kick-off cliente', meeting_date: null, owner_id: usuario.id, updated_at: hace(20), created_at: hace(20), content: doc('Alcance') },
    ],
    projects: [
      { id: 'p1', user_id: usuario.id, name: 'Proyecto demo', color: '#6366f1', description: 'Rebranding', position: 0, created_at: hace(30) },
      { id: 'p2', user_id: usuario.id, name: 'Web corporativa', color: '#10b981', description: null, position: 1, created_at: hace(10) },
    ],
    task_columns: [
      { id: 'c1', user_id: usuario.id, project_id: 'p1', name: 'Por hacer', color: '#6366f1', position: 0 },
      { id: 'c2', user_id: usuario.id, project_id: 'p1', name: 'En progreso', color: '#f59e0b', position: 1 },
      { id: 'c3', user_id: usuario.id, project_id: 'p1', name: 'Completado', color: '#10b981', position: 2 },
    ],
    tasks: [
      { id: 't1', user_id: usuario.id, column_id: 'c1', title: 'Ideas de logo', priority: 'high', tags: ['diseño'], due_date: dia(3), position: 0, created_at: hace(4) },
      { id: 't2', user_id: usuario.id, column_id: 'c1', title: 'Paleta de colores', priority: 'urgent', tags: ['diseño', 'urgente'], due_date: dia(-1), position: 1, created_at: hace(6) },
      { id: 't3', user_id: usuario.id, column_id: 'c2', title: 'Plan de marketing', priority: 'medium', tags: ['marketing'], due_date: dia(10), position: 0, created_at: hace(2) },
      { id: 't4', user_id: usuario.id, column_id: 'c3', title: 'Presupuesto', priority: 'low', tags: [], due_date: null, position: 0, created_at: hace(12) },
      { id: 't5', user_id: usuario.id, column_id: 'c2', title: 'Informe semanal', priority: 'medium', tags: [], due_date: dia(0), recurrence: 'weekly', position: 1, created_at: hace(14) },
    ],
    // Biblioteca: una carpeta y tres documentos (uno dentro, dos en la raíz)
    carpetas: [{ id: 'f1', owner_id: usuario.id, name: 'Contratos', color: '#38bdf8', created_at: hace(9) }],
    biblioteca: [
      { id: 'd1', owner_id: usuario.id, title: 'Acta de constitución', file_name: null, file_path: null, folder_id: null, created_at: hace(5), updated_at: hace(0), content: doc('Texto del acta') },
      { id: 'd2', owner_id: usuario.id, title: 'Informe trimestral', file_name: 'informe.pdf', file_path: null, folder_id: null, created_at: hace(8), updated_at: hace(2), content: doc('Resultados') },
      { id: 'd3', owner_id: usuario.id, title: 'Contrato marco', file_name: 'contrato.docx', file_path: null, folder_id: 'f1', created_at: hace(9), updated_at: hace(3), content: doc('Cláusulas') },
    ],
    personnel: [], gestion: [],
  }
  const log = []
  const retrasos = { select: 60, insert: 60, update: 60, delete: 60, rpc: 60 }

  // ── Supabase falso: cadena select/eq/in/order/single + insert/update/delete ──
  supabase.auth.getSession = async () => ({ data: { session: { user: usuario } } })
  supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } })
  supabase.auth.signOut = async () => ({ error: null })
  supabase.rpc = async (fn) => { await sleep(retrasos.rpc); log.push(`RPC ${fn}`); return { data: 0, error: null } }
  supabase.from = (tabla) => {
    const q = { op: 'select', filtros: [], orden: null, single: false, payload: null }
    const api = {
      select() { return api }, single() { q.single = true; return api }, maybeSingle() { q.single = true; return api },
      eq(k, val) { q.filtros.push((r) => r[k] === val); return api },
      in(k, vals) { q.filtros.push((r) => vals.includes(r[k])); return api },
      // Comparaciones que usa el panel de administración (adminApi.getStats)
      gt(k, val) { q.filtros.push((r) => r[k] > val); return api },
      lt(k, val) { q.filtros.push((r) => r[k] < val); return api },
      neq(k, val) { q.filtros.push((r) => r[k] !== val); return api },
      lte(k, val) { q.filtros.push((r) => r[k] != null && r[k] <= val); return api },
      gte(k, val) { q.filtros.push((r) => r[k] != null && r[k] >= val); return api },
      // Solo el caso que usa la app: .not(columna, 'is', null) → "no es nulo"
      not(k, op, val) {
        if (op !== 'is' || val !== null) throw new Error(`arnés: .not('${k}', '${op}', …) no está simulado`)
        q.filtros.push((r) => r[k] != null); return api
      },
      order(k, o = {}) { q.orden = { k, asc: o.ascending !== false }; return api },
      limit() { return api }, range() { return api },
      insert(p) { q.op = 'insert'; q.payload = p; return api },
      update(p) { q.op = 'update'; q.payload = p; return api },
      upsert(p) { q.op = 'insert'; q.payload = p; return api },
      delete() { q.op = 'delete'; return api },
      then(res, rej) { return run().then(res, rej) },
    }
    const run = async () => {
      await sleep(retrasos[q.op] ?? 60)
      const filas = (db[tabla] ??= [])
      const coincide = (r) => q.filtros.every((f) => f(r))
      if (q.op === 'insert') {
        const nuevas = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...r }))
        filas.push(...nuevas); log.push(`INSERT ${tabla}`)
        return { data: q.single ? nuevas[0] : nuevas, error: null }
      }
      if (q.op === 'update') {
        const tocadas = filas.filter(coincide); tocadas.forEach((r) => Object.assign(r, q.payload)); log.push(`UPDATE ${tabla} (${tocadas.length})`)
        return { data: q.single ? tocadas[0] ?? null : tocadas, error: null }
      }
      if (q.op === 'delete') {
        const quedan = filas.filter((r) => !coincide(r)); log.push(`DELETE ${tabla} (${filas.length - quedan.length})`); db[tabla] = quedan
        return { data: null, error: null }
      }
      let res = filas.filter(coincide).map((r) => structuredClone(r))
      if (q.orden) res.sort((a, b) => ((a[q.orden.k] ?? '') > (b[q.orden.k] ?? '') ? 1 : -1) * (q.orden.asc ? 1 : -1))
      log.push(`SELECT ${tabla} (${res.length})`)
      if (q.single) return res[0] ? { data: res[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
      // count: lo leen las consultas con { count: 'exact', head: true }
      return { data: res, error: null, count: res.length }
    }
    return api
  }

  // ── Montar la app real en una ruta ──
  const { AuthProvider } = await import('/src/context/AuthContext.jsx')
  const App = (await import('/src/App.jsx')).default
  async function montar(ruta = '/dashboard') {
    document.getElementById('arnes')?.remove()
    document.getElementById('root').style.display = 'none'
    const el = document.createElement('div'); el.id = 'arnes'
    document.body.appendChild(el)
    // App.jsx trae su propio BrowserRouter: navegamos con history antes de montar
    history.replaceState(null, '', ruta)
    createRoot(el).render(React.createElement(HelmetProvider, null, React.createElement(App)))
    await sleep(800)
    return el
  }
  window.arnes = { db, log, retrasos, montar, sleep, React, RR, AuthProvider }
  return 'Arnés listo: await window.arnes.montar("/tasks")'
})()
