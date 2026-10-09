import { useAppSidebar } from './AppSidebarContext'
import Icon from '../ui/Icon'
import { ICONS } from '../ui/icons'

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
        <Icon d={ICONS.note} className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="font-bold text-white text-sm">MeetingNotes</span>
    </div>
  )
}

export default function MobileTopBar({ children, action }) {
  const { openMobile } = useAppSidebar()
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 shrink-0">
      <button
        onClick={openMobile}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 transition-colors"
        aria-label="Abrir menú"
      >
        <Icon d={ICONS.menu} className="w-5 h-5" />
      </button>
      {children ?? <Brand />}
      {action ?? <div className="w-10 h-10" />}
    </header>
  )
}
