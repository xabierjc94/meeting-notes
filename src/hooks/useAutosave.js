import { useState, useEffect, useLayoutEffect } from 'react'
import { createAutosaver } from '../lib/autosaver'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: Eventos del navegador para no perder lo último escrito
//
//   visibilitychange (hidden) → la pestaña pasa a segundo plano o el
//       móvil bloquea la pantalla. Guardamos YA, sin esperar al debounce.
//   pagehide     → la página se está cerrando o navegando fuera.
//   beforeunload → si aún hay algo sin confirmar, el navegador muestra
//       su aviso nativo de "¿Salir del sitio? Puede que no se guarden
//       los cambios". (El texto no se puede personalizar.)
//   online       → ha vuelto la conexión: reintentamos al momento.
//
// Si aun así la pestaña muere antes de que el servidor responda,
// el borrador en localStorage permite recuperar el texto al reabrir.
// ─────────────────────────────────────────────────────────────

export function useAutosave({ save, delay = 1000, draftKey = null }) {
  const [status, setStatus] = useState('saved')

  // useState con inicializador: el motor se crea UNA vez por editor
  const [saver] = useState(() => createAutosaver({
    save,
    delay,
    draftKey,
    owner: crypto.randomUUID(),
    onStatus: setStatus,
  }))

  // La función save puede cambiar entre renders; tras cada render le
  // pasamos al motor la versión más reciente
  useLayoutEffect(() => {
    saver.setSave(save)
  })

  useEffect(() => {
    saver.activate()

    const onHidden = () => {
      if (document.visibilityState === 'hidden') saver.flush()
    }
    const onPageHide = () => saver.flush()
    const onBeforeUnload = (e) => {
      if (!saver.hasUnsaved()) return
      saver.flush()
      e.preventDefault()
      e.returnValue = ''
    }
    const onOnline = () => saver.retryNow()

    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('online', onOnline)

    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('online', onOnline)
      saver.dispose()
    }
  }, [saver])

  return {
    status,
    queue: saver.queue,
    flush: saver.flush,
    retryNow: saver.retryNow,
  }
}
