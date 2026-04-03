import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function BlocksPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('gym_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, name, week_count, created_at, block_days(id)')
    .eq('gym_id', profile.gym_id)
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blocks</h1>
        <Link
          href="/coach/blocks/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          New Block
        </Link>
      </div>

      {!blocks || blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <p className="text-gray-500 mb-4">No blocks yet.</p>
          <Link
            href="/coach/blocks/new"
            className="inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Create your first block
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {blocks.map((block) => {
            const dayCount = Array.isArray(block.block_days) ? block.block_days.length : 0
            return (
              <li key={block.id}>
                <Link
                  href={`/coach/blocks/${block.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{block.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {block.week_count} weeks · {dayCount} day{dayCount !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                  <span className="text-gray-400 text-lg">›</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
