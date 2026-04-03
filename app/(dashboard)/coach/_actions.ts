'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAuthedUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('gym_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return { supabase, user, gymId: profile.gym_id }
}

// Creates a block and redirects to /coach/blocks/[id]
export async function createBlock(formData: FormData) {
  const { supabase, user, gymId } = await getAuthedUser()

  const name = formData.get('name') as string
  const weekCount = parseInt(formData.get('week_count') as string, 10)

  const { data, error } = await supabase
    .from('blocks')
    .insert({
      name,
      week_count: weekCount,
      gym_id: gymId,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create block')

  redirect(`/coach/blocks/${data.id}`)
}

// Adds a day to a block AND auto-creates block_sessions for each week
export async function addBlockDay(formData: FormData) {
  const { supabase } = await getAuthedUser()

  const blockId = formData.get('block_id') as string
  const dayOfWeek = parseInt(formData.get('day_of_week') as string, 10)
  const movementFocus = formData.get('movement_focus') as string
  const notes = (formData.get('notes') as string) || null

  // 1. Insert into block_days
  const { data: day, error: dayError } = await supabase
    .from('block_days')
    .insert({
      block_id: blockId,
      day_of_week: dayOfWeek,
      movement_focus: movementFocus as import('@/lib/types/database').MovementFocus,
      notes,
    })
    .select('id')
    .single()

  if (dayError || !day) throw new Error(dayError?.message ?? 'Failed to create block day')

  // 2. Look up the block's week_count
  const { data: block, error: blockError } = await supabase
    .from('blocks')
    .select('week_count')
    .eq('id', blockId)
    .single()

  if (blockError || !block) throw new Error(blockError?.message ?? 'Block not found')

  // 3. Insert one block_session per week
  const sessions = Array.from({ length: block.week_count }, (_, i) => ({
    block_id: blockId,
    block_day_id: day.id,
    week_number: i + 1,
  }))

  const { error: sessionsError } = await supabase.from('block_sessions').insert(sessions)

  if (sessionsError) throw new Error(sessionsError.message)

  // 4. Revalidate and redirect
  revalidatePath(`/coach/blocks/${blockId}`)
  redirect(`/coach/blocks/${blockId}`)
}

// Deletes a block day (cascades to sessions and exercises via DB)
export async function deleteBlockDay(dayId: string, blockId: string) {
  const { supabase } = await getAuthedUser()

  const { error } = await supabase.from('block_days').delete().eq('id', dayId)

  if (error) throw new Error(error.message)

  revalidatePath(`/coach/blocks/${blockId}`)
  redirect(`/coach/blocks/${blockId}`)
}

// Adds an exercise to a session
export async function createExercise(formData: FormData) {
  const { supabase } = await getAuthedUser()

  const sessionId = formData.get('session_id') as string
  const blockId = formData.get('block_id') as string
  const category = formData.get('category') as import('@/lib/types/database').ExerciseCategory
  const name = formData.get('name') as string
  const sets = parseInt(formData.get('sets') as string, 10)
  const reps = formData.get('reps') as string
  const weightKgRaw = formData.get('weight_kg') as string
  const weightKg = weightKgRaw ? parseFloat(weightKgRaw) : null
  const coachNote = (formData.get('coach_note') as string) || null
  const orderIndex = parseInt(formData.get('order_index') as string, 10)

  const { error } = await supabase.from('exercises').insert({
    block_session_id: sessionId,
    category,
    name,
    sets,
    reps,
    weight_kg: weightKg,
    coach_note: coachNote,
    order_index: orderIndex,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/coach/blocks/${blockId}/sessions/${sessionId}`)
}

// Updates an exercise
export async function updateExercise(formData: FormData) {
  const { supabase } = await getAuthedUser()

  const exerciseId = formData.get('exercise_id') as string
  const sessionId = formData.get('session_id') as string
  const blockId = formData.get('block_id') as string
  const category = formData.get('category') as import('@/lib/types/database').ExerciseCategory
  const name = formData.get('name') as string
  const sets = parseInt(formData.get('sets') as string, 10)
  const reps = formData.get('reps') as string
  const weightKgRaw = formData.get('weight_kg') as string
  const weightKg = weightKgRaw ? parseFloat(weightKgRaw) : null
  const coachNote = (formData.get('coach_note') as string) || null
  const orderIndex = parseInt(formData.get('order_index') as string, 10)

  const { error } = await supabase
    .from('exercises')
    .update({
      category,
      name,
      sets,
      reps,
      weight_kg: weightKg,
      coach_note: coachNote,
      order_index: orderIndex,
    })
    .eq('id', exerciseId)

  if (error) throw new Error(error.message)

  revalidatePath(`/coach/blocks/${blockId}/sessions/${sessionId}`)
}

// Deletes an exercise
export async function deleteExercise(exerciseId: string, sessionId: string, blockId: string) {
  const { supabase } = await getAuthedUser()

  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)

  if (error) throw new Error(error.message)

  revalidatePath(`/coach/blocks/${blockId}/sessions/${sessionId}`)
}

// Copies all exercises from one session to another
export async function copySessionExercises(
  fromSessionId: string,
  toSessionId: string,
  blockId: string,
) {
  const { supabase } = await getAuthedUser()

  // 1. Fetch all exercises for fromSessionId
  const { data: exercises, error: fetchError } = await supabase
    .from('exercises')
    .select('category, name, sets, reps, weight_kg, coach_note, order_index')
    .eq('block_session_id', fromSessionId)
    .order('order_index')

  if (fetchError) throw new Error(fetchError.message)

  // 2. Delete existing exercises for toSessionId
  const { error: deleteError } = await supabase
    .from('exercises')
    .delete()
    .eq('block_session_id', toSessionId)

  if (deleteError) throw new Error(deleteError.message)

  // 3. Insert copies for toSessionId
  if (exercises && exercises.length > 0) {
    const copies = exercises.map((ex) => ({
      ...ex,
      block_session_id: toSessionId,
    }))

    const { error: insertError } = await supabase.from('exercises').insert(copies)
    if (insertError) throw new Error(insertError.message)
  }

  revalidatePath(`/coach/blocks/${blockId}/sessions/${toSessionId}`)
}
