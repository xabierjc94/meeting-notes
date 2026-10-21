import { useState, useMemo, useRef } from 'react'
import { useAdmin } from '../../context/AdminContext'
import AdminLayout from '../../components/admin/AdminLayout'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Pill from '../../components/ui/Pill'

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

// Etiqueta de rol, suscripción o estado: pastilla pastel del sistema de diseño
const BADGE_TONES = {
  free: 'neutral', pro: 'yellow', enterprise: 'accent',
  user: 'neutral', admin: 'sky', superadmin: 'lilac',
  active: 'mint', inactive: 'red',
  expiring: 'orange', expired: 'red',
}

function Badge({ children, color }) {
  return <Pill tone={BADGE_TONES[color] || 'neutral'}>{children}</Pill>
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
  const nameRef = useRef(null)
  // Mientras se guarda no se puede cerrar: si falla, el error tiene que verse
  const close = () => { if (!saving) onClose() }

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
    <Modal
      title="Editar usuario"
      onClose={close}
      initialFocusRef={nameRef}
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="submit" form="edit-user-form" disabled={saving} className="flex-1">
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button variant="secondary" onClick={close} disabled={saving} className="flex-1">Cancelar</Button>
        </>
      }
    >
      {/* htmlFor + id en cada campo: la etiqueta queda ligada a su control */}
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-user-name" className="block text-xs font-medium text-ink-muted mb-1.5">Nombre</label>
          <input id="edit-user-name" ref={nameRef} type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="field" />
        </div>
        <div>
          <label htmlFor="edit-user-email" className="block text-xs font-medium text-ink-muted mb-1.5">Email</label>
          <input id="edit-user-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-user-role" className="block text-xs font-medium text-ink-muted mb-1.5">Rol</label>
            <select id="edit-user-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="field">
              <option value="user">Usuario</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="edit-user-sub" className="block text-xs font-medium text-ink-muted mb-1.5">Suscripción</label>
            <select id="edit-user-sub" value={form.subscription} onChange={e => setForm({ ...form, subscription: e.target.value })} className="field">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="edit-user-expires" className="block text-xs font-medium text-ink-muted mb-1.5">
            Expiración suscripción
            <span className="ml-1 text-ink-subtle font-normal">(dejar vacío = sin límite)</span>
          </label>
          <input id="edit-user-expires" type="datetime-local" value={form.subscription_expires_at} onChange={e => setForm({ ...form, subscription_expires_at: e.target.value })} className="field [color-scheme:dark]" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={e => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4 accent-accent cursor-pointer"
          />
          <label htmlFor="is_active" className="text-sm text-ink cursor-pointer">Cuenta activa</label>
        </div>
        {saveError && (
          <p role="alert" className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-4 py-2.5">{saveError}</p>
        )}
      </form>
    </Modal>
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
      <div className="p-6 sm:p-8 min-h-full bg-canvas">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink">Usuarios</h1>
            <p className="text-ink-muted mt-1">{profiles.length} usuarios registrados · {filtered.length} mostrados</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field pl-10"
          />
        </div>

        {/* Subscription filters */}
        <div role="group" aria-label="Filtrar por suscripción y estado" className="flex flex-wrap gap-2 mb-2">
          {subFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setSubFilter(f.key)}
              aria-pressed={subFilter === f.key}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                subFilter === f.key
                  ? 'bg-accent text-accent-ink'
                  : 'bg-card text-ink-muted border border-line hover:border-line-strong hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Role filters */}
        <div role="group" aria-label="Filtrar por rol" className="flex flex-wrap gap-2 mb-6">
          {roleFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              aria-pressed={roleFilter === f.key}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === f.key
                  ? 'bg-ink text-canvas'
                  : 'bg-card text-ink-muted border border-line hover:border-line-strong hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-line overflow-hidden">
            <div className="hidden lg:grid lg:grid-cols-8 gap-4 px-6 py-3 bg-canvas border-b border-line text-xs font-semibold text-ink-muted uppercase tracking-wider">
              <div className="col-span-2">Usuario</div>
              <div>Rol</div>
              <div>Suscripción</div>
              <div>Expira</div>
              <div>Estado</div>
              <div>Registro</div>
              <div className="text-right">Acciones</div>
            </div>
            <div className="divide-y divide-line">
              {filtered.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-ink-muted">No se encontraron usuarios</p>
              ) : filtered.map(u => {
                const expiring = isExpiringSoon(u.subscription_expires_at)
                const expired = isExpired(u.subscription_expires_at)
                return (
                  <div key={u.id} className="px-6 py-4 flex flex-col lg:grid lg:grid-cols-8 gap-3 lg:items-center group">
                    {/* Usuario */}
                    <div className="flex items-center gap-3 lg:col-span-2">
                      <div className="w-9 h-9 bg-accent-soft rounded-xl flex items-center justify-center shrink-0" aria-hidden="true">
                        <span className="text-xs font-bold text-accent">{(u.full_name || u.email || '').slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{u.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-ink-muted truncate">{u.email}</p>
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
                        <span className="text-xs text-ink-muted">—</span>
                      ) : expired ? (
                        <Badge color="expired">Expirada</Badge>
                      ) : expiring ? (
                        <Badge color="expiring">{formatDate(u.subscription_expires_at)}</Badge>
                      ) : (
                        <span className="text-xs text-ink-muted">{formatDate(u.subscription_expires_at)}</span>
                      )}
                    </div>
                    {/* Estado */}
                    <div>
                      <Badge color={u.is_active ? 'active' : 'inactive'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                    {/* Registro */}
                    <div>
                      <span className="text-xs text-ink-muted">{formatDate(u.created_at)}</span>
                    </div>
                    {/* Acciones */}
                    <div className="flex lg:justify-end gap-2 pt-2 lg:pt-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-card-hover transition-colors"
                        title="Editar"
                        aria-label={`Editar ${u.email}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmUser(u)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Eliminar perfil"
                        aria-label={`Eliminar el perfil de ${u.email}`}
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
