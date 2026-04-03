import { createClient } from '@/lib/supabase/server'

export default async function CoachDashboard() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, gym_id')
    .eq('id', user!.id)
    .single()

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, name, week_count, created_at')
    .eq('gym_id', profile!.gym_id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Coach — {profile?.full_name}</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Recent Blocks</h2>
        {blocks && blocks.length > 0 ? (
          <ul className="space-y-2">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium">{b.name}</span>
                <span className="ml-2 text-gray-400">{b.week_count} weeks</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No blocks yet. Create one to get started.</p>
        )}
      </section>
    </main>
  )
}
