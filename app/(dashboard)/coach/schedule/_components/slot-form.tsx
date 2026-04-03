'use client'

import { useState, useTransition } from 'react'
import { createSessionSlot, updateSessionSlot } from '../_actions'
import type { SessionSlotRow, UserRow } from '@/lib/types/database'
import { FOCUS_LABELS, DAY_NAMES } from '../_utils'

type BlockSessionOption = {
  id: string
  week_number: number
  block_name: string
  day_of_week: number
  movement_focus: string
}

type Props = {
  // Undefined = create mode, defined = edit mode
  slot?: SessionSlotRow & { coachIds: string[] }
  coaches: Pick<UserRow, 'id' | 'full_name'>[]
  blockSessions: BlockSessionOption[]
  defaultDate?: string  // YYYY-MM-DD, pre-fill when coming from a date
}

export default function SlotForm({ slot, coaches, blockSessions, defaultDate }: Props) {
  const isEdit = !!slot

  const [sessionType, setSessionType] = useState<'sgpt' | 'team_training'>(
    slot?.session_type ?? 'sgpt',
  )
  const [capacity, setCapacity] = useState(slot?.capacity ?? 12)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTypeChange(type: 'sgpt' | 'team_training') {
    setSessionType(type)
    // Auto-set sensible capacity defaults
    if (!isEdit) setCapacity(type === 'sgpt' ? 12 : 24)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateSessionSlot(slot!.id, formData)
        } else {
          await createSessionSlot(formData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  // Default date for the input
  const defaultDateValue =
    slot ? slot.starts_at.slice(0, 10) : (defaultDate ?? new Date().toISOString().slice(0, 10))

  // Default time for the input
  const defaultTimeValue = slot
    ? new Date(slot.starts_at).toTimeString().slice(0, 5)
    : '09:00'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultDateValue}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            type="time"
            name="time"
            required
            defaultValue={defaultTimeValue}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Session type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Session type</label>
        <div className="flex gap-2">
          {(['sgpt', 'team_training'] as const).map((t) => (
            <label
              key={t}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                sessionType === t
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="session_type"
                value={t}
                checked={sessionType === t}
                onChange={() => handleTypeChange(t)}
                className="sr-only"
              />
              {t === 'sgpt' ? 'SGPT' : 'Team Training'}
            </label>
          ))}
        </div>
      </div>

      {/* Capacity + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
          <input
            type="number"
            name="capacity"
            required
            min={1}
            max={100}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
          <input
            type="number"
            name="duration_minutes"
            required
            min={15}
            max={240}
            step={5}
            defaultValue={slot?.duration_minutes ?? 60}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Block session link — SGPT only */}
      {sessionType === 'sgpt' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Block session <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            name="block_session_id"
            defaultValue={slot?.block_session_id ?? ''}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">— no programme linked —</option>
            {blockSessions.map((bs) => (
              <option key={bs.id} value={bs.id}>
                {bs.block_name} · Wk {bs.week_number} · {DAY_NAMES[bs.day_of_week]} ·{' '}
                {FOCUS_LABELS[bs.movement_focus] ?? bs.movement_focus}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Coaches */}
      {coaches.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Coaches</label>
          <div className="space-y-2">
            {coaches.map((coach) => (
              <label key={coach.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="coach_ids"
                  value={coach.id}
                  defaultChecked={slot?.coachIds.includes(coach.id) ?? false}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">{coach.full_name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create session'}
        </button>
        <a
          href={isEdit ? `/coach/schedule/${slot!.id}` : '/coach/schedule'}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
