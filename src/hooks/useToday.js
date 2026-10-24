import { useEffect, useState } from 'react'
import { todayISO } from '../lib/dates'

// ─────────────────────────────────────────────────────────────
// Hoy ('AAAA-MM-DD', hora local) que se actualiza solo a medianoche.
// Si dejas la app abierta toda la noche, a las 00:00 las tareas pasan de
// "Mañana" a "Hoy" sin recargar.
//
// Un temporizador hasta la próxima medianoche (y 1 s de margen); al
// dispararse, cambia el estado y se vuelve a programar para la siguiente.
// ─────────────────────────────────────────────────────────────
export function useToday() {
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
    const timer = setTimeout(() => setToday(todayISO()), nextMidnight - now)
    // Con el portátil en reposo o el móvil en segundo plano el temporizador
    // se congela: al volver a la app se comprueba el día otra vez
    const recheck = () => { if (document.visibilityState === 'visible') setToday(todayISO()) }
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('focus', recheck)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('focus', recheck)
    }
  }, [today])

  return today
}
