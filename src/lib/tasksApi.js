import { supabase } from './supabaseClient'

const DEFAULT_COLUMNS = [
  { name: 'Por hacer', color: '#6366f1', position: 0 },
  { name: 'En progreso', color: '#f59e0b', position: 1 },
  { name: 'Completado', color: '#10b981', position: 2 },
]

export async function getColumns(userId, projectId) {
  const { data, error } = await supabase
    .from('task_columns')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('position')
  if (error) throw error

  if (data.length === 0) {
    const { data: created, error: ce } = await supabase
      .from('task_columns')
      .insert(DEFAULT_COLUMNS.map(c => ({ ...c, user_id: userId, project_id: projectId })))
      .select()
    if (ce) throw ce
    return created.sort((a, b) => a.position - b.position)
  }
  return data
}

export async function createColumn(userId, projectId, data) {
  const { data: col, error } = await supabase
    .from('task_columns')
    .insert({ ...data, user_id: userId, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  return col
}

export async function updateColumn(id, data) {
  const { data: col, error } = await supabase
    .from('task_columns')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return col
}

export async function deleteColumn(id) {
  const { error } = await supabase.from('task_columns').delete().eq('id', id)
  if (error) throw error
}

export async function getTasks(userId, projectId) {
  const { data: columns, error: colError } = await supabase
    .from('task_columns')
    .select('id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
  if (colError) throw colError

  if (columns.length === 0) return []

  const columnIds = columns.map(c => c.id)
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .in('column_id', columnIds)
    .order('position')
  if (error) throw error
  return data
}

export async function createTask(userId, data) {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ ...data, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return task
}

export async function updateTask(id, data) {
  const { data: task, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return task
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function batchUpdateTaskPositions(updates) {
  await Promise.all(
    updates.map(u =>
      supabase.from('tasks').update({ column_id: u.column_id, position: u.position }).eq('id', u.id)
    )
  )
}
