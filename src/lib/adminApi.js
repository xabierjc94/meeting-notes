import { supabase } from '../lib/supabaseClient'

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, updates }),
    }
  )
  const result = await res.json()
  console.log('[updateProfile] status:', res.status, '| body:', result)
  if (!res.ok) throw new Error(result.error || `Error ${res.status} al actualizar usuario`)
  return result.data
}

export async function deleteProfile(userId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)
  if (error) throw error
}

export async function getActivityLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function getStats() {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: proUsers },
    { count: activeUsers },
    { count: expiringSoon },
    { data: logs },
    { data: todayUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('subscription', ['pro', 'enterprise']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true })
      .in('subscription', ['pro', 'enterprise'])
      .not('subscription_expires_at', 'is', null)
      .lte('subscription_expires_at', in7Days)
      .gte('subscription_expires_at', now.toISOString()),
    supabase.from('activity_logs').select('id').gt('created_at', yesterday),
    supabase.from('profiles').select('id').gt('created_at', yesterday),
  ])

  return {
    totalUsers: totalUsers || 0,
    proUsers: proUsers || 0,
    activeUsers: activeUsers || 0,
    expiringSoon: expiringSoon || 0,
    todayLogins: logs?.length || 0,
    newUsersToday: todayUsers?.length || 0,
  }
}
