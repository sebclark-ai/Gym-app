import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatSlotDate, formatSlotTime, spacesRemaining } from './_utils'

export default async function SchedulePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('gym_id')
    .eq('id', user.id)
    .single()

  if (!profile) notFound()

  // Fetch next 28 days of slots with coaches and booking counts
  const now = new Date().toISOString()
  const future = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()

  const { data: slots } = await supabase
    .from('session_slots')
    .select(`
      id, starts_at, duration_minutes, session_type, capacity, block_session_id,
      session_slot_coaches ( coach_id, users ( full_name ) ),
      workout_logs ( id, status ),
      block_sessions (
        week_number,
        block_days ( day_of_week, movement_focus ),
        blocks ( name )
      )
    `)
    .eq('gym_id', profile.gym_id)
    .gte('starts_at', now)
    .lte('starts_at', future)
    .order('starts_at')

  // Group slots by date string (YYYY-MM-DD)
  const byDate: Record<string, typeof slots> = {}
  for (const slot of slots ?? []) {
    const dateKey = slot.starts_at.slice(0, 10)
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey]!.push(slot)
  }

  const dateGroups = Object.entries(byDate)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Schedule</h1>
        <Link
          href="/coach/schedule/new"
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Session
        </Link>
      </div>

      {dateGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No sessions in the next 28 days.</p>
          <Link
            href="/coach/schedule/new"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Schedule one now
          </Link>
        </div>
      ) : (
        dateGroups.map(([dateKey, daySlots]) => (
          <section key={dateKey}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {formatSlotDate(dateKey)}
            </h2>
            <ul className="space-y-2">
              {(daySlots ?? []).map((slot) => {
                const remaining = spacesRemaining(slot.capacity, slot.workout_logs)
                const coaches = slot.session_slot_coaches
                  .map((sc: { users: { full_name: string } | null }) => sc.users?.full_name)
                  .filter(Boolean)

                // Block session context for SGPT
                const bs = slot.block_sessions as {
                  week_number: number
                  block_days: { day_of_week: number; movement_focus: string } | null
                  blocks: { name: string } | null
                } | null

                return (
                  <li key={slot.id}>
                    <Link
                      href={`/coach/schedule/${slot.id}`}
                      className="flex items-start justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {formatSlotTime(slot.starts_at)}
                          </span>
                          <SessionTypeBadge type={slot.session_type} />
                        </div>
                        {bs && (
                          <p className="text-xs text-gray-500">
                            {bs.blocks?.name} · Wk {bs.week_number} ·{' '}
                            {FOCUS_LABELS[bs.block_days?.movement_focus as keyof typeof FOCUS_LABELS] ?? ''}
                          </p>
                        )}
                        {coaches.length > 0 && (
                          <p className="text-xs text-gray-400">{coaches.join(', ')}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={`text-sm font-medium ${remaining === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                          {remaining}/{slot.capacity}
                        </p>
                        <p className="text-xs text-gray-400">spaces left</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}

function SessionTypeBadge({ type }: { type: string }) {
  return type === 'sgpt' ? (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      SGPT
    </span>
  ) : (
    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
      Team
    </span>
  )
}

const FOCUS_LABELS = {
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full Body',
  cardio: 'Cardio',
  rest: 'Rest',
}
