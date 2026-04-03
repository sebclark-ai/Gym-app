import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SlotForm from '../../_components/slot-form'

export default async function EditSessionSlotPage({
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

  // Fetch the slot being edited
  const { data: slot } = await supabase
    .from('session_slots')
    .select(`
      id, gym_id, starts_at, duration_minutes, session_type, capacity, block_session_id, created_at,
      session_slot_coaches ( coach_id )
    `)
    .eq('id', params.slotId)
    .eq('gym_id', profile.gym_id)
    .single()

  if (!slot) notFound()

  // Coaches and block sessions (same as create page)
  const { data: coaches } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('gym_id', profile.gym_id)
    .in('role', ['coach', 'owner'])
    .order('full_name')

  const { data: blocks } = await supabase
    .from('blocks')
    .select(`
      name,
      block_days (
        day_of_week, movement_focus,
        block_sessions ( id, week_number )
      )
    `)
    .eq('gym_id', profile.gym_id)
    .order('created_at')

  const blockSessions = (blocks ?? []).flatMap((block) =>
    (block.block_days ?? []).flatMap((bd) =>
      (bd.block_sessions ?? []).map((bs) => ({
        id: bs.id,
        week_number: bs.week_number,
        block_name: block.name,
        day_of_week: bd.day_of_week,
        movement_focus: bd.movement_focus,
      })),
    ),
  ).sort((a, b) => a.block_name.localeCompare(b.block_name) || a.day_of_week - b.day_of_week || a.week_number - b.week_number)

  const slotWithCoachIds = {
    ...slot,
    coachIds: slot.session_slot_coaches.map(
      (sc: { coach_id: string }) => sc.coach_id,
    ),
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/coach/schedule/${params.slotId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold">Edit Session</h1>
      </div>

      <SlotForm
        slot={slotWithCoachIds}
        coaches={coaches ?? []}
        blockSessions={blockSessions}
      />
    </main>
  )
}
