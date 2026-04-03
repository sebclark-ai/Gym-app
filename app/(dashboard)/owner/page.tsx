import { createClient } from '@/lib/supabase/server'

export default async function OwnerDashboard() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, gym_id')
    .eq('id', user!.id)
    .single()

  const [{ count: memberCount }, { count: blockCount }] = await Promise.all([
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', profile!.gym_id),
    supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', profile!.gym_id),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Owner — {profile?.full_name}</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 text-center">
          <p className="text-3xl font-bold">{memberCount ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">Members</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-5 text-center">
          <p className="text-3xl font-bold">{blockCount ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">Blocks</p>
        </div>
      </div>
    </main>
  )
}
