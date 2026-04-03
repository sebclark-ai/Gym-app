import { createClient } from '@/lib/supabase/server'
import { deleteBlockDay } from '@/app/(dashboard)/coach/_actions'
import type { MovementFocus } from '@/lib/types/database'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const FOCUS_LABELS: Record<MovementFocus, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
  cardio: 'Cardio',
  rest: 'Rest',
}

const FOCUS_BADGE_COLOURS: Record<MovementFocus, string> = {
  upper: 'bg-blue-100 text-blue-700',
  lower: 'bg-purple-100 text-purple-700',
  full_body: 'bg-green-100 text-green-700',
  cardio: 'bg-yellow-100 text-yellow-700',
  rest: 'bg-gray-100 text-gray-500',
}

interface Props {
  params: { blockId: string }
}

export default async function BlockDetailPage({ params }: Props) {
  const { blockId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: block, error } = await supabase
    .from('blocks')
    .select(`
      id, name, week_count,
      block_days (
        id, day_of_week, movement_focus, notes,
        block_sessions (
          id, week_number,
          exercises (id)
        )
      )
    `)
    .eq('id', blockId)
    .single()

  if (error || !block) redirect('/coach/blocks')

  // Sort days by day_of_week
  const sortedDays = [...block.block_days].sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coach/blocks" className="text-sm text-gray-500 hover:text-gray-700">
          ← Blocks
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{block.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{block.week_count} weeks</p>
        </div>
        <Link
          href={`/coach/blocks/${blockId}/days/new`}
          className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Add Day
        </Link>
      </div>

      {sortedDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-gray-500 mb-3">No training days configured yet.</p>
          <Link
            href={`/coach/blocks/${blockId}/days/new`}
            className="inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Add first day
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {sortedDays.map((day) => {
            const focus = day.movement_focus as MovementFocus
            const sortedSessions = [...day.block_sessions].sort(
              (a, b) => a.week_number - b.week_number,
            )
            const totalExercises = day.block_sessions.reduce(
              (sum, s) => sum + (Array.isArray(s.exercises) ? s.exercises.length : 0),
              0,
            )

            return (
              <li
                key={day.id}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {DAY_NAMES[day.day_of_week] ?? `Day ${day.day_of_week}`}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${FOCUS_BADGE_COLOURS[focus]}`}
                      >
                        {FOCUS_LABELS[focus]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {day.notes && (
                      <p className="text-xs text-gray-500 mt-1">{day.notes}</p>
                    )}
                  </div>

                  <form
                    action={deleteBlockDay.bind(null, day.id, blockId)}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      onClick={(e) => {
                        if (!confirm('Delete this day and all its sessions?')) e.preventDefault()
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {/* Week grid */}
                <div className="flex flex-wrap gap-2">
                  {sortedSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/coach/blocks/${blockId}/sessions/${session.id}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    >
                      W{session.week_number}
                    </Link>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
