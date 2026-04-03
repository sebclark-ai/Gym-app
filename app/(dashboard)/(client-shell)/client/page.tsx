import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cancelMyBooking } from './_actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function startOfWeekISO() {
  const d = new Date()
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d.toISOString()
}

function endOfWeekISO() {
  const d = new Date(startOfWeekISO())
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

const FOCUS_SHORT: Record<string, string> = {
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full Body',
  cardio: 'Cardio',
  rest: 'Rest',
}

const CAT_ORDER: Record<string, number> = { warmup: 0, main: 1, accessory: 2 }

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ClientHomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, gym_id')
    .eq('id', user.id)
    .single()
  if (!profile) notFound()

  const now = new Date().toISOString()
  const weekStart = startOfWeekISO()
  const weekEnd = endOfWeekISO()

  // ── Parallel data fetching ──────────────────────────────────────────────────
  const [
    { data: bookedLogs },
    { data: lastLog },
    { data: weekLogs },
  ] = await Promise.all([
    // 1. All active upcoming bookings (to find "next session")
    supabase
      .from('workout_logs')
      .select(`
        id, status,
        session_slots (
          id, starts_at, session_type, duration_minutes, capacity,
          session_slot_coaches ( users ( full_name ) ),
          block_sessions (
            id, week_number,
            block_days ( day_of_week, movement_focus ),
            blocks ( name )
          )
        )
      `)
      .eq('client_id', user.id)
      .eq('status', 'booked'),

    // 2. Most recently completed session with all set logs
    supabase
      .from('workout_logs')
      .select(`
        id, status, completed_at,
        session_slots (
          starts_at, session_type,
          block_sessions (
            week_number,
            block_days ( movement_focus ),
            blocks ( name )
          )
        ),
        set_logs (
          id, weight_kg, reps_completed, is_pb, set_number,
          exercises ( id, name, category )
        )
      `)
      .eq('client_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 3. This week's workout_logs (completed + booked) for progress
    supabase
      .from('workout_logs')
      .select(`
        id, status,
        session_slots!inner ( starts_at )
      `)
      .eq('client_id', user.id)
      .neq('status', 'cancelled')
      .gte('session_slots.starts_at', weekStart)
      .lt('session_slots.starts_at', weekEnd),
  ])

  // Find the soonest upcoming booked session
  type SlotShape = {
    id: string
    starts_at: string
    session_type: string
    duration_minutes: number
    capacity: number
    session_slot_coaches: { users: { full_name: string } | null }[]
    block_sessions: {
      id: string
      week_number: number
      block_days: { day_of_week: number; movement_focus: string } | null
      blocks: { name: string } | null
    } | null
  }

  const futureBookings = (bookedLogs ?? [])
    .filter((l) => {
      const slot = l.session_slots as SlotShape | null
      return slot && slot.starts_at > now
    })
    .sort((a, b) => {
      const aSlot = a.session_slots as SlotShape
      const bSlot = b.session_slots as SlotShape
      return aSlot.starts_at.localeCompare(bSlot.starts_at)
    })

  const nextBooking = futureBookings[0] ?? null
  const nextSlot = nextBooking?.session_slots as SlotShape | null

  // Weekly progress
  const weekCompleted = (weekLogs ?? []).filter((l) => l.status === 'completed').length
  const weekTotal = weekLogs?.length ?? 0

  // Last session — group set_logs by exercise for display
  type SetLogShape = {
    id: string
    weight_kg: number | null
    reps_completed: number | null
    is_pb: boolean
    set_number: number
    exercises: { id: string; name: string; category: string } | null
  }
  type LastLogShape = typeof lastLog & {
    set_logs: SetLogShape[]
    session_slots: {
      starts_at: string
      session_type: string
      block_sessions: {
        week_number: number
        block_days: { movement_focus: string } | null
        blocks: { name: string } | null
      } | null
    } | null
  }

  const typedLastLog = lastLog as LastLogShape | null

  const pbCount = typedLastLog?.set_logs.filter((s) => s.is_pb).length ?? 0

  // Group set logs by exercise for the summary (show best set per exercise)
  const exerciseSummary = (() => {
    if (!typedLastLog?.set_logs.length) return []
    const byExercise = new Map<string, { name: string; category: string; sets: SetLogShape[] }>()
    for (const sl of typedLastLog.set_logs) {
      if (!sl.exercises) continue
      const key = sl.exercises.id
      if (!byExercise.has(key)) {
        byExercise.set(key, { name: sl.exercises.name, category: sl.exercises.category, sets: [] })
      }
      byExercise.get(key)!.sets.push(sl)
    }
    return Array.from(byExercise.values())
      .sort((a, b) => (CAT_ORDER[a.category] ?? 9) - (CAT_ORDER[b.category] ?? 9))
  })()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hey, {profile.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
      </div>

      {/* ── Next session ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-brand-600 text-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">
          Next Session
        </p>

        {nextSlot ? (
          <>
            <div>
              <p className="text-2xl font-bold">{fmtTime(nextSlot.starts_at)}</p>
              <p className="text-brand-100 text-sm">{fmtDate(nextSlot.starts_at)}</p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-medium">
                {nextSlot.session_type === 'sgpt' ? 'SGPT' : 'Team Training'}
              </span>
              {nextSlot.block_sessions && (
                <span className="text-brand-100">
                  {nextSlot.block_sessions.blocks?.name} · Wk {nextSlot.block_sessions.week_number} ·{' '}
                  {FOCUS_SHORT[nextSlot.block_sessions.block_days?.movement_focus ?? ''] ?? ''}
                </span>
              )}
            </div>

            {nextSlot.session_slot_coaches.length > 0 && (
              <p className="text-sm text-brand-100">
                Coach:{' '}
                {nextSlot.session_slot_coaches
                  .map((sc) => sc.users?.full_name)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              {nextSlot.session_type === 'sgpt' && nextSlot.block_sessions && (
                <Link
                  href={`/client/log/${nextBooking!.id}`}
                  className="rounded-lg bg-white text-brand-700 px-4 py-2 text-sm font-semibold hover:bg-brand-50"
                >
                  Log workout →
                </Link>
              )}
              <form
                action={async () => {
                  'use server'
                  await cancelMyBooking(nextBooking!.id)
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-brand-200 hover:text-white underline"
                >
                  Cancel booking
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-brand-100 text-sm">No upcoming sessions booked.</p>
            <Link
              href="/client/sessions"
              className="inline-block rounded-lg bg-white text-brand-700 px-4 py-2 text-sm font-semibold hover:bg-brand-50"
            >
              Browse sessions
            </Link>
          </div>
        )}
      </section>

      {/* ── Weekly progress ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            This Week
          </p>
          <p className="text-sm font-semibold text-gray-700">
            {weekCompleted}/{weekTotal} done
          </p>
        </div>
        {weekTotal > 0 ? (
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${weekTotal > 0 ? (weekCompleted / weekTotal) * 100 : 0}%` }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-400">No sessions this week yet.</p>
        )}
        {weekTotal > 0 && (
          <p className="text-xs text-gray-400">
            {weekTotal - weekCompleted > 0
              ? `${weekTotal - weekCompleted} session${weekTotal - weekCompleted > 1 ? 's' : ''} still to go`
              : 'Great week — all done! 🎉'}
          </p>
        )}
      </section>

      {/* ── Last session summary ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white px-5 py-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Last Session
        </p>

        {typedLastLog ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {typedLastLog.session_slots?.starts_at
                    ? fmtDate(typedLastLog.session_slots.starts_at)
                    : 'Unknown date'}
                </p>
                {typedLastLog.session_slots?.block_sessions && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {typedLastLog.session_slots.block_sessions.blocks?.name} · Wk{' '}
                    {typedLastLog.session_slots.block_sessions.week_number} ·{' '}
                    {FOCUS_SHORT[
                      typedLastLog.session_slots.block_sessions.block_days?.movement_focus ?? ''
                    ] ?? ''}
                  </p>
                )}
              </div>
              {pbCount > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1">
                  <span className="text-sm">🏆</span>
                  <span className="text-xs font-semibold text-yellow-700">
                    {pbCount} PB{pbCount > 1 ? 's' : ''}!
                  </span>
                </div>
              )}
            </div>

            {exerciseSummary.length > 0 && (
              <ul className="space-y-1.5 border-t border-gray-100 pt-3">
                {exerciseSummary.slice(0, 5).map((ex) => {
                  const bestSet = ex.sets.reduce((best: SetLogShape, s: SetLogShape) =>
                    (s.weight_kg ?? 0) * (s.reps_completed ?? 0) >
                    (best.weight_kg ?? 0) * (best.reps_completed ?? 0)
                      ? s
                      : best,
                  )
                  const hasPb = ex.sets.some((s: SetLogShape) => s.is_pb)
                  return (
                    <li key={ex.name} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 flex items-center gap-1">
                        {ex.name}
                        {hasPb && <span className="text-yellow-500 text-xs">★</span>}
                      </span>
                      <span className="text-gray-400 tabular-nums">
                        {ex.sets.length}×{bestSet.reps_completed ?? '—'}
                        {bestSet.weight_kg ? ` @ ${bestSet.weight_kg}kg` : ''}
                      </span>
                    </li>
                  )
                })}
                {exerciseSummary.length > 5 && (
                  <li className="text-xs text-gray-400">
                    + {exerciseSummary.length - 5} more exercise{exerciseSummary.length - 5 > 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No completed sessions yet.</p>
        )}
      </section>
    </main>
  )
}
