// Prueba de src/lib/taskBuckets.js con Node (sin dependencias):
//   node docs/plans/probar-buckets.mjs
//
// Recorre una semana entera (lunes 19 a domingo 25 de octubre de 2026) como
// si cada día fuera "hoy" y comprueba en qué columna cae cada fecha.
// El resultado esperado se calcula de otra forma (contando días), para no
// copiar la misma lógica que se está probando.
import { bucketOf, bucketDateRange, defaultDateFor, shiftISO, compareTasks } from '../../src/lib/taskBuckets.js'

let fallos = 0
const check = (desc, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) { fallos++; console.log(`✗ ${desc}: salió ${JSON.stringify(got)}, se esperaba ${JSON.stringify(want)}`) }
}

const NOMBRES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// Esperado según la especificación, contando días:
//   d = días desde hoy; diaSemana = 0 (lunes) … 6 (domingo)
const esperado = (d, diaSemana) =>
  d <= 0 ? 'hoy' : d === 1 ? 'manana' : d <= 6 - diaSemana ? 'semana' : 'proximamente'

for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
  const hoy = shiftISO('2026-10-19', diaSemana)
  const nombre = `${NOMBRES[diaSemana]} ${hoy}`
  for (let d = -10; d <= 20; d++) {
    check(`${nombre}, tarea a ${d} días`, bucketOf(shiftISO(hoy, d), hoy), esperado(d, diaSemana))
  }
  check(`${nombre}, sin fecha`, bucketOf(null, hoy), 'proximamente')

  // Rangos del calendario: cada fecha del rango tiene que caer en su columna
  for (const id of ['hoy', 'manana', 'semana', 'proximamente']) {
    const r = bucketDateRange(id, hoy)
    if (!r) continue
    check(`${nombre}, rango ${id} (mín.)`, bucketOf(r.min, hoy), id)
    if (r.max) check(`${nombre}, rango ${id} (máx.)`, bucketOf(r.max, hoy), id)
    // (Hoy no: el día anterior es una atrasada, y las atrasadas van en Hoy)
    if (id !== 'hoy') check(`${nombre}, ${id}: el día antes del mínimo ya no es ${id}`, bucketOf(shiftISO(r.min, -1), hoy) === id, false)
  }
  const fecha = defaultDateFor('semana', hoy)
  if (fecha) check(`${nombre}, fecha por defecto de Esta semana`, bucketOf(fecha, hoy), 'semana')
}

// Fin de semana: "Esta semana" queda sin días
check('sábado: Esta semana no admite fechas', bucketDateRange('semana', '2026-10-24'), null)
check('domingo: Esta semana no admite fechas', bucketDateRange('semana', '2026-10-25'), null)
check('viernes: Esta semana = solo el domingo', bucketDateRange('semana', '2026-10-23'), { min: '2026-10-25', max: '2026-10-25', allowEmpty: false })

// Orden: fecha (sin fecha al final) y luego creación
const orden = [
  { id: 'c', due_date: null, created_at: '2026-10-01' },
  { id: 'b', due_date: '2026-10-20', created_at: '2026-10-05' },
  { id: 'a', due_date: '2026-10-20', created_at: '2026-10-02' },
  { id: 'd', due_date: '2026-10-18', created_at: '2026-10-09' },
].sort(compareTasks).map(t => t.id)
check('orden dentro de la columna', orden, ['d', 'a', 'b', 'c'])

console.log(fallos ? `\n${fallos} fallo(s)` : '✓ Todas las comprobaciones pasan')
process.exit(fallos ? 1 : 0)
