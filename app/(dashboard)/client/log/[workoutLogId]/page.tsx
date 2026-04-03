import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import WorkoutLogger from './workout-logger'

export default async function WorkoutLogPage({
  params,
}: {
  params: { workoutLogId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load the workout log with full session + exercise context
  const { data: log } = await supabase
    .from('workout_logs')
    .select(`
      id, status,
      session_slots (
        session_type, duration_minutes,
        block_sessions (
          week_number,
          block_days ( movement_focus ),
          exercises (
            id, name, category, sets, reps, weight_kg, coach_note, order_index
          )
        )
      )
    `)
    .eq('id', params.workoutLogId)
    .eq('client_id', user.id)
    .single()

  if (!log) notFound()

  // Already completed — show read-only or redirect to home
  if (log.status === 'completed') redirect('/client')

  const slot = log.session_slots as {
    session_type: string
    duration_minutes: number
    block_sessions: {
      week_number: number
      block_days: { movement_focus: string } | null
      exercises: {
        id: string
        name: string
        category: string
        sets: number
        reps: string
        weight_kg: number | null
        coach_note: string | null
        order_index: number
      }[]
    } | null
  } | null

  // Team training sessions have no exercises to log
  if (!slot?.block_sessions || slot.session_type === 'team_training') {
    redirect('/client')
  }

  const exercises = [...(slot.block_sessions.exercises ?? [])]
    .sort((a, b) => {
      const catOrder = { warmup: 0, main: 1, accessory: 2 }
      const catDiff =
        (catOrder[a.category as keyof typeof catOrder] ?? 9) -
        (catOrder[b.category as keyof typeof catOrder] ?? 9)
      return catDiff !== 0 ? catDiff : a.order_index - b.order_index
    })

  const exerciseIds = exercises.map((e) => e.id)

  // Fetch existing set_logs for this session (resuming mid-log)
  const [{ data: existingLogs }, { data: prevLogs }] = await Promise.all([
    supabase
      .from('set_logs')
      .select('id, exercise_id, set_number, weight_kg, reps_completed, is_pb')
      .eq('workout_log_id', params.workoutLogId),

    // Previous set_logs for prefill — latest per exercise from earlier sessions
    exerciseIds.length > 0
      ? supabase
          .from('set_logs')
          .select('exercise_id, set_number, weight_kg, reps_completed, logged_at')
          .in('exercise_id', exerciseIds)
          .neq('workout_log_id', params.workoutLogId)
          .order('logged_at', { ascending: false })
          .limit(exerciseIds.length * 10)
      : Promise.resolve({ data: [] }),
  ])

  // Build prefill map: exerciseId → { weight, reps } from most recent log
  const prefill: Record<string, { weight: number | null; reps: number | null }> = {}
  for (const pl of prevLogs ?? []) {
    if (!prefill[pl.exercise_id]) {
      prefill[pl.exercise_id] = { weight: pl.weight_kg, reps: pl.reps_completed }
    }
  }

  const focusLabel =
    slot.block_sessions.block_days?.movement_focus
      .replace('_', ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Workout'

  return (
    <WorkoutLogger
      workoutLogId={params.workoutLogId}
      focusLabel={focusLabel}
      weekNumber={slot.block_sessions.week_number}
      exercises={exercises}
      prefill={prefill}
      existingLogs={existingLogs ?? []}
      initialStatus={log.status}
    />
  )
}
