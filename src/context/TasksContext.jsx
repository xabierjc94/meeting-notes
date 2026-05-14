import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import {
  getColumns, createColumn, updateColumn, deleteColumn,
  getTasks, createTask, updateTask, deleteTask, batchUpdateTaskPositions
} from '../lib/tasksApi'
import { arrayMove } from '@dnd-kit/sortable'

const TasksContext = createContext()

export function TasksProvider({ children, projectId }) {
  const { user } = useAuth()
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !projectId) return
    setLoading(true)
    try {
      const [cols, tsks] = await Promise.all([
        getColumns(user.id, projectId),
        getTasks(user.id, projectId)
      ])
      setColumns(cols)
      setTasks(tsks)
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => { fetchData() }, [fetchData])

  const tasksByColumn = useMemo(() => {
    const map = {}
    columns.forEach(c => { map[c.id] = [] })
    tasks.forEach(t => { if (map[t.column_id]) map[t.column_id].push(t) })
    Object.values(map).forEach(arr => arr.sort((a, b) => a.position - b.position))
    return map
  }, [columns, tasks])

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

  const addTask = async (data) => {
    const colTasks = tasks.filter(t => t.column_id === data.column_id)
    const task = await createTask(user.id, { ...sanitizeTaskData(data), position: colTasks.length })
    setTasks(prev => [...prev, task])
    return task
  }

  const editTask = async (id, data) => {
    const task = await updateTask(id, 'due_date' in data ? sanitizeTaskData(data) : data)
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

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

  const reorderTasks = useCallback((columnId, reordered) => {
    const updated = reordered.map((t, i) => ({ ...t, position: i }))
    setTasks(prev => {
      const others = prev.filter(t => t.column_id !== columnId)
      return [...others, ...updated]
    })
    batchUpdateTaskPositions(updated.map(t => ({ id: t.id, column_id: t.column_id, position: t.position })))
  }, [])

  const moveTaskToColumn = useCallback((taskId, newColumnId, newIndex) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId)
      if (!task) return prev
      const rest = prev.filter(t => t.id !== taskId)
      const targetCol = rest.filter(t => t.column_id === newColumnId).sort((a, b) => a.position - b.position)
      targetCol.splice(newIndex, 0, { ...task, column_id: newColumnId })
      const updatedTarget = targetCol.map((t, i) => ({ ...t, position: i }))
      const others = rest.filter(t => t.column_id !== newColumnId)
      const result = [...others, ...updatedTarget]
      batchUpdateTaskPositions(updatedTarget.map(t => ({ id: t.id, column_id: t.column_id, position: t.position })))
      return result
    })
  }, [])

  return (
    <TasksContext.Provider value={{
      columns, tasks, tasksByColumn, loading,
      addColumn, editColumn, removeColumn,
      addTask, editTask, removeTask,
      reorderColumns, reorderTasks, moveTaskToColumn, fetchData
    }}>
      {children}
    </TasksContext.Provider>
  )
}

export const useTasks = () => useContext(TasksContext)
