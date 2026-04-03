import BottomNav from '@/components/bottom-nav'
import { CalendarDays, Layers, Users, User } from 'lucide-react'

// Owners get the full coach nav + a Members tab
const OWNER_NAV = [
  { href: '/coach/schedule', label: 'Schedule', Icon: CalendarDays },
  { href: '/coach/blocks',   label: 'Blocks',   Icon: Layers },
  { href: '/owner/members',  label: 'Members',  Icon: Users },
  { href: '/owner/profile',  label: 'Profile',  Icon: User },
]

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav items={OWNER_NAV} />
    </div>
  )
}
