import { useState, useEffect } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { TasksProvider, useTasks } from '../context/TasksContext'
import KanbanBoard from '../components/tasks/KanbanBoard'
import ListView from '../components/tasks/ListView'
import TaskModal from '../components/tasks/TaskModal'
import { supabase } from '../lib/supabaseClient'

function TasksContent({ project }) {
  const { tasks, columns, loading, addColumn } = useTasks()
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

          <div className="flex items-center gap-2 shrink-0">
            {view === 'kanban' && (
              <button
                onClick={() => setShowNewColumn(true)}
                className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                <span className="hidden sm:inline">Nueva columna</span>
              </button>
            )}
            <button
              onClick={() => setShowNewTask(true)}
              className="w-10 h-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 active:scale-95 transition-all shadow-md shadow-violet-500/20"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nueva tarea</span>
            </button>
          </div>
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

      {showNewColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowNewColumn(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Nueva columna</h3>
            <form onSubmit={handleAddColumn} className="flex flex-col gap-3">
              <input
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="Nombre de la columna..."
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={savingCol || !newColName.trim()} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {savingCol ? 'Creando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => { setShowNewColumn(false); setNewColName('') }} className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
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
