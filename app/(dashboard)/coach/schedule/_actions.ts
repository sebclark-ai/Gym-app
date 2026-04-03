'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SessionType } from '@/lib/types/database'

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

// Creates a session slot and assigns coaches
export async function createSessionSlot(formData: FormData) {
  const { supabase, gymId } = await getAuthedUser()

  const date = formData.get('date') as string       // YYYY-MM-DD
  const time = formData.get('time') as string       // HH:MM
  const sessionType = formData.get('session_type') as SessionType
  const capacity = parseInt(formData.get('capacity') as string, 10)
  const durationMinutes = parseInt(formData.get('duration_minutes') as string, 10)
  const blockSessionId = (formData.get('block_session_id') as string) || null
  const coachIds = formData.getAll('coach_ids') as string[]

  // Combine date + time into an ISO timestamp
  const startsAt = `${date}T${time}:00`

  const { data: slot, error } = await supabase
    .from('session_slots')
    .insert({
      gym_id: gymId,
      block_session_id: sessionType === 'sgpt' ? blockSessionId : null,
      session_type: sessionType,
      starts_at: startsAt,
      duration_minutes: durationMinutes,
      capacity,
    })
    .select('id')
    .single()

  if (error || !slot) throw new Error(error?.message ?? 'Failed to create session slot')

  // Assign coaches
  if (coachIds.length > 0) {
    const coachRows = coachIds.map((id) => ({
      session_slot_id: slot.id,
      coach_id: id,
    }))
    const { error: coachError } = await supabase.from('session_slot_coaches').insert(coachRows)
    if (coachError) throw new Error(coachError.message)
  }

  revalidatePath('/coach/schedule')
  redirect('/coach/schedule')
}

// Updates a session slot and re-syncs coach assignments
export async function updateSessionSlot(slotId: string, formData: FormData) {
  const { supabase, gymId } = await getAuthedUser()

  const date = formData.get('date') as string
  const time = formData.get('time') as string
  const sessionType = formData.get('session_type') as SessionType
  const capacity = parseInt(formData.get('capacity') as string, 10)
  const durationMinutes = parseInt(formData.get('duration_minutes') as string, 10)
  const blockSessionId = (formData.get('block_session_id') as string) || null
  const coachIds = formData.getAll('coach_ids') as string[]

  const startsAt = `${date}T${time}:00`

  // Verify slot belongs to this gym before updating
  const { data: existing } = await supabase
    .from('session_slots')
    .select('id')
    .eq('id', slotId)
    .eq('gym_id', gymId)
    .single()

  if (!existing) throw new Error('Session slot not found')

  const { error } = await supabase
    .from('session_slots')
    .update({
      block_session_id: sessionType === 'sgpt' ? blockSessionId : null,
      session_type: sessionType,
      starts_at: startsAt,
      duration_minutes: durationMinutes,
      capacity,
    })
    .eq('id', slotId)

  if (error) throw new Error(error.message)

  // Replace coach assignments
  await supabase.from('session_slot_coaches').delete().eq('session_slot_id', slotId)

  if (coachIds.length > 0) {
    const coachRows = coachIds.map((id) => ({
      session_slot_id: slotId,
      coach_id: id,
    }))
    const { error: coachError } = await supabase.from('session_slot_coaches').insert(coachRows)
    if (coachError) throw new Error(coachError.message)
  }

  revalidatePath('/coach/schedule')
  revalidatePath(`/coach/schedule/${slotId}`)
  redirect(`/coach/schedule/${slotId}`)
}

// Deletes a session slot (cascades to workout_logs via DB FK)
export async function deleteSessionSlot(slotId: string) {
  const { supabase, gymId } = await getAuthedUser()

  const { error } = await supabase
    .from('session_slots')
    .delete()
    .eq('id', slotId)
    .eq('gym_id', gymId)

  if (error) throw new Error(error.message)

  revalidatePath('/coach/schedule')
  redirect('/coach/schedule')
}

// Books a client into a slot (coach manually adds a client)
export async function bookClient(slotId: string, clientId: string) {
  const { supabase } = await getAuthedUser()

  const { error } = await supabase.from('workout_logs').insert({
    session_slot_id: slotId,
    client_id: clientId,
    status: 'booked',
    started_at: null,
    completed_at: null,
  })

  if (error) {
    if (error.code === '23505') throw new Error('Client is already booked into this session.')
    throw new Error(error.message)
  }

  revalidatePath(`/coach/schedule/${slotId}`)
}

// Cancels a booking
export async function cancelBooking(workoutLogId: string, slotId: string) {
  const { supabase } = await getAuthedUser()

  const { error } = await supabase
    .from('workout_logs')
    .update({ status: 'cancelled' })
    .eq('id', workoutLogId)

  if (error) throw new Error(error.message)

  revalidatePath(`/coach/schedule/${slotId}`)
}
