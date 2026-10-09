import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../context/ProjectsContext'
import MobileTopBar from '../components/layout/MobileTopBar'
import Icon from '../components/ui/Icon'
import { ICONS } from '../components/ui/icons'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ProjectModal from '../components/tasks/ProjectModal'
import ProjectsSidebarSection from '../components/tasks/ProjectsSidebarSection'

function ProjectCard({ project, taskCount, onEdit, onDelete }) {
  return (
    <div
      className="group relative flex flex-col bg-white/6 backdrop-blur-md border border-white/10 border-l-4 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/10 transition-all duration-200"
      style={{ borderLeftColor: project.color }}
    >
      <Link to={`/tasks/${project.id}`} state={{ project }} className="flex-1 p-5 block">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ backgroundColor: `${project.color}25`, border: `1px solid ${project.color}40` }}>
            <svg className="w-5 h-5" style={{ color: project.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white/60 bg-white/8">
            {taskCount ?? 0} {taskCount === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>
      </Link>
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.preventDefault(); onEdit(project) }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={e => { e.preventDefault(); onDelete(project) }}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { projects, taskCounts, loading, addProject, editProject, removeProject } = useProjects()
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [confirmProject, setConfirmProject] = useState(null)

  const handleSave = async (data) => {
    if (editingProject) {
      await editProject(editingProject.id, data)
    } else {
      await addProject(data)
    }
    setEditingProject(null)
  }

  const handleDelete = async () => {
    try {
      await removeProject(confirmProject.id)
    } finally {
      setConfirmProject(null)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProject(null)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ProjectsSidebarSection />

      <MobileTopBar
        action={
          <button
            onClick={() => setShowModal(true)}
            aria-label="Nuevo proyecto"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20 transition-all"
          >
            <Icon d={ICONS.plus} className="w-5 h-5" />
          </button>
        }
      >
        <span className="font-bold text-white text-sm">Proyectos</span>
      </MobileTopBar>

      {/* Header (escritorio): la navegación entre secciones vive ya en la barra lateral */}
      <header className="hidden md:flex items-center justify-between gap-4 bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-3 shrink-0">
        <h1 className="text-lg font-bold text-white">Proyectos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20 shrink-0"
        >
          <Icon d={ICONS.plus} />
          Nuevo proyecto
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-white/10">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Sin proyectos todavía</h2>
            <p className="text-sm text-white/40 mb-6 max-w-xs">Crea tu primer proyecto para empezar a organizar tus tareas con tablero Kanban.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={taskCounts[project.id]}
                onEdit={handleEdit}
                onDelete={setConfirmProject}
              />
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border-2 border-dashed border-white/15 hover:border-violet-400/50 hover:bg-white/5 text-white/30 hover:text-white/60 text-sm font-medium transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo proyecto
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editingProject}
          position={projects.length}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {confirmProject && (
        <ConfirmDialog
          title="Eliminar proyecto"
          message={`¿Eliminar "${confirmProject.name}" y todas sus tareas? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmProject(null)}
        />
      )}
    </div>
  )
}
