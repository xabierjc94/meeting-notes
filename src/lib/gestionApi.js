import { supabase } from './supabaseClient'
import { paletteColor } from './palette'

// --- Personnel ---
export async function fetchPersonnel(userId, projectId) {
  const { data, error } = await supabase
    .from('personnel')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function sanitizeRecord(record) {
  return {
    ...record,
    fecha_incorporacion: record.fecha_incorporacion || null,
  }
}

export async function createPersonnel(userId, projectId, record) {
  const { data, error } = await supabase
    .from('personnel')
    .insert({ ...sanitizeRecord(record), user_id: userId, project_id: projectId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePersonnel(id, updates) {
  const { data, error } = await supabase
    .from('personnel')
    .update(sanitizeRecord(updates))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePersonnel(id) {
  const { error } = await supabase.from('personnel').delete().eq('id', id)
  if (error) throw error
}

// --- Positions ---
export async function fetchPositions(userId) {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function createPosition(userId, name) {
  const { data: existing } = await supabase
    .from('positions')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = existing?.[0]?.position != null ? existing[0].position + 1 : 0
  const { data, error } = await supabase
    .from('positions')
    .insert({ user_id: userId, name, position: nextPos })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePosition(id, name) {
  const { data, error } = await supabase
    .from('positions')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePosition(id) {
  const { error } = await supabase.from('positions').delete().eq('id', id)
  if (error) throw error
}

// --- Clinics ---
export async function fetchClinics(userId) {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function createClinic(userId, name) {
  const { data: existing } = await supabase
    .from('clinics')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = existing?.[0]?.position != null ? existing[0].position + 1 : 0
  const { data, error } = await supabase
    .from('clinics')
    .insert({ user_id: userId, name, position: nextPos })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClinic(id, name) {
  const { data, error } = await supabase
    .from('clinics')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClinic(id) {
  const { error } = await supabase.from('clinics').delete().eq('id', id)
  if (error) throw error
}

// --- Candidacy Statuses ---
export async function fetchStatuses(userId) {
  const { data, error } = await supabase
    .from('candidacy_statuses')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function createStatus(userId, name, color = paletteColor('Azul cielo')) {
  const { data: existing } = await supabase
    .from('candidacy_statuses')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = existing?.[0]?.position != null ? existing[0].position + 1 : 0
  const { data, error } = await supabase
    .from('candidacy_statuses')
    .insert({ user_id: userId, name, color, position: nextPos })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStatus(id, updates) {
  const { data, error } = await supabase
    .from('candidacy_statuses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStatus(id) {
  const { error } = await supabase.from('candidacy_statuses').delete().eq('id', id)
  if (error) throw error
}

export async function seedDefaultStatuses(userId) {
  const defaults = [
    { user_id: userId, name: 'Screen',      color: paletteColor('Gris'), position: 0 },
    { user_id: userId, name: 'Llamada',     color: paletteColor('Azul cielo'), position: 1 },
    { user_id: userId, name: 'Entrevista',  color: paletteColor('Lila'), position: 2 },
    { user_id: userId, name: 'Compartido',  color: paletteColor('Amarillo'), position: 3 },
    { user_id: userId, name: 'Descartado',  color: paletteColor('Rojo'), position: 4 },
    { user_id: userId, name: 'Final',       color: paletteColor('Naranja'), position: 5 },
    { user_id: userId, name: 'Contratado',  color: paletteColor('Verde'), position: 6 },
  ]
  const { error } = await supabase.from('candidacy_statuses').insert(defaults)
  if (error) throw error
}
