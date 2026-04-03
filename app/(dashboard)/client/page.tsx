import { createClient } from '@/lib/supabase/server'

export default async function ClientDashboard() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">
        Hey, {profile?.full_name ?? 'there'} 👋
      </h1>
      <p className="text-gray-500 text-sm">
        Your home screen will show your next session, last session summary, and
        weekly progress. Coming soon.
      </p>
    </main>
  )
}
