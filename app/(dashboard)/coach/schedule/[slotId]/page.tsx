import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { deleteSessionSlot, cancelBooking } from '../_actions'
import { formatSlotDate, formatSlotTime, spacesRemaining, FOCUS_LABELS } from '../_utils'

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_COLOURS: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function SlotDetailPage({
  params,
}: {
  params: { slotId: string }
}) {
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

  const { data: slot } = await supabase
    .from('session_slots')
    .select(`
      id, starts_at, duration_minutes, session_type, capacity, block_session_id,
      session_slot_coaches (
        coach_id,
        users ( full_name )
      ),
      workout_logs (
        id, status,
        users ( full_name )
      ),
      block_sessions (
        id, week_number,
        block_days ( day_of_week, movement_focus ),
        blocks ( id, name )
      )
    `)
    .eq('id', params.slotId)
    .eq('gym_id', profile.gym_id)
    .single()

  if (!slot) notFound()

  const remaining = spacesRemaining(slot.capacity, slot.workout_logs)
  const activeBookings = slot.workout_logs.filter((l: { status: string }) => l.status !== 'cancelled')
  const cancelledBookings = slot.workout_logs.filter((l: { status: string }) => l.status === 'cancelled')

  const bs = slot.block_sessions as {
    id: string
    week_number: number
    block_days: { day_of_week: number; movement_focus: string } | null
    blocks: { id: string; name: string } | null
  } | null

  const coaches = slot.session_slot_coaches.map(
    (sc: { users: { full_name: string } | null }) => sc.users?.full_name,
  ).filter(Boolean)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/coach/schedule" className="text-sm text-gray-500 hover:text-gray-700">
          ← Schedule
        </Link>
      </div>

      {/* Slot summary card */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold">{formatSlotTime(slot.starts_at)}</p>
            <p className="text-sm text-gray-500">{formatSlotDate(slot.starts_at.slice(0, 10))}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              slot.session_type === 'sgpt'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {slot.session_type === 'sgpt' ? 'SGPT' : 'Team Training'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 text-center text-sm">
          <div>
            <p className="font-semibold">{slot.duration_minutes} min</p>
            <p className="text-xs text-gray-400">Duration</p>
          </div>
          <div>
            <p className={`font-semibold ${remaining === 0 ? 'text-red-500' : ''}`}>
              {remaining}/{slot.capacity}
            </p>
            <p className="text-xs text-gray-400">Spaces left</p>
          </div>
          <div>
            <p className="font-semibold">{activeBookings.length}</p>
            <p className="text-xs text-gray-400">Booked</p>
          </div>
        </div>

        {coaches.length > 0 && (
          <p className="text-sm text-gray-500 border-t border-gray-100 pt-3">
            <span className="font-medium text-gray-700">Coach: </span>
            {coaches.join(', ')}
          </p>
        )}

        {bs && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">Programme: </span>
              {bs.blocks?.name} · Week {bs.week_number} ·{' '}
              {FOCUS_LABELS[bs.block_days?.movement_focus ?? ''] ?? ''}
            </p>
            {bs.blocks && (
              <Link
                href={`/coach/blocks/${bs.blocks.id}/sessions/${bs.id}`}
                className="mt-1 inline-block text-xs text-brand-600 hover:underline"
              >
                View exercises →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/coach/schedule/${slot.id}/edit`}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </Link>
        <form
          action={async () => {
            'use server'
            await deleteSessionSlot(params.slotId)
          }}
          className="flex-1"
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            onClick={(e) => {
              if (!confirm('Delete this session? All bookings will be lost.')) e.preventDefault()
            }}
          >
            Delete
          </button>
        </form>
      </div>

      {/* Bookings list */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Attendees ({activeBookings.length})
        </h2>
        {activeBookings.length === 0 ? (
          <p className="text-sm text-gray-400">No bookings yet.</p>
        ) : (
          <ul className="space-y-2">
            {activeBookings.map((log: { id: string; status: string; users: { full_name: string } | null }) => (
              <li
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{log.users?.full_name ?? 'Unknown'}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLOURS[log.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {STATUS_LABELS[log.status] ?? log.status}
                  </span>
                </div>
                {log.status === 'booked' && (
                  <form
                    action={async () => {
                      'use server'
                      await cancelBooking(log.id, params.slotId)
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {cancelledBookings.length > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            + {cancelledBookings.length} cancelled booking{cancelledBookings.length > 1 ? 's' : ''}
          </p>
        )}
      </section>
    </main>
  )
}
