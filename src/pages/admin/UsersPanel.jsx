import { useState, useMemo } from 'react'
import { useAdmin } from '../../context/AdminContext'
import AdminLayout from '../../components/admin/AdminLayout'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const subLabels = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }
const roleLabels = { user: 'Usuario', admin: 'Admin', superadmin: 'Super Admin' }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpiringSoon(iso) {
  if (!iso) return false
  const diff = new Date(iso) - new Date()
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
}

function isExpired(iso) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

function Badge({ children, color }) {
  const map = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-amber-100 text-amber-700',
    enterprise: 'bg-violet-100 text-violet-700',
    user: 'bg-slate-100 text-slate-600',
    admin: 'bg-blue-100 text-blue-700',
    superadmin: 'bg-violet-100 text-violet-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-red-100 text-red-700',
    expiring: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
  }
  return <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${map[color] || 'bg-slate-100'}`}>{children}</span>
}

function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    role: user.role || 'user',
    subscription: user.subscription || 'free',
    subscription_expires_at: user.subscription_expires_at
      ? new Date(user.subscription_expires_at).toISOString().slice(0, 16)
      : '',
    is_active: user.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const updates = {
        ...form,
        subscription_expires_at: form.subscription_expires_at || null,
      }
      await onSave(user.id, updates)
      onClose()
    } catch (err) {
      setSaveError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Editar usuario</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all bg-white"
              >
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Suscripción</label>
              <select
                value={form.subscription}
                onChange={e => setForm({ ...form, subscription: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all bg-white"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expiración suscripción
              <span className="ml-1 text-xs text-slate-400 font-normal">(dejar vacío = sin límite)</span>
            </label>
            <input
              type="datetime-local"
              value={form.subscription_expires_at}
              onChange={e => setForm({ ...form, subscription_expires_at: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700 cursor-pointer">Cuenta activa</label>
          </div>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{saveError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-500/20 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPanel() {
  const { profiles, loading, updateUser, removeUser, fetchData } = useAdmin()
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [confirmUser, setConfirmUser] = useState(null)
  const [subFilter, setSubFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = profiles
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
    }
    if (subFilter === 'active') result = result.filter(u => u.is_active)
    else if (subFilter === 'inactive') result = result.filter(u => !u.is_active)
    else if (subFilter === 'free') result = result.filter(u => u.subscription === 'free')
    else if (subFilter === 'pro') result = result.filter(u => u.subscription === 'pro')
    else if (subFilter === 'enterprise') result = result.filter(u => u.subscription === 'enterprise')
    else if (subFilter === 'expiring') result = result.filter(u => isExpiringSoon(u.subscription_expires_at))

    if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter)

    return result
  }, [profiles, search, subFilter, roleFilter])

  const handleDelete = async () => {
    await removeUser(confirmUser.id)
    await fetchData()
    setConfirmUser(null)
  }

  const subFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activos' },
    { key: 'inactive', label: 'Inactivos' },
    { key: 'free', label: 'Free' },
    { key: 'pro', label: 'Pro' },
    { key: 'enterprise', label: 'Enterprise' },
    { key: 'expiring', label: 'Expiran pronto' },
  ]

  const roleFilters = [
    { key: 'all', label: 'Todos los roles' },
    { key: 'user', label: 'Usuario' },
    { key: 'admin', label: 'Admin' },
    { key: 'superadmin', label: 'Super Admin' },
  ]

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Usuarios</h1>
            <p className="text-slate-500 mt-1">{profiles.length} usuarios registrados · {filtered.length} mostrados</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
        </div>

        {/* Subscription filters */}
        <div className="flex flex-wrap gap-2 mb-2">
          {subFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setSubFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subFilter === f.key
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-violet-200 hover:text-violet-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Role filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {roleFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === f.key
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-500/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="hidden lg:grid lg:grid-cols-8 gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-2">Usuario</div>
              <div>Rol</div>
              <div>Suscripción</div>
              <div>Expira</div>
              <div>Estado</div>
              <div>Registro</div>
              <div className="text-right">Acciones</div>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-slate-400">No se encontraron usuarios</p>
              ) : filtered.map(u => {
                const expiring = isExpiringSoon(u.subscription_expires_at)
                const expired = isExpired(u.subscription_expires_at)
                return (
                  <div key={u.id} className="px-6 py-4 flex flex-col lg:grid lg:grid-cols-8 gap-3 lg:items-center group">
                    {/* Usuario */}
                    <div className="flex items-center gap-3 lg:col-span-2">
                      <div className="w-9 h-9 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-violet-600">{(u.full_name || u.email || '').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{u.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    {/* Rol */}
                    <div>
                      <Badge color={u.role}>{roleLabels[u.role] || u.role}</Badge>
                    </div>
                    {/* Suscripción */}
                    <div>
                      <Badge color={u.subscription}>{subLabels[u.subscription]}</Badge>
                    </div>
                    {/* Expira */}
                    <div>
                      {u.subscription === 'free' ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : expired ? (
                        <Badge color="expired">Expirada</Badge>
                      ) : expiring ? (
                        <Badge color="expiring">{formatDate(u.subscription_expires_at)}</Badge>
                      ) : (
                        <span className="text-xs text-slate-500">{formatDate(u.subscription_expires_at)}</span>
                      )}
                    </div>
                    {/* Estado */}
                    <div>
                      <Badge color={u.is_active ? 'active' : 'inactive'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                    {/* Registro */}
                    <div>
                      <span className="text-xs text-slate-500">{formatDate(u.created_at)}</span>
                    </div>
                    {/* Acciones */}
                    <div className="flex lg:justify-end gap-2 pt-2 lg:pt-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmUser(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Eliminar perfil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {editingUser && (
        <EditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={async (id, form) => {
            await updateUser(id, form)
            await fetchData()
          }}
        />
      )}

      {confirmUser && (
        <ConfirmDialog
          title="Eliminar perfil"
          message={`¿Eliminar el perfil de ${confirmUser.email}? El usuario no podrá acceder a la app.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmUser(null)}
        />
      )}
    </AdminLayout>
  )
}
