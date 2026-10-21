import { useState, useEffect, useSyncExternalStore, useCallback, useMemo, Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AppSidebarContext } from './AppSidebarContext'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'
import Logo from '../ui/Logo'
import Spinner from '../ui/Spinner'
import CommandPalette from './CommandPalette'
import { hasOpenModal } from '../../hooks/useModalLayer'

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

// Mismos breakpoints que `md:` y `lg:` de Tailwind.
// < md: el aside es un drawer. md–lg (tablet): empieza en rail para no comerse
// medio ancho. ≥ lg: plegado/desplegado según la preferencia guardada.
const DESKTOP_QUERY = '(min-width: 48rem)'
const WIDE_QUERY = '(min-width: 64rem)'

function subscribeMedia(callback) {
  const mqls = [window.matchMedia(DESKTOP_QUERY), window.matchMedia(WIDE_QUERY)]
  mqls.forEach(m => m.addEventListener('change', callback))
  return () => mqls.forEach(m => m.removeEventListener('change', callback))
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}

function getIsWide() {
  return window.matchMedia(WIDE_QUERY).matches
}

function readCollapsed() {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1' } catch { return false }
}

// Desde Tareas o Biblioteca: ir a Notas y crear una nota nueva al llegar
// (DashboardPage lee state.newNote)
const QUICK_NOTE = { to: '/dashboard', state: { newNote: true } }

// En Mac el atajo se muestra como ⌘K; en el resto, Ctrl K
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const SEARCH_KEYS = IS_MAC ? '⌘K' : 'Ctrl K'

function UserAvatar({ user, className = '' }) {
  return (
    <span
      className={`shrink-0 w-9 h-9 rounded-xl bg-pill-lilac text-pill-lilac-ink flex items-center justify-center text-xs font-bold ${className}`}
      title={user?.email}
      aria-hidden="true"
    >
      {getInitials(user?.user_metadata?.full_name, user?.email)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Barra lateral desplegada (inspirada en el diseño de referencia):
//   bloque de espacio de trabajo → "Buscar ⌘K" → MENÚ PRINCIPAL
//   (navegación vertical) → panel de la sección (portal) → usuario.
// Plana: sin degradados ni orbes; la jerarquía la dan el tamaño, el
// color del texto y el lima del elemento activo.
// ─────────────────────────────────────────────────────────────
function SidebarFrame({ user, onCollapse, onClose, onSignOut, onSearch, panelRef, showQuickNote }) {
  const headerButton = 'ml-auto shrink-0 w-9 h-9 items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card transition-colors'

  return (
    <div className="w-80 h-full flex flex-col bg-surface">
      <div className="px-4 pt-5">
        {/* Espacio de trabajo */}
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div className="min-w-0">
            <p className="font-bold text-ink leading-tight tracking-tight">MeetingNotes</p>
            <p className="text-xs text-ink-subtle">Espacio personal</p>
          </div>
          <button onClick={onCollapse} className={`hidden md:flex ${headerButton}`} title="Plegar menú" aria-label="Plegar menú" aria-expanded={true}>
            <Icon d={ICONS.collapse} />
          </button>
          <button onClick={onClose} className={`flex md:hidden ${headerButton}`} title="Cerrar menú" aria-label="Cerrar menú">
            <Icon d={ICONS.collapse} />
          </button>
        </div>

        {/* Buscar (abre la paleta de comandos) */}
        <button
          type="button"
          onClick={onSearch}
          className="mt-5 w-full h-10 flex items-center gap-2.5 px-3 rounded-xl bg-card border border-line text-sm text-ink-muted hover:text-ink hover:border-line-strong transition-colors"
        >
          <Icon d={ICONS.search} className="w-4 h-4" />
          <span className="flex-1 text-left">Buscar</span>
          <kbd className="hidden md:block text-[11px] font-medium text-ink-subtle border border-line rounded-md px-1.5 py-0.5">{SEARCH_KEYS}</kbd>
        </button>

        {/* Menú principal */}
        <p className="mt-6 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Menú principal</p>
        <nav aria-label="Secciones" className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `group flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-card text-ink' : 'text-ink-muted hover:text-ink hover:bg-card/60'
              }`}
            >
              {({ isActive }) => (
                <>
                  <Icon d={icon} className={`w-[18px] h-[18px] ${isActive ? 'text-accent' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
          {showQuickNote && (
            <Link
              {...QUICK_NOTE}
              className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-accent hover:bg-accent-soft transition-colors"
            >
              <Icon d={ICONS.plus} className="w-[18px] h-[18px]" />
              Nota rápida
            </Link>
          )}
        </nav>
      </div>

      <div className="mx-4 mt-4 mb-4 h-px bg-line" />

      {/* Hueco que rellena cada sección con createPortal */}
      <div ref={panelRef} className="flex-1 min-h-0 flex flex-col" />

      {/* Usuario */}
      <div className="border-t border-line px-4 py-3 flex items-center gap-3">
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{user?.user_metadata?.full_name || 'Usuario'}</p>
          <p className="text-xs text-ink-subtle truncate">{user?.email}</p>
        </div>
        <button
          onClick={onSignOut}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <Icon d={ICONS.signOut} />
        </button>
      </div>
    </div>
  )
}

// Barra plegada (rail): mismos elementos, solo iconos con su etiqueta en aria-label
function SidebarRail({ user, onExpand, onSignOut, onSearch, railRef, showQuickNote }) {
  const railButton = 'w-10 h-10 flex items-center justify-center rounded-xl transition-colors'
  return (
    <div className="w-[72px] h-full flex flex-col items-center bg-surface pt-5 pb-3">
      <div className="flex flex-col items-center gap-2 w-full">
        <Logo size="md" className="mb-1" />
        <button onClick={onExpand} className={`${railButton} text-ink-muted hover:text-ink hover:bg-card`} title="Desplegar menú" aria-label="Desplegar menú" aria-expanded={false}>
          <Icon d={ICONS.expand} />
        </button>
        <button onClick={onSearch} className={`${railButton} text-ink-muted hover:text-ink hover:bg-card`} title={`Buscar (${SEARCH_KEYS})`} aria-label="Buscar">
          <Icon d={ICONS.search} />
        </button>

        <div className="w-8 h-px bg-line my-2" />

        <nav aria-label="Secciones" className="flex flex-col items-center gap-1.5">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={({ isActive }) => `${railButton} ${isActive ? 'bg-card text-accent' : 'text-ink-muted hover:text-ink hover:bg-card'}`}
            >
              <Icon d={icon} />
            </NavLink>
          ))}
        </nav>

        {showQuickNote && (
          <Link {...QUICK_NOTE} title="Nota rápida" aria-label="Nota rápida" className={`${railButton} mt-1.5 text-accent hover:bg-accent-soft`}>
            <Icon d={ICONS.plus} />
          </Link>
        )}

        <div className="w-8 h-px bg-line my-2" />

        {/* Hueco para las acciones rápidas de cada sección */}
        <div ref={railRef} className="flex flex-col items-center gap-2" />
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pt-3 border-t border-line w-full">
        <UserAvatar user={user} />
        <button
          onClick={onSignOut}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
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
      <Spinner size="lg" />
    </div>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isDesktop = useSyncExternalStore(subscribeMedia, getIsDesktop)
  const isWide = useSyncExternalStore(subscribeMedia, getIsWide)
  const isTablet = isDesktop && !isWide
  const [savedCollapsed, setSavedCollapsed] = useState(readCollapsed)
  // En tablet el despliegue es temporal y no se guarda (no pisa la preferencia del portátil)
  const [tabletExpanded, setTabletExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [panelEl, setPanelEl] = useState(null)
  const [railEl, setRailEl] = useState(null)
  const [lastPath, setLastPath] = useState(location.pathname)
  // Modo foco: oculta la barra lateral para escribir sin distracciones
  const [focusMode, setFocusMode] = useState(false)

  // Al cambiar de ruta se cierra el drawer móvil, se repliega la tablet y se
  // sale del modo foco (ajuste durante el render, sin efecto)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
    setTabletExpanded(false)
    setFocusMode(false)
  }

  // Paleta de comandos: Ctrl+K (⌘K en Mac) desde cualquier pantalla
  const [paletteOpen, setPaletteOpen] = useState(false)
  const closePalette = useCallback(() => setPaletteOpen(false), [])
  useEffect(() => {
    const onKey = (e) => {
      // e.code (tecla física) funciona también con teclados no latinos; !e.repeat
      // evita que mantener pulsado abra y cierre sin parar
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.repeat && e.code === 'KeyK') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Esc sale del modo foco, salvo que haya una ventana abierta encima
  // (p. ej. los atajos): ese Esc es para cerrar la ventana
  useEffect(() => {
    if (!focusMode) return
    const onKey = (e) => { if (e.key === 'Escape' && !hasOpenModal()) setFocusMode(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focusMode])

  const collapsed = isTablet ? !tabletExpanded : savedCollapsed

  const setCollapsed = useCallback((value) => {
    if (isTablet) {
      setTabletExpanded(!value)
      return
    }
    setSavedCollapsed(value)
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0') } catch { /* sin storage: solo dura la sesión */ }
  }, [isTablet])
  const openMobile = useCallback(() => setMobileOpen(true), [])
  // Las secciones lo llaman al elegir algo: en tablet también devuelve el espacio al contenido
  const closeMobile = useCallback(() => {
    setMobileOpen(false)
    setTabletExpanded(false)
  }, [])

  const handleSignOut = async () => {
    try { await signOut() } catch (err) { console.error(err) }
  }

  const showRail = isDesktop && collapsed
  const isNotes = location.pathname.startsWith('/dashboard')

  // Valor estable: abrir/cerrar el drawer no re-renderiza las páginas que consumen el contexto
  const value = useMemo(
    () => ({ panelEl, railEl, collapsed, setCollapsed, openMobile, closeMobile, focusMode, setFocusMode }),
    [panelEl, railEl, collapsed, setCollapsed, openMobile, closeMobile, focusMode]
  )

  return (
    <AppSidebarContext.Provider value={value}>
      <div className="flex h-dvh bg-canvas overflow-hidden">
        {paletteOpen && <CommandPalette onClose={closePalette} />}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fadeIn"
            onClick={closeMobile}
          />
        )}

        {/* Un solo aside: drawer off-canvas en móvil, columna fija en escritorio.
            El ancho se anima; el contenido mantiene su ancho fijo y se recorta.
            En reposo usa translate-none (no translate-x-0): cualquier translate convierte el aside
            en contenedor de los `fixed` de dentro y los modales de la sección quedarían recortados */}
        <aside
          inert={!isDesktop && !mobileOpen}
          className={`fixed inset-y-0 left-0 z-50 w-80 ${focusMode ? 'hidden' : 'flex'} flex-col shrink-0 overflow-hidden border-r border-line animate-slideInLeft
                      transition-transform duration-300 ease-out ${mobileOpen ? 'translate-none' : '-translate-x-full'}
                      md:static md:z-auto md:translate-none md:transition-[width] ${showRail ? 'md:w-[72px]' : 'md:w-80'}`}
        >
          {showRail ? (
            <SidebarRail
              user={user}
              onExpand={() => setCollapsed(false)}
              onSignOut={handleSignOut}
              onSearch={() => setPaletteOpen(true)}
              railRef={setRailEl}
              showQuickNote={!isNotes}
            />
          ) : (
            <SidebarFrame
              user={user}
              onCollapse={() => setCollapsed(true)}
              onClose={closeMobile}
              onSignOut={handleSignOut}
              onSearch={() => { closeMobile(); setPaletteOpen(true) }}
              panelRef={setPanelEl}
              showQuickNote={!isNotes}
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
