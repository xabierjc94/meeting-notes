import { useRef, useCallback, useLayoutEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// CONCEPTO: Debounce
//
// Problema: si guardamos en Supabase en cada pulsación de tecla,
// con 100 caracteres haremos 100 llamadas a la BD.
//
// Solución: esperar a que el usuario PARE de escribir X milisegundos
// antes de ejecutar la función.
//
// Cada vez que se llama a la función devuelta:
//   1. Cancela el timer anterior (clearTimeout)
//   2. Inicia un timer nuevo
//   3. Solo si el timer llega a 0 (el usuario paró), ejecuta fn()
//
// CONCEPTO: useRef para valores mutables sin re-render
//
// useRef crea una "caja" que persiste entre renders.
// Mutar ref.current NO provoca un re-render (diferencia con useState).
// Ideal para: timers, referencias al DOM, el valor más reciente de una función.
// ─────────────────────────────────────────────────────────────

export function useDebounce(fn, delay) {
  // Guardamos siempre la versión más reciente de fn sin re-crear el hook
  const fnRef = useRef(fn)
  const timerRef = useRef(null)

  // useLayoutEffect se ejecuta de forma síncrona tras cada render,
  // antes de que el navegador pinte. Garantiza que fnRef siempre
  // apunte a la versión actual de fn.
  useLayoutEffect(() => {
    fnRef.current = fn
  })

  // useCallback con [delay] como dependencia:
  // la función devuelta solo se re-crea si delay cambia.
  // Esto es importante para no romper memoizaciones en componentes hijos.
  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        fnRef.current(...args)
      }, delay)
    },
    [delay]
  )
}