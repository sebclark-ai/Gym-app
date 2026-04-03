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

// Client books themselves into an open session slot
export async function bookSession(slotId: string) {
  const { supabase, user } = await getAuthedClient()

  const { error } = await supabase.from('workout_logs').insert({
    session_slot_id: slotId,
    client_id: user.id,
    status: 'booked',
    started_at: null,
    completed_at: null,
  })

  if (error) {
    if (error.code === '23505') throw new Error('You are already booked into this session.')
    throw new Error(error.message)
  }

  revalidatePath('/client')
  revalidatePath('/client/sessions')
}

// Client cancels their own booking
export async function cancelMyBooking(workoutLogId: string) {
  const { supabase, user } = await getAuthedClient()

  const { error } = await supabase
    .from('workout_logs')
    .update({ status: 'cancelled' })
    .eq('id', workoutLogId)
    .eq('client_id', user.id) // prevent cancelling other clients' bookings

  if (error) throw new Error(error.message)

  revalidatePath('/client')
  revalidatePath('/client/sessions')
}
