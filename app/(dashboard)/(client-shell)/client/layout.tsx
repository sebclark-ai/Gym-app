import BottomNav from '@/components/bottom-nav'
import { Home, CalendarDays, User } from 'lucide-react'

const CLIENT_NAV = [
  { href: '/client',          label: 'Home',     Icon: Home },
  { href: '/client/sessions', label: 'Sessions', Icon: CalendarDays },
  { href: '/client/profile',  label: 'Profile',  Icon: User },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav items={CLIENT_NAV} />
    </div>
  )
}
