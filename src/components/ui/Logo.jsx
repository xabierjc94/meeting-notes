import Icon from './Icon'
import { ICONS } from './icons'

// Marca de MeetingNotes: cuadrado lima con el icono en negro.
// Sustituye a los 14 logos con degradado violeta.
const SIZES = { sm: 'w-7 h-7 rounded-lg', md: 'w-9 h-9 rounded-xl', lg: 'w-12 h-12 rounded-2xl' }
const ICON_SIZES = { sm: 'w-3.5 h-3.5', md: 'w-4.5 h-4.5', lg: 'w-6 h-6' }

export default function Logo({ size = 'md', className = '' }) {
  return (
    <span className={`shrink-0 inline-flex items-center justify-center bg-accent text-accent-ink ${SIZES[size]} ${className}`} aria-hidden="true">
      <Icon d={ICONS.note} className={ICON_SIZES[size]} strokeWidth={2.25} />
    </span>
  )
}
