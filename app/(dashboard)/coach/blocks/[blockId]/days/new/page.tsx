import { createClient } from '@/lib/supabase/server'
import { addBlockDay } from '@/app/(dashboard)/coach/_actions'
import type { MovementFocus } from '@/lib/types/database'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MOVEMENT_FOCUS_OPTIONS: { value: MovementFocus; label: string }[] = [
  { value: 'upper', label: 'Upper Body' },
  { value: 'lower', label: 'Lower Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'rest', label: 'Rest' },
]

interface Props {
  params: { blockId: string }
}

export default async function NewDayPage({ params }: Props) {
  const { blockId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch existing block_days to know which days are already taken
  const { data: existingDays } = await supabase
    .from('block_days')
    .select('day_of_week')
    .eq('block_id', blockId)

  const takenDays = new Set((existingDays ?? []).map((d) => d.day_of_week))
  const availableDays = DAY_NAMES.map((name, index) => ({ index, name })).filter(
    ({ index }) => !takenDays.has(index),
  )

  if (availableDays.length === 0) {
    redirect(`/coach/blocks/${blockId}`)
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/coach/blocks/${blockId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Block
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Add Training Day</h1>

      <form action={addBlockDay} className="space-y-5">
        <input type="hidden" name="block_id" value={blockId} />

        <div className="space-y-1">
          <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
            Day of week
          </label>
          <select
            id="day_of_week"
            name="day_of_week"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
          >
            {availableDays.map(({ index, name }) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="movement_focus" className="block text-sm font-medium text-gray-700">
            Movement focus
          </label>
          <select
            id="movement_focus"
            name="movement_focus"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
          >
            {MOVEMENT_FOCUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any notes about this day..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Add Day
        </button>
      </form>
    </main>
  )
}
