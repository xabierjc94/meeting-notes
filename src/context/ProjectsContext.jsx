import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { getProjects, createProject, updateProject, deleteProject, getProjectTaskCounts } from '../lib/projectsApi'
import { buildSlugs } from '../lib/slugs'

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

  // URLs legibles (/tasks/marketing) en lugar del id de la base de datos
  const slugs = useMemo(() => buildSlugs(projects), [projects])

  const findProjectBySlug = useCallback((slug) => {
    for (const [id, s] of slugs) if (s === slug) return projects.find(p => p.id === id)
    return null
  }, [slugs, projects])

  // Acepta también un proyecto recién creado que aún no está en la lista
  const projectPath = useCallback((project) => {
    const slug = slugs.get(project.id) ?? buildSlugs([...projects, project]).get(project.id)
    return `/tasks/${slug}`
  }, [slugs, projects])

  const value = useMemo(
    () => ({ projects, taskCounts, loading, addProject, editProject, removeProject, setTaskCount, findProjectBySlug, projectPath }),
    [projects, taskCounts, loading, addProject, editProject, removeProject, setTaskCount, findProjectBySlug, projectPath]
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects() debe usarse dentro de <ProjectsProvider>')
  return ctx
}
