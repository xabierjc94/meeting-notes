import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../ui/Logo'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/users', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: '/admin/activity', label: 'Actividad', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
]

const SIGN_OUT_ICON = 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'

// ─────────────────────────────────────────────────────────────
// Navegación del panel, con el mismo estilo que la barra lateral de la app.
// NavLink pone aria-current="page" en la sección activa (el lector de
// pantalla dice "página actual"); `end` evita que "/admin" quede activo
// también dentro de "/admin/users".
// ─────────────────────────────────────────────────────────────
function AdminNav({ onNavigate }) {
  return (
    <nav aria-label="Administración" className="space-y-1">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end
          onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
            isActive ? 'bg-card text-ink' : 'text-ink-muted hover:text-ink hover:bg-card/60'
          }`}
        >
          {({ isActive }) => (
            <>
              <Icon d={item.icon} className={`w-[18px] h-[18px] ${isActive ? 'text-accent' : ''}`} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-3 mb-6">
      <Logo />
      <span>
        <span className="font-bold text-ink text-sm block leading-tight">MeetingNotes</span>
        <span className="text-xs text-ink-muted">Panel de administración</span>
      </span>
    </Link>
  )
}

export default function AdminLayout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Esc cierra el menú móvil
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
    navigate('/login')
  }

  const iconButton = 'w-10 h-10 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card transition-colors'

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden md:flex w-64 flex-col bg-surface border-r border-line shrink-0">
        <div className="px-4 pt-6 pb-4">
          <div className="px-2"><Brand /></div>
          <AdminNav />
        </div>

        <div className="mt-auto border-t border-line px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">
                {profile?.full_name || user?.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-xs text-ink-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon d={SIGN_OUT_ICON} />
            </button>
          </div>
        </div>
      </aside>

      {/* Cabecera (móvil) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-canvas border-b border-line px-3 py-2">
        <div className="flex items-center justify-between">
          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen} className={iconButton}>
            <Icon d={ICONS.menu} className="w-5 h-5" />
          </button>
          <span className="font-bold text-ink text-sm">Panel de administración</span>
          <button onClick={handleSignOut} aria-label="Cerrar sesión" title="Cerrar sesión" className={`${iconButton} hover:text-danger`}>
            <Icon d={SIGN_OUT_ICON} className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Menú lateral (móvil) */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-line animate-slideInLeft">
            <div className="px-4 pt-6 pb-4">
              <div className="px-2"><Brand /></div>
              <AdminNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
