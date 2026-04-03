import { createClient } from '@/lib/supabase/server'
import type { ExerciseCategory, MovementFocus } from '@/lib/types/database'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ExerciseEditor from './exercise-editor'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const FOCUS_LABELS: Record<MovementFocus, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
  cardio: 'Cardio',
  rest: 'Rest',
}

const CATEGORY_ORDER: Record<ExerciseCategory, number> = {
  warmup: 0,
  main: 1,
  accessory: 2,
}

interface Props {
  params: { blockId: string; sessionId: string }
}

export default async function SessionPage({ params }: Props) {
  const { blockId, sessionId } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: session, error } = await supabase
    .from('block_sessions')
    .select(`
      id, week_number,
      block_day:block_days (
        id, day_of_week, movement_focus, block_id
      ),
      exercises (
        id, block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) redirect(`/coach/blocks/${blockId}`)

  // block_day comes as an object (single relation)
  const blockDay = Array.isArray(session.block_day) ? session.block_day[0] : session.block_day
  if (!blockDay) redirect(`/coach/blocks/${blockId}`)

  // Fetch other sessions for the same day (for copy week feature)
  const { data: otherSessions } = await supabase
    .from('block_sessions')
    .select('id, week_number')
    .eq('block_day_id', blockDay.id)
    .neq('id', sessionId)
    .order('week_number')

  // Sort exercises: by category order then order_index
  const sortedExercises = [...session.exercises].sort((a, b) => {
    const catDiff =
      CATEGORY_ORDER[a.category as ExerciseCategory] -
      CATEGORY_ORDER[b.category as ExerciseCategory]
    if (catDiff !== 0) return catDiff
    return a.order_index - b.order_index
  })

  const dayName = DAY_NAMES[blockDay.day_of_week] ?? `Day ${blockDay.day_of_week}`
  const focusLabel = FOCUS_LABELS[blockDay.movement_focus as MovementFocus] ?? blockDay.movement_focus

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/coach/blocks/${blockId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {blockId ? 'Block' : 'Back'}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Week {session.week_number} — {dayName}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{focusLabel}</p>
      </div>

      <ExerciseEditor
        sessionId={sessionId}
        blockId={blockId}
        exercises={sortedExercises}
        otherSessions={otherSessions ?? []}
      />
    </main>
  )
}
