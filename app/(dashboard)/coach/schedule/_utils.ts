import type { WorkoutStatus } from '@/lib/types/database'

// Format a YYYY-MM-DD date key into a readable label like "Mon 13 Jan"
export function formatSlotDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`) // noon avoids DST edge cases
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Format an ISO timestamp into "9:00 AM"
export function formatSlotTime(startsAt: string): string {
  const date = new Date(startsAt)
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// Format an ISO timestamp into "YYYY-MM-DD" for date inputs
export function toDateInputValue(startsAt: string): string {
  return startsAt.slice(0, 10)
}

// Format an ISO timestamp into "HH:MM" for time inputs
export function toTimeInputValue(startsAt: string): string {
  const date = new Date(startsAt)
  return date.toTimeString().slice(0, 5)
}

// Calculate spaces remaining (not stored — derived from capacity and bookings)
export function spacesRemaining(
  capacity: number,
  workoutLogs: { status: WorkoutStatus | string }[],
): number {
  const booked = workoutLogs.filter((l) => l.status !== 'cancelled').length
  return Math.max(0, capacity - booked)
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const FOCUS_LABELS: Record<string, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
  cardio: 'Cardio',
  rest: 'Rest',
}
