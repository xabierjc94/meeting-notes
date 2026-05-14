import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProjects, createProject, updateProject, deleteProject, getProjectTaskCounts } from '../lib/projectsApi'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const PROJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#64748b'
]

function ProjectModal({ project, onClose, onSave, position }) {
  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || '#6366f1')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), color, position })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn">
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-5">
            {project ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-violet-200/70 mb-2">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Mi proyecto..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-violet-200/70 mb-2">Descripción (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe el proyecto..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-violet-200/70 mb-2">Color</label>
              <div className="flex flex-wrap gap-2.5">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 active:scale-95 ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
              >
                {saving ? 'Guardando...' : project ? 'Guardar' : 'Crear proyecto'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-white/15 text-white/70 text-sm font-semibold rounded-xl hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, taskCount, onEdit, onDelete }) {
  return (
    <div className="group relative flex flex-col bg-white/6 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/10 transition-all duration-200">
      <div className="h-1.5 w-full" style={{ backgroundColor: project.color }} />
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
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [taskCounts, setTaskCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [confirmProject, setConfirmProject] = useState(null)

  const fetchProjects = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [projs, counts] = await Promise.all([
        getProjects(user.id),
        getProjectTaskCounts(user.id)
      ])
      setProjects(projs)
      setTaskCounts(counts)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSave = async (data) => {
    if (editingProject) {
      const updated = await updateProject(editingProject.id, data)
      setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p))
    } else {
      const created = await createProject(user.id, { ...data, position: projects.length })
      setProjects(prev => [...prev, created])
    }
    setEditingProject(null)
  }

  const handleDelete = async () => {
    await deleteProject(confirmProject.id)
    setProjects(prev => prev.filter(p => p.id !== confirmProject.id))
    setConfirmProject(null)
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
    <div className="flex flex-col h-dvh bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white/70 hover:bg-white/10 active:bg-white/20 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Proyectos</h1>
              {projects.length > 0 && (
                <p className="text-xs text-white/40 truncate">{projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nuevo proyecto</span>
          </button>
        </div>
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
