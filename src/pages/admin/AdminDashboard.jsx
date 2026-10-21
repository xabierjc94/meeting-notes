import { useMemo } from 'react'
import { useAdmin } from '../../context/AdminContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { Link } from 'react-router-dom'
import Pill from '../../components/ui/Pill'

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (seconds < 60) return 'ahora'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`
  return `hace ${Math.floor(seconds / 86400)}d`
}

const subLabels = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }
// Tono de Pill por suscripción (pastillas del sistema de diseño)
const subTones = { free: 'neutral', pro: 'yellow', enterprise: 'accent' }

export default function AdminDashboard() {
  const { stats, profiles, logs, loading, error } = useAdmin()

  const recentUsers = useMemo(() => profiles.slice(0, 5), [profiles])

  if (loading) return <AdminSkeleton />

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 min-h-full bg-canvas">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">Dashboard</h1>
          <p className="text-ink-muted mt-1">Resumen general de la plataforma</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            label="Total usuarios"
            value={stats?.totalUsers}
            color="accent"
          />
          <StatCard
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            label="Activos"
            value={stats?.activeUsers}
            color="mint"
          />
          <StatCard
            icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            label="Pro / Enterprise"
            value={stats?.proUsers}
            color="yellow"
          />
          <StatCard
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            label="Expiran en 7d"
            value={stats?.expiringSoon}
            color={stats?.expiringSoon > 0 ? 'red' : 'neutral'}
          />
          <StatCard
            icon="M18 9v3m0 0v3m0 0h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            label="Nuevos hoy"
            value={stats?.newUsersToday}
            color="sky"
          />
          <StatCard
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            label="Actividad 24h"
            value={stats?.todayLogins}
            color="lilac"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-card rounded-2xl border border-line">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="font-semibold text-ink">Usuarios recientes</h2>
              <Link to="/admin/users" className="text-sm text-accent hover:text-accent-hover font-medium">Ver todos</Link>
            </div>
            <div className="divide-y divide-line">
              {recentUsers.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-ink-muted">No hay usuarios todavía</p>
              ) : recentUsers.map(u => (
                <div key={u.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-accent-soft rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-accent">{(u.full_name || u.email || '').slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{u.full_name || 'Sin nombre'}</p>
                    <p className="text-xs text-ink-muted truncate">{u.email}</p>
                  </div>
                  <Pill tone={subTones[u.subscription] || 'neutral'}>{subLabels[u.subscription] || 'Free'}</Pill>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-2xl border border-line">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="font-semibold text-ink">Actividad reciente</h2>
              <Link to="/admin/activity" className="text-sm text-accent hover:text-accent-hover font-medium">Ver todo</Link>
            </div>
            <div className="divide-y divide-line">
              {logs.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-ink-muted">No hay actividad registrada</p>
              ) : logs.slice(0, 6).map(log => (
                <div key={log.id} className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden="true" />
                    <span className="text-sm text-ink font-medium">{log.action}</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 ml-4">
                    {log.profiles?.email || 'Desconocido'} · {timeAgo(log.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    accent: 'bg-accent-soft text-accent',
    mint: 'bg-pill-mint/15 text-pill-mint',
    yellow: 'bg-pill-yellow/15 text-pill-yellow',
    sky: 'bg-pill-sky/15 text-pill-sky',
    lilac: 'bg-pill-lilac/15 text-pill-lilac',
    red: 'bg-danger/10 text-danger',
    neutral: 'bg-card-hover text-ink-muted',
  }
  return (
    <div className="bg-card rounded-2xl p-4 border border-line">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`} aria-hidden="true">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <p className="text-2xl font-bold text-ink">{value ?? '—'}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 min-h-full bg-canvas animate-pulse">
        <div className="h-8 bg-card-hover rounded-xl w-48 mb-2" />
        <div className="h-4 bg-card rounded-lg w-64 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-card rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-card rounded-2xl" />
          <div className="h-80 bg-card rounded-2xl" />
        </div>
      </div>
    </AdminLayout>
  )
}
