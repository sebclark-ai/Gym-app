import BottomNav from '@/components/bottom-nav'
import { CalendarDays, Layers, User } from 'lucide-react'

const COACH_NAV = [
  { href: '/coach/schedule', label: 'Schedule', Icon: CalendarDays },
  { href: '/coach/blocks',   label: 'Blocks',   Icon: Layers },
  { href: '/coach/profile',  label: 'Profile',  Icon: User },
]

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav items={COACH_NAV} />
    </div>
  )
}
