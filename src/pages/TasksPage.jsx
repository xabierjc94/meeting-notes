import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { TasksProvider, useTasks } from '../context/TasksContext'
import KanbanBoard from '../components/tasks/KanbanBoard'
import ListView from '../components/tasks/ListView'
import TaskModal from '../components/tasks/TaskModal'
import { supabase } from '../lib/supabaseClient'

function TasksContent({ project }) {
  const { tasks, columns, loading } = useTasks()
  const [view, setView] = useState('kanban')
  const [showNewTask, setShowNewTask] = useState(false)

  const totalTasks = tasks.length
  const urgentTasks = tasks.filter(t => t.priority === 'urgent').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-slate-50">
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
    <div className="flex flex-col h-dvh bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/tasks"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-all shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: projectColor, boxShadow: `0 4px 12px ${projectColor}40` }}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
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

          <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === 'kanban' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className="hidden sm:inline">Tablero</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                view === 'list' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>

          <button
            onClick={() => setShowNewTask(true)}
            className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nueva tarea</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? <KanbanBoard /> : <ListView />}
      </div>

      {showNewTask && (
        <TaskModal
          defaultColumnId={columns[0]?.id}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </div>
  )
}

export default function TasksPage() {
  const { projectId } = useParams()
  const location = useLocation()
  const [project, setProject] = useState(location.state?.project || null)

  useEffect(() => {
    if (!project && projectId) {
      supabase.from('projects').select('*').eq('id', projectId).single()
        .then(({ data }) => { if (data) setProject(data) })
    }
  }, [projectId, project])

  return (
    <TasksProvider projectId={projectId}>
      <TasksContent project={project} />
    </TasksProvider>
  )
}
