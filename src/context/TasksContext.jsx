import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  getColumns, createColumn, updateColumn, deleteColumn,
  getTasks, createTask, updateTask, deleteTask, generateRecurringTasks
} from '../lib/tasksApi'
import { arrayMove } from '@dnd-kit/sortable'
import { BUCKETS, bucketOf, compareTasks, defaultDateFor, isDone } from '../lib/taskBuckets'
import { useToday } from '../hooks/useToday'

const TasksContext = createContext()

// Columna oculta de cada proyecto: sus tareas se reparten en Hoy, Mañana,
// Esta semana y Próximamente según su fecha (ver lib/taskBuckets.js)
const PENDING_COLUMN = { name: 'Pendientes', kind: 'pending', color: '#a3a3a3', position: -1 }

export function TasksProvider({ children, projectId }) {
  const { user } = useAuth()
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const today = useToday()

  const fetchData = useCallback(async () => {
    if (!user || !projectId) return
    setLoading(true)
    try {
      // En paralelo: si el generador ha creado copias de tareas recurrentes,
      // volvemos a pedir las tareas (caso raro; el normal no espera nada extra)
      const [cols, tsks, generated] = await Promise.all([
        getColumns(user.id, projectId),
        getTasks(user.id, projectId),
        generateRecurringTasks().catch(err => { console.warn('Tareas recurrentes:', err.message); return 0 }),
      ])
      // Proyecto sin columna "Pendientes" (anterior al tablero por fechas):
      // se crea. Si dos pestañas lo intentan a la vez, la base de datos solo
      // admite una (índice único) y la otra vuelve a leer las columnas.
      let finalCols = cols
      if (!cols.some(c => c.kind === 'pending')) {
        try {
          finalCols = [await createColumn(user.id, projectId, PENDING_COLUMN), ...cols]
        } catch (err) {
          // Lo normal: otra pestaña la creó a la vez. Si falla por otra cosa
          // (p. ej. falta la parte A del SQL), que quede rastro en la consola.
          console.warn('Columna Pendientes:', err.message)
          finalCols = await getColumns(user.id, projectId)
        }
      }
      setColumns(finalCols)
      setTasks(generated > 0 ? await getTasks(user.id, projectId) : tsks)
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const pendingColumn = useMemo(() => columns.find(c => c.kind === 'pending') ?? null, [columns])
  const customColumns = useMemo(() => columns.filter(c => c.kind !== 'pending'), [columns])

  // El tablero ya repartido y ordenado:
  //   buckets:   { hoy: [...], manana: [...], semana: [...], proximamente: [...] }
  //   custom:    { [idColumnaExtra]: [...] }
  //   completed: [...] (la completada más reciente primero)
  // Una completada conserva su column_id: al desmarcarla vuelve sola a su sitio.
  const board = useMemo(() => {
    const buckets = Object.fromEntries(BUCKETS.map(b => [b.id, []]))
    const custom = Object.fromEntries(customColumns.map(c => [c.id, []]))
    const completed = []
    for (const task of tasks) {
      if (isDone(task)) completed.push(task)
      else if (pendingColumn && task.column_id === pendingColumn.id) buckets[bucketOf(task.due_date, today)]?.push(task)
      else custom[task.column_id]?.push(task)
    }
    Object.values(buckets).forEach(list => list.sort(compareTasks))
    Object.values(custom).forEach(list => list.sort(compareTasks))
    completed.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    return { buckets, custom, completed }
  }, [tasks, customColumns, pendingColumn, today])

  const addColumn = async (data) => {
    const col = await createColumn(user.id, projectId, { ...data, position: columns.length })
    setColumns(prev => [...prev, col])
    return col
  }

  const editColumn = async (id, data) => {
    const col = await updateColumn(id, data)
    setColumns(prev => prev.map(c => c.id === id ? col : c))
  }

  const removeColumn = async (id) => {
    await deleteColumn(id)
    setColumns(prev => prev.filter(c => c.id !== id))
    setTasks(prev => prev.filter(t => t.column_id !== id))
  }

  const sanitizeTaskData = (data) => ({
    ...data,
    due_date: data.due_date?.trim() || null,
  })

  // Sin columna indicada, la tarea va a "Pendientes" (y de ahí a su columna
  // de fecha). La posición ya no ordena el tablero, pero se sigue rellenando.
  const addTask = async (data) => {
    const columnId = data.column_id || pendingColumn?.id
    const colTasks = tasks.filter(t => t.column_id === columnId)
    const position = colTasks.length ? Math.max(...colTasks.map(t => t.position)) + 1 : 0
    const task = await createTask(user.id, { ...sanitizeTaskData(data), column_id: columnId, position })
    setTasks(prev => [...prev, task])
    return task
  }

  const editTask = async (id, data) => {
    const task = await updateTask(id, 'due_date' in data ? sanitizeTaskData(data) : data)
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

  // CONCEPTO: actualización optimista
  // La pantalla cambia al momento (sin esperar al servidor). Si el servidor
  // falla, se deshace el cambio y el error llega a quien llamó, que avisa.
  //
  // Dos cuidados:
  //   - Respuestas desordenadas: cada petición lleva un número por tarea y
  //     solo la última pinta la respuesta del servidor (si no, una respuesta
  //     vieja que llega tarde pisaría a una más nueva).
  //   - Si falla, solo se deshacen LOS CAMPOS QUE CAMBIÓ ESTA PETICIÓN, y
  //     solo si nadie los ha vuelto a cambiar desde entonces.
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])
  const requestSeq = useRef(new Map())

  const patchTask = useCallback(async (id, changes) => {
    const current = tasksRef.current.find(t => t.id === id)
    if (!current) return
    const keys = Object.keys(changes)
    const before = Object.fromEntries(keys.map(k => [k, current[k]]))
    const seq = (requestSeq.current.get(id) ?? 0) + 1
    requestSeq.current.set(id, seq)

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
    try {
      const saved = await updateTask(id, changes)
      if (requestSeq.current.get(id) === seq) setTasks(prev => prev.map(t => t.id === id ? saved : t))
      return saved
    } catch (err) {
      setTasks(prev => prev.map(t => {
        if (t.id !== id) return t
        const undo = Object.fromEntries(keys.filter(k => t[k] === changes[k]).map(k => [k, before[k]]))
        return { ...t, ...undo }
      }))
      throw err
    }
  }, [])

  // Completar o descompletar (no mueve la tarea de columna)
  const completeTask = useCallback((id, done) =>
    patchTask(id, { completed_at: done ? new Date().toISOString() : null }), [patchTask])

  const setInProgress = useCallback((id, value) =>
    patchTask(id, { in_progress: value }), [patchTask])

  // A una columna de fecha: pasa a "Pendientes" con la fecha indicada
  // (si no se indica, la de esa columna: hoy, mañana…)
  const moveToBucket = useCallback((id, bucketId, date = defaultDateFor(bucketId, today)) => {
    if (!pendingColumn) return Promise.reject(new Error('El proyecto no tiene columna Pendientes'))
    return patchTask(id, { column_id: pendingColumn.id, due_date: date || null })
  }, [patchTask, pendingColumn, today])

  // A una columna extra: conserva la fecha
  const moveToColumn = useCallback((id, columnId) =>
    patchTask(id, { column_id: columnId }), [patchTask])

  const removeTask = async (id) => {
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const reorderColumns = useCallback((oldIndex, newIndex) => {
    setColumns(prev => {
      const reordered = arrayMove(prev, oldIndex, newIndex).map((c, i) => ({ ...c, position: i }))
      reordered.forEach(c => updateColumn(c.id, { position: c.position }))
      return reordered
    })
  }, [])

  return (
    <TasksContext.Provider value={{
      columns, tasks, loading, today,
      pendingColumn, customColumns, board,
      addColumn, editColumn, removeColumn,
      addTask, editTask, removeTask,
      completeTask, setInProgress, moveToBucket, moveToColumn,
      reorderColumns, fetchData
    }}>
      {children}
    </TasksContext.Provider>
  )
}

export const useTasks = () => useContext(TasksContext)
