import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { bookSession, cancelMyBooking } from '../_actions'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function spacesLeft(capacity: number, logs: { status: string }[]) {
  return Math.max(0, capacity - logs.filter((l) => l.status !== 'cancelled').length)
}

export default async function ClientSessionsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const now = new Date().toISOString()
  const future = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()

  const { data: profile } = await supabase
    .from('users')
    .select('gym_id')
    .eq('id', user.id)
    .single()
  if (!profile) notFound()

  // Upcoming slots for the gym + this client's own bookings
  const [{ data: slots }, { data: myLogs }] = await Promise.all([
    supabase
      .from('session_slots')
      .select(`
        id, starts_at, session_type, capacity, duration_minutes,
        session_slot_coaches ( users ( full_name ) ),
        workout_logs ( id, status ),
        block_sessions (
          week_number,
          block_days ( movement_focus ),
          blocks ( name )
        )
      `)
      .eq('gym_id', profile.gym_id)
      .gte('starts_at', now)
      .lte('starts_at', future)
      .order('starts_at'),

    supabase
      .from('workout_logs')
      .select('id, session_slot_id, status')
      .eq('client_id', user.id)
      .neq('status', 'cancelled'),
  ])

  // Build a map of slotId → client's own workout_log for fast lookup
  const myBookingBySlot = new Map(
    (myLogs ?? []).map((l) => [l.session_slot_id, l]),
  )

  // Group by date
  const byDate: Record<string, typeof slots> = {}
  for (const slot of slots ?? []) {
    const dk = slot.starts_at.slice(0, 10)
    if (!byDate[dk]) byDate[dk] = []
    byDate[dk]!.push(slot)
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/client" className="text-sm text-gray-500 hover:text-gray-700">
          ← Home
        </Link>
        <h1 className="text-xl font-bold">Upcoming Sessions</h1>
      </div>

      {Object.keys(byDate).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">No sessions scheduled in the next 28 days.</p>
        </div>
      ) : (
        Object.entries(byDate).map(([dateKey, daySlots]) => (
          <section key={dateKey}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {fmtDate(`${dateKey}T12:00:00`)}
            </h2>
            <ul className="space-y-2">
              {(daySlots ?? []).map((slot) => {
                const remaining = spacesLeft(slot.capacity, slot.workout_logs)
                const myLog = myBookingBySlot.get(slot.id)
                const isBooked = !!myLog
                const isFull = remaining === 0 && !isBooked

                const bs = slot.block_sessions as {
                  week_number: number
                  block_days: { movement_focus: string } | null
                  blocks: { name: string } | null
                } | null

                const coaches = slot.session_slot_coaches
                  .map((sc: { users: { full_name: string } | null }) => sc.users?.full_name)
                  .filter(Boolean)

                return (
                  <li
                    key={slot.id}
                    className={`rounded-xl border bg-white px-4 py-3 ${
                      isBooked ? 'border-brand-300 bg-brand-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{fmtTime(slot.starts_at)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              slot.session_type === 'sgpt'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {slot.session_type === 'sgpt' ? 'SGPT' : 'Team'}
                          </span>
                          {isBooked && (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                              Booked ✓
                            </span>
                          )}
                        </div>
                        {bs && (
                          <p className="text-xs text-gray-500 truncate">
                            {bs.blocks?.name} · Wk {bs.week_number}
                          </p>
                        )}
                        {coaches.length > 0 && (
                          <p className="text-xs text-gray-400">{coaches.join(', ')}</p>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <p
                          className={`text-xs font-medium ${
                            remaining === 0 ? 'text-red-500' : 'text-gray-500'
                          }`}
                        >
                          {remaining}/{slot.capacity}
                        </p>
                        {isBooked ? (
                          <form
                            action={async () => {
                              'use server'
                              await cancelMyBooking(myLog!.id)
                            }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-red-500 hover:text-red-700 underline"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : isFull ? (
                          <span className="text-xs text-gray-400">Full</span>
                        ) : (
                          <form
                            action={async () => {
                              'use server'
                              await bookSession(slot.id)
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                            >
                              Book
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
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
