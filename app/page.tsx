import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Root redirects authenticated users to their role dashboard,
// unauthenticated users to /login. Middleware handles the same
// logic but this makes the root URL friendly.
export default async function RootPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(`/${profile?.role ?? 'client'}`)
}
