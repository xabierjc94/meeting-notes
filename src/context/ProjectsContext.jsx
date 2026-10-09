import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { getProjects, createProject, updateProject, deleteProject, getProjectTaskCounts } from '../lib/projectsApi'

const ProjectsContext = createContext(null)

function fetchAll(userId) {
  return Promise.all([getProjects(userId), getProjectTaskCounts(userId)])
}

export function ProjectsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [projects, setProjects] = useState([])
  const [taskCounts, setTaskCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUserId, setLastUserId] = useState(userId)

  // Si cambia la cuenta, vaciar la lista durante el render (sin efecto) para no enseñar la anterior
  if (lastUserId !== userId) {
    setLastUserId(userId)
    setProjects([])
    setTaskCounts({})
    setLoading(true)
  }

  // Carga por usuario: el estado solo se toca cuando llega la respuesta (y se ignora si ya no aplica)
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchAll(userId)
      .then(([projs, counts]) => {
        if (cancelled) return
        setProjects(projs)
        setTaskCounts(counts)
      })
      .catch(err => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const addProject = useCallback(async (data) => {
    const created = await createProject(userId, { ...data, position: projects.length })
    setProjects(prev => [...prev, created])
    return created
  }, [userId, projects.length])

  const editProject = useCallback(async (id, data) => {
    const updated = await updateProject(id, data)
    setProjects(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }, [])

  const removeProject = useCallback(async (id) => {
    await deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  // El tablero informa de su número de tareas para que el contador de la barra lateral no se quede viejo
  const setTaskCount = useCallback((id, count) => {
    setTaskCounts(prev => prev[id] === count ? prev : { ...prev, [id]: count })
  }, [])

  const value = useMemo(
    () => ({ projects, taskCounts, loading, addProject, editProject, removeProject, setTaskCount }),
    [projects, taskCounts, loading, addProject, editProject, removeProject, setTaskCount]
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects() debe usarse dentro de <ProjectsProvider>')
  return ctx
}
