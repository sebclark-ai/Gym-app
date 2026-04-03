'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAuthedClient() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

// Marks the session as in-progress when logging begins
export async function startSession(workoutLogId: string) {
  const { supabase, user } = await getAuthedClient()

  await supabase
    .from('workout_logs')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', workoutLogId)
    .eq('client_id', user.id)
    .eq('status', 'booked') // only transition from booked, not overwrite in_progress
}

// Upserts a set log — the DB trigger sets is_pb automatically
export async function saveSetLog(
  workoutLogId: string,
  exerciseId: string,
  setNumber: number,
  weightKg: number | null,
  repsCompleted: number | null,
): Promise<{ id: string; is_pb: boolean }> {
  const { supabase, user } = await getAuthedClient()

  // Verify the workout log belongs to this client
  const { data: log } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('id', workoutLogId)
    .eq('client_id', user.id)
    .single()

  if (!log) throw new Error('Workout log not found')

  const { data, error } = await supabase
    .from('set_logs')
    .upsert(
      {
        workout_log_id: workoutLogId,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: weightKg,
        reps_completed: repsCompleted,
        is_pb: false, // overridden by DB trigger
      },
      { onConflict: 'workout_log_id,exercise_id,set_number' },
    )
    .select('id, is_pb')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save set')

  return data
}

// Marks the workout as complete
export async function completeSession(workoutLogId: string) {
  const { supabase, user } = await getAuthedClient()

  const { error } = await supabase
    .from('workout_logs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', workoutLogId)
    .eq('client_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/client')
  redirect('/client')
}
