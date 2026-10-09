import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { TasksProvider, useTasks } from '../context/TasksContext'
import { GestionProvider } from '../context/GestionContext'
import { useProjects } from '../context/ProjectsContext'
import { useAppSidebar } from '../components/layout/AppSidebarContext'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import ProjectsSidebarSection from '../components/tasks/ProjectsSidebarSection'
import KanbanBoard from '../components/tasks/KanbanBoard'
import ListView from '../components/tasks/ListView'
import TaskModal from '../components/tasks/TaskModal'
import GestionPanel from '../components/gestion/GestionPanel'
import { supabase } from '../lib/supabaseClient'

function TasksContent({ project, projectId }) {
  const { tasks, columns, loading, addColumn } = useTasks()
  const { setTaskCount } = useProjects()
  const { openMobile } = useAppSidebar()
  const [view, setView] = useState('kanban')
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewColumn, setShowNewColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [savingCol, setSavingCol] = useState(false)

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColName.trim()) return
    setSavingCol(true)
    try {
      await addColumn({ name: newColName.trim(), color: '#6366f1' })
      setNewColName('')
      setShowNewColumn(false)
    } finally {
      setSavingCol(false)
    }
  }

  const totalTasks = tasks.length
  const urgentTasks = tasks.filter(t => t.priority === 'urgent').length

  // Mantener al día el contador del proyecto en la barra lateral. Un proyecto real siempre tiene
  // columnas: sin ellas la carga ha fallado y no se pisa el contador con un 0 falso
  const loaded = !loading && columns.length > 0
  useEffect(() => {
    if (loaded) setTaskCount(projectId, totalTasks)
  }, [loaded, projectId, totalTasks, setTaskCount])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">Cargando tareas...</p>
        </div>
      </div>
    )
  }

  const projectColor = project?.color || '#6366f1'

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      {/* @container: la cabecera se adapta a SU ancho (cambia con la barra lateral), no al de la pantalla */}
      <header className="@container bg-black/20 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 @2xl:flex-nowrap @2xl:gap-4">
          {/* Solo móvil: abre el drawer con la lista de proyectos y las secciones */}
          <button
            onClick={openMobile}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 transition-colors shrink-0"
            aria-label="Abrir menú"
          >
            <Icon d={ICONS.menu} className="w-5 h-5" />
          </button>

          <Link
            to="/tasks"
            aria-label="Volver a proyectos"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="hidden @lg:flex w-9 h-9 rounded-xl items-center justify-center shrink-0"
              style={{ backgroundColor: projectColor, boxShadow: `0 4px 12px ${projectColor}40` }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                {project?.name || 'Proyecto'}
              </h1>
              {totalTasks > 0 && (
                <p className="text-xs text-slate-400 truncate">
                  {totalTasks} tareas
                  {urgentTasks > 0 && <span className="text-red-500 font-medium"> · {urgentTasks} urgentes</span>}
                </p>
              )}
            </div>
          </div>

          {/* Estrecho: segunda fila a todo el ancho para que el título tenga sitio */}
          <div className="order-last w-full @2xl:order-none @2xl:w-auto flex bg-white/5 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setView('kanban')}
              className={`flex-1 @2xl:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === 'kanban' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span>Tablero</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex-1 @2xl:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Lista</span>
            </button>
            <button
              onClick={() => setView('gestion')}
              className={`flex-1 @2xl:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === 'gestion' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Gestión</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {view === 'kanban' && (
              <button
                onClick={() => setShowNewColumn(true)}
                title="Nueva columna"
                aria-label="Nueva columna"
                className="w-10 h-10 @4xl:w-auto @4xl:px-4 flex items-center justify-center gap-2 border border-white/10 text-slate-300 rounded-xl text-sm font-semibold hover:bg-white/10 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                <span className="hidden @4xl:inline">Nueva columna</span>
              </button>
            )}
            {view !== 'gestion' && (
              <button
                onClick={() => setShowNewTask(true)}
                title="Nueva tarea"
                aria-label="Nueva tarea"
                className="w-10 h-10 @4xl:w-auto @4xl:px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden @4xl:inline">Nueva tarea</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {view === 'kanban' && <KanbanBoard />}
        {view === 'list' && <ListView />}
        {view === 'gestion' && <GestionPanel />}
      </div>

      {showNewTask && (
        <TaskModal
          defaultColumnId={columns[0]?.id}
          onClose={() => setShowNewTask(false)}
        />
      )}

      {showNewColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowNewColumn(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">Nueva columna</h3>
            <form onSubmit={handleAddColumn} className="flex flex-col gap-3">
              <input
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="Nombre de la columna..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={savingCol || !newColName.trim()} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {savingCol ? 'Creando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => { setShowNewColumn(false); setNewColName('') }} className="flex-1 py-3 border border-white/10 text-slate-300 text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { projectId } = useParams()
  const location = useLocation()
  const { projects, loading: projectsLoading } = useProjects()
  const [fetched, setFetched] = useState(null)

  // El proyecto sale de la lista compartida; el state de la navegación y la consulta directa son
  // solo respaldo. Todo se filtra por projectId para no mostrar el anterior al cambiar desde la barra
  const listed = projects.find(p => p.id === projectId)
  const fromState = location.state?.project?.id === projectId ? location.state.project : null
  const project = listed ?? fromState ?? (fetched?.id === projectId ? fetched : null)
  const needsFetch = !listed && !fromState && !projectsLoading

  useEffect(() => {
    if (!needsFetch || !projectId) return
    let cancelled = false
    supabase.from('projects').select('*').eq('id', projectId).single()
      .then(({ data }) => { if (data && !cancelled) setFetched(data) })
    return () => { cancelled = true }
  }, [projectId, needsFetch])

  return (
    <>
      <ProjectsSidebarSection />
      {/* key: al cambiar de proyecto se reinician datos, vista y modales del tablero */}
      <TasksProvider key={projectId} projectId={projectId}>
        <GestionProvider projectId={projectId}>
          <TasksContent project={project} projectId={projectId} />
        </GestionProvider>
      </TasksProvider>
    </>
  )
}
