import { supabase } from './supabaseClient'
import { paletteColor } from './palette'

// Un proyecto nuevo solo trae la columna oculta "Pendientes": Hoy, Mañana,
// Esta semana y Próximamente se calculan a partir de la fecha de cada tarea
const DEFAULT_COLUMNS = [
  { name: 'Pendientes', kind: 'pending', color: paletteColor('Gris'), position: -1 },
]

export async function getProjects(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    // El más reciente primero (la posición crece con cada proyecto nuevo)
    .order('position', { ascending: false })
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

  // Si falla, no se deshace el proyecto: el tablero crea "Pendientes" al
  // abrirlo (TasksContext). Se avisa en la consola para poder diagnosticarlo.
  const { error: colError } = await supabase.from('task_columns').insert(
    DEFAULT_COLUMNS.map(c => ({ ...c, user_id: userId, project_id: project.id }))
  )
  if (colError) console.warn('Columnas del proyecto nuevo:', colError.message)

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
    .select('column_id, completed_at, task_columns(project_id)')
    .eq('user_id', userId)
  if (error) return {}
  const counts = {}
  data.forEach(t => {
    if (t.completed_at) return // las completadas no cuentan como trabajo pendiente
    const pid = t.task_columns?.project_id
    if (pid) counts[pid] = (counts[pid] || 0) + 1
  })
  return counts
}
