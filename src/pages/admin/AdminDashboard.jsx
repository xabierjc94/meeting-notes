import { useMemo } from 'react'
import { useAdmin } from '../../context/AdminContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { Link } from 'react-router-dom'

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (seconds < 60) return 'ahora'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`
  return `hace ${Math.floor(seconds / 86400)}d`
}

const subLabels = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }
const subColors = { free: 'bg-slate-100 text-slate-600', pro: 'bg-amber-100 text-amber-700', enterprise: 'bg-violet-100 text-violet-700' }

export default function AdminDashboard() {
  const { stats, profiles, logs, loading, error } = useAdmin()

  const recentUsers = useMemo(() => profiles.slice(0, 5), [profiles])

  if (loading) return <AdminSkeleton />

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen general de la plataforma</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            label="Total usuarios"
            value={stats?.totalUsers}
            color="violet"
          />
          <StatCard
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            label="Activos"
            value={stats?.activeUsers}
            color="emerald"
          />
          <StatCard
            icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            label="Pro / Enterprise"
            value={stats?.proUsers}
            color="amber"
          />
          <StatCard
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            label="Expiran en 7d"
            value={stats?.expiringSoon}
            color={stats?.expiringSoon > 0 ? 'red' : 'slate'}
          />
          <StatCard
            icon="M18 9v3m0 0v3m0 0h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            label="Nuevos hoy"
            value={stats?.newUsersToday}
            color="blue"
          />
          <StatCard
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            label="Actividad 24h"
            value={stats?.todayLogins}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Usuarios recientes</h2>
              <Link to="/admin/users" className="text-sm text-violet-600 hover:text-violet-500 font-medium">Ver todos</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentUsers.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-400">No hay usuarios todavía</p>
              ) : recentUsers.map(u => (
                <div key={u.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-violet-600">{(u.full_name || u.email || '').slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{u.full_name || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${subColors[u.subscription] || subColors.free}`}>
                    {subLabels[u.subscription] || 'Free'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Actividad reciente</h2>
              <Link to="/admin/activity" className="text-sm text-violet-600 hover:text-violet-500 font-medium">Ver todo</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-400">No hay actividad registrada</p>
              ) : logs.slice(0, 6).map(log => (
                <div key={log.id} className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">{log.action}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-4">
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
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-50 text-slate-400',
  }
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-48 mb-2" />
        <div className="h-4 bg-slate-100 rounded-lg w-64 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-100 rounded-2xl" />
          <div className="h-80 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    </AdminLayout>
  )
}
