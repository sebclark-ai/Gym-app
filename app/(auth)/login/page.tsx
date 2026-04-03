import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage() {
  // If already signed in, bounce to dashboard
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    redirect(`/${profile?.role ?? 'client'}`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Chalc</h1>
          <p className="mt-2 text-sm text-gray-500">CTPT Training Companion</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
