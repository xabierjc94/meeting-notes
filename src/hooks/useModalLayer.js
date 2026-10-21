import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: Pila de ventanas (modales)
//
// Si hay un modal abierto y encima otro (p. ej. "¿Borrar tarea?" sobre
// el formulario de la tarea), Esc solo debe cerrar el de ARRIBA.
// Cada ventana se apunta en una pila al abrirse y se borra al cerrarse;
// el manejador de Esc solo actúa si su ventana es la última de la pila.
//
// useModalLayer además:
//   - mete el foco dentro de la ventana al abrirla,
//   - lo encierra: Tab y Shift+Tab dan la vuelta dentro (focus trap),
//   - y lo devuelve al elemento que lo tenía antes al cerrarla.
// ─────────────────────────────────────────────────────────────
const stack = []
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalLayer(onClose, { initialFocusRef } = {}) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const token = {}
    stack.push(token)
    const previous = document.activeElement
    const root = ref.current

    // Foco inicial: el indicado, el primer [autofocus] o el primer control
    const target = initialFocusRef?.current || root?.querySelector('[autofocus]') || root?.querySelector(FOCUSABLE)
    target?.focus()

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
      } else if (e.key === 'Tab' && root) {
        const items = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(token), 1)
      if (previous && previous !== document.body && previous.isConnected) previous.focus?.()
    }
  }, [initialFocusRef])

  return ref
}
