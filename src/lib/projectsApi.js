import { supabase } from './supabaseClient'

const DEFAULT_COLUMNS = [
  { name: 'Por hacer', color: '#6366f1', position: 0 },
  { name: 'En progreso', color: '#f59e0b', position: 1 },
  { name: 'Completado', color: '#10b981', position: 2 },
]

export async function getProjects(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('position')
  if (error) throw error
  return data
}

export async function createProject(userId, data) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, user_id: userId })
    .select()
    .single()
  if (error) throw error

  await supabase.from('task_columns').insert(
    DEFAULT_COLUMNS.map(c => ({ ...c, user_id: userId, project_id: project.id }))
  )

  return project
}

export async function updateProject(id, data) {
  const { data: project, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return project
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function getProjectTaskCounts(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('column_id, task_columns(project_id)')
    .eq('user_id', userId)
  if (error) return {}
  const counts = {}
  data.forEach(t => {
    const pid = t.task_columns?.project_id
    if (pid) counts[pid] = (counts[pid] || 0) + 1
  })
  return counts
}
