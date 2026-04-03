import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SlotForm from '../_components/slot-form'

export default async function NewSessionSlotPage() {
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

  // Fetch coaches and owners in this gym
  const { data: coaches } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('gym_id', profile.gym_id)
    .in('role', ['coach', 'owner'])
    .order('full_name')

  // Fetch all block sessions for this gym with context
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

  // Flatten to a simple list for the select dropdown
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

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coach/schedule" className="text-sm text-gray-500 hover:text-gray-700">
          ← Schedule
        </Link>
        <h1 className="text-xl font-bold">New Session</h1>
      </div>

      <SlotForm
        coaches={coaches ?? []}
        blockSessions={blockSessions}
      />
    </main>
  )
}
