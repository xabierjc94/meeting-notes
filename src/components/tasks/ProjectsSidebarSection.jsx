import { useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProjects } from '../../context/ProjectsContext'
import { useAppSidebar } from '../layout/AppSidebarContext'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'
import ProjectModal from './ProjectModal'

function ProjectsRailActions({ onNewProject }) {
  return (
    <button
      onClick={onNewProject}
      title="Nuevo proyecto"
      aria-label="Nuevo proyecto"
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 active:scale-95"
    >
      <Icon d={ICONS.plus} />
    </button>
  )
}

function ProjectsPanel({ projects, taskCounts, loading, onNewProject, onSelectProject }) {
  const { projectPath } = useProjects()
  return (
    <>
      <div className="px-6 pb-4">
        <h2 className="text-white font-semibold text-sm mb-3">Tus proyectos</h2>
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold
                     bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                     text-white transition-all duration-300 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Icon d={ICONS.plus} />
          Nuevo proyecto
        </button>
      </div>

      {/* Lista de proyectos */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="space-y-2 px-2 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 pt-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Icon d={ICONS.folder} className="w-8 h-8 text-slate-500" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-400">Sin proyectos todavía</p>
            <p className="text-xs text-slate-500 mt-1.5">Crea tu primer proyecto con el botón de arriba</p>
          </div>
        ) : (
          <nav aria-label="Proyectos" className="space-y-1">
            {projects.map((project) => (
              <NavLink
                key={project.id}
                to={projectPath(project)}
                onClick={onSelectProject}
                title={project.name}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color || '#6366f1' }} />
                <span className="flex-1 min-w-0 truncate font-medium">{project.name}</span>
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">{taskCounts[project.id] ?? 0}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </>
  )
}

// Sección «Tareas» de la barra lateral: pinta la lista en el panel y el «+» en el rail.
// El modal de nuevo proyecto se queda aquí (en la página, fuera de los portales): dentro del
// aside quedaría atrapado por su translate y, además, el panel se desmonta al plegar el menú
export default function ProjectsSidebarSection() {
  const { projects, taskCounts, loading, addProject, projectPath } = useProjects()
  const { panelEl, railEl, closeMobile } = useAppSidebar()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const openNewProject = () => {
    closeMobile()
    setShowModal(true)
  }

  const handleCreate = async (data) => {
    const created = await addProject(data)
    navigate(projectPath(created))
  }

  return (
    <>
      {panelEl && createPortal(
        <ProjectsPanel
          projects={projects}
          taskCounts={taskCounts}
          loading={loading}
          onNewProject={openNewProject}
          onSelectProject={closeMobile}
        />,
        panelEl
      )}
      {railEl && createPortal(<ProjectsRailActions onNewProject={openNewProject} />, railEl)}

      {showModal && (
        <ProjectModal
          position={projects.length}
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
        />
      )}
    </>
  )
}
