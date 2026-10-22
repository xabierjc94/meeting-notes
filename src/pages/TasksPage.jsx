import { useState, useEffect, useRef } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TasksProvider, useTasks } from '../context/TasksContext'
import { GestionProvider } from '../context/GestionContext'
import { useProjects } from '../context/ProjectsContext'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import ProjectsSidebarSection from '../components/tasks/ProjectsSidebarSection'
import KanbanBoard from '../components/tasks/KanbanBoard'
import ListView from '../components/tasks/ListView'
import TaskModal from '../components/tasks/TaskModal'
import GestionPanel from '../components/gestion/GestionPanel'
import MobileTopBar from '../components/layout/MobileTopBar'
import CalendarView from '../components/tasks/CalendarView'
import TimelineView from '../components/tasks/TimelineView'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Button from '../components/ui/Button'
import Pill from '../components/ui/Pill'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

// Color por defecto de proyecto y columna nuevos (gris neutro: el usuario
// elige su color; ya no forzamos el violeta antiguo)
const DEFAULT_COLOR = '#a3a3a3'

// Vistas del proyecto. El id es lo que se guarda en la URL (?vista=calendario):
// recargar no te devuelve al tablero y el enlace se puede compartir.
const VIEWS = [
  { id: 'tablero', label: 'Tablero', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
  { id: 'lista', label: 'Lista', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id: 'timeline', label: 'Timeline', icon: 'M4 6h10M8 12h12M4 18h8' },
  { id: 'calendario', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'gestion', label: 'Gestión', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
]
const VIEW_IDS = VIEWS.map(v => v.id)

function TasksContent({ project, projectId }) {
  const { tasks, columns, loading, addColumn } = useTasks()
  const { setTaskCount } = useProjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = VIEW_IDS.includes(searchParams.get('vista')) ? searchParams.get('vista') : 'tablero'
  // replace: cambiar de pestaña no llena el historial del botón "Atrás"
  const setView = (id) => setSearchParams(id === 'tablero' ? {} : { vista: id }, { replace: true })
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewColumn, setShowNewColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [savingCol, setSavingCol] = useState(false)
  const newColRef = useRef(null)

  const closeNewColumn = () => { setShowNewColumn(false); setNewColName('') }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColName.trim()) return
    setSavingCol(true)
    try {
      await addColumn({ name: newColName.trim(), color: DEFAULT_COLOR })
      closeNewColumn()
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-canvas">
        <Spinner size="lg" label="Cargando tareas" />
        <p className="text-ink-muted text-sm">Cargando tareas…</p>
      </div>
    )
  }

  const projectColor = project?.color || DEFAULT_COLOR
  const plus = <Icon d={ICONS.plus} />

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas">
      <Helmet><title>{`${project?.name ?? 'Tareas'} — Tareas — MeetingNotes`}</title></Helmet>

      <PageHeader
        breadcrumb={[{ label: 'Tareas', to: '/tasks' }, { label: project?.name || 'Proyecto' }]}
        title={project?.name || 'Proyecto'}
        icon={<span className="shrink-0 w-9 h-9 rounded-xl" style={{ backgroundColor: projectColor }} aria-hidden="true" />}
        meta={totalTasks > 0 && (
          <>
            <Pill tone="neutral">{totalTasks} tareas</Pill>
            {urgentTasks > 0 && <Pill tone="red">{urgentTasks} urgentes</Pill>}
          </>
        )}
        actions={
          <>
            {view === 'tablero' && (
              <Button variant="secondary" onClick={() => setShowNewColumn(true)} aria-label="Nueva columna" icon={<Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />} className="max-sm:w-10 max-sm:px-0">
                <span className="hidden sm:inline">Nueva columna</span>
              </Button>
            )}
            {view !== 'gestion' && (
              <Button onClick={() => setShowNewTask(true)} aria-label="Nueva tarea" icon={plus} className="max-sm:w-10 max-sm:px-0">
                <span className="hidden sm:inline">Nueva tarea</span>
              </Button>
            )}
          </>
        }
      >
        <Tabs
          label="Vistas del proyecto"
          items={VIEWS.map(v => ({ ...v, icon: <Icon d={v.icon} className="w-4 h-4" /> }))}
          value={view}
          onChange={setView}
          panelId="project-view"
          className="mt-4 -mb-3"
        />
      </PageHeader>

      <div className="flex-1 overflow-hidden" role="tabpanel" id="project-view" aria-labelledby={`project-view-tab-${view}`}>
        {view === 'tablero' && <KanbanBoard />}
        {view === 'lista' && <ListView />}
        {view === 'timeline' && <TimelineView />}
        {view === 'calendario' && <CalendarView />}
        {view === 'gestion' && <GestionPanel />}
      </div>

      {showNewTask && (
        <TaskModal
          defaultColumnId={columns[0]?.id}
          onClose={() => setShowNewTask(false)}
        />
      )}

      {showNewColumn && (
        <Modal
          title="Nueva columna"
          size="sm"
          onClose={closeNewColumn}
          initialFocusRef={newColRef}
          footer={
            <>
              <Button type="submit" form="new-column-form" disabled={savingCol || !newColName.trim()} className="flex-1">
                {savingCol ? 'Creando…' : 'Crear'}
              </Button>
              <Button variant="secondary" onClick={closeNewColumn} className="flex-1">Cancelar</Button>
            </>
          }
        >
          <form id="new-column-form" onSubmit={handleAddColumn}>
            <label htmlFor="new-column-name" className="block text-xs font-medium text-ink-muted mb-1.5">Nombre</label>
            <input
              id="new-column-name"
              type="text"
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              placeholder="Por ejemplo: En revisión"
              ref={newColRef}
              className="field"
            />
          </form>
        </Modal>
      )}
    </div>
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function TasksPage() {
  // La URL lleva el slug del proyecto (/tasks/marketing), no su id
  const { slug } = useParams()
  const { projects, loading, findProjectBySlug, projectPath } = useProjects()
  const [lastProjectId, setLastProjectId] = useState(null)

  const project = findProjectBySlug(slug)

  // Recordamos el último proyecto abierto (ajuste de estado durante el render)
  if (project && project.id !== lastProjectId) setLastProjectId(project.id)

  if (loading) {
    return (
      <>
        <ProjectsSidebarSection />
        <BoardMessage>Cargando proyecto...</BoardMessage>
      </>
    )
  }

  if (!project) {
    // Enlaces antiguos con el id (/tasks/3f2a…) o proyecto renombrado
    // estando dentro: redirigimos a su URL actual. replace evita que el
    // botón "atrás" vuelva a la URL vieja.
    const moved = projects.find(p => p.id === (UUID_RE.test(slug) ? slug : lastProjectId))
    if (moved) return <Navigate to={projectPath(moved)} replace />
    return (
      <>
        <ProjectsSidebarSection />
        <BoardMessage>
          No encontramos este proyecto.{' '}
          <Link to="/tasks" className="text-accent underline underline-offset-2 hover:text-accent-hover">Ver todos los proyectos</Link>
        </BoardMessage>
      </>
    )
  }

  return (
    <>
      <ProjectsSidebarSection />
      {/* key: al cambiar de proyecto se reinician datos, vista y modales del tablero */}
      <TasksProvider key={project.id} projectId={project.id}>
        <GestionProvider projectId={project.id}>
          <TasksContent project={project} projectId={project.id} />
        </GestionProvider>
      </TasksProvider>
    </>
  )
}

function BoardMessage({ children }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas">
      <MobileTopBar />
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-ink-muted text-center">{children}</p>
      </div>
    </div>
  )
}
