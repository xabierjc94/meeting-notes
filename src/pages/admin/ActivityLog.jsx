import { useState, useMemo } from 'react'
import { useAdmin } from '../../context/AdminContext'
import AdminLayout from '../../components/admin/AdminLayout'

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (seconds < 60) return 'ahora'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getActionIcon(action) {
  const a = action?.toLowerCase() || ''
  if (a.includes('login') || a.includes('sesión')) return { icon: 'M11 16l-4-4m0 0l4-4m-4 4h16', color: 'bg-pill-sky/15 text-pill-sky' }
  if (a.includes('register') || a.includes('registro') || a.includes('crear')) return { icon: 'M18 9v3m0 0v3m0 0h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'bg-accent-soft text-accent' }
  if (a.includes('delete') || a.includes('eliminar')) return { icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', color: 'bg-danger/10 text-danger' }
  if (a.includes('update') || a.includes('editar') || a.includes('cambio')) return { icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'bg-pill-yellow/15 text-pill-yellow' }
  return { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-card-hover text-ink-muted' }
}

export default function ActivityLog() {
  const { logs, loading } = useAdmin()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(l =>
      l.action?.toLowerCase().includes(q) ||
      l.profiles?.email?.toLowerCase().includes(q) ||
      l.profiles?.full_name?.toLowerCase().includes(q)
    )
  }, [logs, search])

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 min-h-full bg-canvas">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">Actividad</h1>
          <p className="text-ink-muted mt-1">Registro de acciones en la plataforma</p>
        </div>

        <div className="relative mb-6">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            aria-label="Buscar en la actividad"
            placeholder="Buscar por acción, email o nombre…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field pl-10"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-ink-muted font-medium">Sin actividad</p>
            <p className="text-ink-muted text-sm mt-1">Las acciones de los usuarios aparecerán aquí</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-line divide-y divide-line">
            {filtered.map(log => {
              const { icon, color } = getActionIcon(log.action)
              return (
                <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`} aria-hidden="true">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{log.action}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {log.profiles?.full_name || 'Desconocido'} ({log.profiles?.email || '—'})
                    </p>
                    {log.details && (
                      <div className="overflow-x-auto max-w-full mt-1">
                        <p className="text-xs text-ink-muted font-mono bg-canvas px-2 py-1 rounded whitespace-nowrap">
                          {JSON.stringify(log.details)}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-ink-muted shrink-0 whitespace-nowrap">{timeAgo(log.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
