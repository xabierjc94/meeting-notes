import { useAppSidebar } from './AppSidebarContext'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'
import Logo from '../ui/Logo'

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <Logo size="sm" />
      <span className="font-bold text-ink text-sm tracking-tight">MeetingNotes</span>
    </div>
  )
}

// Barra superior solo para móvil: ☰ (abre el menú lateral), marca o
// título de la sección, y la acción principal de la página.
export default function MobileTopBar({ children, action }) {
  const { openMobile } = useAppSidebar()
  return (
    <header className="md:hidden flex items-center justify-between px-3 py-2.5 bg-surface border-b border-line shrink-0">
      <button
        onClick={openMobile}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-card transition-colors"
        aria-label="Abrir menú"
      >
        <Icon d={ICONS.menu} className="w-5 h-5" />
      </button>
      {children ?? <Brand />}
      {action ?? <div className="w-10 h-10" />}
    </header>
  )
}
