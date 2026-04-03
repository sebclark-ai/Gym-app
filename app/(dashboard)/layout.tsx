import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Shared layout for all role dashboards.
// Verifies the user is authenticated; role enforcement is in middleware.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <>{children}</>
}
