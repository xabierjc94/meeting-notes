import { readDraft, writeDraft, clearDraft } from './drafts'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: Autoguardado que no pierde cambios
//
// El debounce clásico ("espera a que el usuario pare y guarda la
// ÚLTIMA llamada") pierde datos cuando varios campos comparten el
// mismo temporizador: si cambias el título y enseguida escribes en
// el cuerpo, solo se envía el cuerpo y el título nunca llega.
//
// Aquí, en vez de quedarnos con la última llamada, ACUMULAMOS:
//   queue({ title })  → pendiente = { title }
//   queue({ content}) → pendiente = { title, content }
// y al disparar el guardado se envía todo junto.
//
// Además:
//   - Solo hay un guardado "en vuelo" a la vez, para que dos
//     peticiones no lleguen desordenadas y la vieja pise a la nueva.
//   - Si falla, los cambios vuelven a la cola y se reintenta con
//     esperas crecientes (2s, 5s, 10s, 30s…).
//   - Todo lo no confirmado se copia en localStorage (borrador).
//
// Es JavaScript puro (sin React) para que sea fácil de razonar y probar.
// El hook useAutosave lo conecta con los componentes.
// ─────────────────────────────────────────────────────────────

const RETRY_DELAYS = [2000, 5000, 10000, 30000]

const isEmpty = (obj) => Object.keys(obj).length === 0

export function createAutosaver({ save, delay, draftKey = null, owner, onStatus }) {
  let pending = {}        // cambios aún no enviados
  let inFlight = null     // cambios enviados, esperando respuesta
  let timer = null
  let retries = 0
  let flushAgain = false
  let lastEditAt = null
  let disposed = false

  const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

  const setStatus = (status) => {
    if (!disposed) onStatus(status)
  }

  // El borrador refleja SIEMPRE lo que el servidor aún no ha confirmado
  const persistDraft = () => {
    if (!draftKey) return
    // Un editor ya cerrado solo puede tocar SU propio borrador. Si la nota
    // se reabrió, el editor nuevo ya recogió estos cambios (recuperación
    // automática o copia en conflicto) y no debemos pisar su borrador
    // con una versión más vieja.
    if (disposed && readDraft(draftKey)?.owner !== owner) return
    const changes = { ...(inFlight || {}), ...pending }
    if (isEmpty(changes)) {
      // Solo borramos el borrador si es nuestro: otra instancia del
      // editor (la misma nota reabierta) puede haber escrito uno más nuevo
      if (readDraft(draftKey)?.owner === owner) clearDraft(draftKey)
      return
    }
    writeDraft(draftKey, { owner, ts: lastEditAt, changes })
  }

  const schedule = (ms) => {
    clearTimeout(timer)
    timer = setTimeout(flush, ms)
  }

  function queue(changes) {
    pending = { ...pending, ...changes }
    lastEditAt = new Date().toISOString()
    persistDraft()
    setStatus(isOffline() ? 'offline' : 'unsaved')
    schedule(delay)
  }

  async function flush() {
    clearTimeout(timer)
    timer = null
    if (inFlight) {
      // Ya hay un guardado en curso: repetiremos al terminar
      flushAgain = true
      return
    }
    if (isEmpty(pending)) return

    const changes = pending
    pending = {}
    inFlight = changes
    setStatus('saving')

    try {
      await save(changes)
    } catch (err) {
      // Los cambios fallidos vuelven a la cola, debajo de los más nuevos
      inFlight = null
      pending = { ...changes, ...pending }
      persistDraft()
      flushAgain = false
      setStatus(isOffline() ? 'offline' : 'error')
      console.error('Error guardando:', err?.message ?? err)
      // Tras desmontar no reintentamos: la copia local queda en el
      // borrador y se recupera al reabrir. Así evitamos que un reintento
      // tardío pise una versión más nueva.
      if (!disposed) schedule(RETRY_DELAYS[Math.min(retries++, RETRY_DELAYS.length - 1)])
      return
    }

    inFlight = null
    retries = 0
    persistDraft()

    const again = flushAgain
    flushAgain = false
    if (again && !isEmpty(pending)) {
      flush()
      return
    }
    setStatus(isEmpty(pending) ? 'saved' : 'unsaved')
  }

  // Reintento manual (botón) o al recuperar la conexión
  function retryNow() {
    retries = 0
    flush()
  }

  const hasUnsaved = () => inFlight !== null || !isEmpty(pending)

  // El componente puede pasar una función save nueva en cada render
  function setSave(fn) {
    save = fn
  }

  // React (StrictMode) monta, desmonta y vuelve a montar: activate()
  // deshace el dispose() de ese primer desmontaje de prueba.
  function activate() {
    disposed = false
  }

  // Al cerrar el editor: enviamos lo pendiente una última vez
  function dispose() {
    flush()
    disposed = true
  }

  return { queue, flush, retryNow, hasUnsaved, setSave, activate, dispose }
}
