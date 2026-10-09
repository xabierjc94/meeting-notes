import { useState, useSyncExternalStore, useCallback, useMemo, Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AppSidebarContext } from './AppSidebarContext'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function getInitials(name, email) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email ? email.slice(0, 2).toUpperCase() : 'UN'
}

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Notas', icon: ICONS.note },
  { to: '/tasks', label: 'Tareas', icon: ICONS.tasks },
  { to: '/biblioteca', label: 'Biblioteca', icon: ICONS.library },
]

// Mismo breakpoint que `md:` de Tailwind: por debajo, el aside es un drawer y nunca muestra el rail
const DESKTOP_QUERY = '(min-width: 48rem)'

function subscribeDesktop(callback) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}

function readCollapsed() {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1' } catch { return false }
}

function SidebarFrame({ user, onCollapse, onClose, onSignOut, panelRef }) {
  const greeting = getGreeting()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const headerButton = 'ml-auto shrink-0 w-8 h-8 items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all'

  return (
    <div className="w-80 h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -left-16 w-36 h-36 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 px-6 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30 ring-1 ring-violet-400/30">
            <Icon d={ICONS.note} className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">MeetingNotes</span>
          <button
            onClick={onCollapse}
            className={`hidden md:flex ${headerButton}`}
            title="Plegar menú"
            aria-label="Plegar menú"
            aria-expanded={true}
          >
            <Icon d={ICONS.collapse} />
          </button>
          <button
            onClick={onClose}
            className={`flex md:hidden ${headerButton}`}
            title="Cerrar menú"
            aria-label="Cerrar menú"
          >
            <Icon d={ICONS.collapse} />
          </button>
        </div>

        <p className="text-xs text-violet-300/60 font-medium mb-4">{greeting}, {userName}</p>

        {/* Navigation */}
        <nav aria-label="Secciones" className="flex gap-1 bg-white/5 rounded-xl p-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon d={icon} />
              <span className="text-[10px] font-semibold">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Hueco que rellena cada sección con createPortal */}
      <div ref={panelRef} className="relative z-10 flex-1 min-h-0 flex flex-col" />

      {/* User footer */}
      <div className="relative z-10 border-t border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-xl flex items-center justify-center shrink-0 border border-violet-400/20">
              <span className="text-xs font-bold text-violet-200">{getInitials(user?.user_metadata?.full_name, user?.email)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">
                {user?.user_metadata?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <Icon d={ICONS.signOut} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SidebarRail({ user, onExpand, onSignOut, railRef }) {
  const railButton = 'w-10 h-10 flex items-center justify-center rounded-xl transition-all'
  return (
    <div className="w-[72px] h-full flex flex-col items-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 relative overflow-hidden pt-7 pb-4">
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-2 w-full">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 ring-1 ring-violet-400/30 mb-2">
          <Icon d={ICONS.note} className="w-5 h-5 text-white" />
        </div>
        <button
          onClick={onExpand}
          className={`${railButton} text-slate-400 hover:text-white hover:bg-white/10`}
          title="Desplegar menú"
          aria-label="Desplegar menú"
          aria-expanded={false}
        >
          <Icon d={ICONS.expand} />
        </button>

        <div className="w-8 h-px bg-white/10 my-2" />

        <nav aria-label="Secciones" className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={({ isActive }) => `${railButton} ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon d={icon} />
            </NavLink>
          ))}
        </nav>

        <div className="w-8 h-px bg-white/10 my-2" />

        {/* Hueco para las acciones rápidas de cada sección */}
        <div ref={railRef} className="flex flex-col items-center gap-2" />
      </div>

      <div className="relative z-10 mt-auto flex flex-col items-center gap-2 pt-4 border-t border-white/10 w-full">
        <div
          className="w-9 h-9 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-xl flex items-center justify-center border border-violet-400/20"
          title={user?.email}
        >
          <span className="text-xs font-bold text-violet-200">{getInitials(user?.user_metadata?.full_name, user?.email)}</span>
        </div>
        <button
          onClick={onSignOut}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <Icon d={ICONS.signOut} />
        </button>
      </div>
    </div>
  )
}

function ContentSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
    </div>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isDesktop = useSyncExternalStore(subscribeDesktop, getIsDesktop)
  const [collapsed, setCollapsedState] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [panelEl, setPanelEl] = useState(null)
  const [railEl, setRailEl] = useState(null)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Cerrar el drawer móvil al cambiar de ruta (ajuste durante el render, sin efecto)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
  }

  const setCollapsed = useCallback((value) => {
    setCollapsedState(value)
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0') } catch { /* sin storage: solo dura la sesión */ }
  }, [])
  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
  }

  const showRail = isDesktop && collapsed

  // Valor estable: abrir/cerrar el drawer no re-renderiza las páginas que consumen el contexto
  const value = useMemo(
    () => ({ panelEl, railEl, collapsed, setCollapsed, openMobile, closeMobile }),
    [panelEl, railEl, collapsed, setCollapsed, openMobile, closeMobile]
  )

  return (
    <AppSidebarContext.Provider value={value}>
      <div className="flex h-dvh bg-slate-950 overflow-hidden">
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
            onClick={closeMobile}
          />
        )}

        {/* Un solo aside: drawer off-canvas en móvil, columna fija en escritorio.
            El ancho se anima; el contenido mantiene su ancho fijo y se recorta.
            En reposo usa translate-none (no translate-x-0): cualquier translate convierte el aside
            en contenedor de los `fixed` de dentro y los modales de la sección quedarían recortados */}
        <aside
          inert={!isDesktop && !mobileOpen}
          className={`fixed inset-y-0 left-0 z-50 w-80 flex flex-col shrink-0 overflow-hidden border-r border-white/5 animate-slideInLeft
                      transition-transform duration-300 ease-out ${mobileOpen ? 'translate-none' : '-translate-x-full'}
                      md:static md:z-auto md:translate-none md:transition-[width] ${collapsed ? 'md:w-[72px]' : 'md:w-80'}`}
        >
          {showRail ? (
            <SidebarRail
              user={user}
              onExpand={() => setCollapsed(false)}
              onSignOut={handleSignOut}
              railRef={setRailEl}
            />
          ) : (
            <SidebarFrame
              user={user}
              onCollapse={() => setCollapsed(true)}
              onClose={closeMobile}
              onSignOut={handleSignOut}
              panelRef={setPanelEl}
            />
          )}
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Suspense fallback={<ContentSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </AppSidebarContext.Provider>
  )
}
