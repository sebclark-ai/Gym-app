'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: LucideIcon
}

export default function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="shrink-0 flex border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map(({ href, label, Icon }) => {
        // Active if exact match or the path starts with href (for nested routes)
        // but avoid /client matching /client/sessions
        const isActive =
          pathname === href || (href !== '/client' && href !== '/coach' && href !== '/owner' && pathname.startsWith(href))

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-3"
          >
            <div
              className={[
                'rounded-xl p-2 transition-colors',
                isActive ? 'bg-brand-100' : '',
              ].join(' ')}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-brand-600' : 'text-gray-400'}
              />
            </div>
            <span
              className={[
                'text-[10px] font-medium leading-none',
                isActive ? 'text-brand-600' : 'text-gray-400',
              ].join(' ')}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
