'use client'

import { useState, useRef } from 'react'
import type { ExerciseRow, ExerciseCategory } from '@/lib/types/database'
import {
  createExercise,
  updateExercise,
  deleteExercise,
  copySessionExercises,
} from '@/app/(dashboard)/coach/_actions'

interface Props {
  sessionId: string
  blockId: string
  exercises: ExerciseRow[]
  otherSessions: { id: string; week_number: number }[]
}

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Warmup',
  main: 'Main',
  accessory: 'Accessory',
}

const CATEGORY_BADGE: Record<ExerciseCategory, string> = {
  warmup: 'bg-blue-100 text-blue-700',
  main: 'bg-orange-100 text-orange-700',
  accessory: 'bg-green-100 text-green-700',
}

const CATEGORY_ORDER: ExerciseCategory[] = ['warmup', 'main', 'accessory']

export default function ExerciseEditor({ sessionId, blockId, exercises, otherSessions }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseRow | null>(null)
  const [copyFromId, setCopyFromId] = useState(otherSessions[0]?.id ?? '')
  const [isPending, setIsPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function openAddForm() {
    setEditingExercise(null)
    setShowForm(true)
  }

  function openEditForm(exercise: ExerciseRow) {
    setEditingExercise(exercise)
    setShowForm(true)
  }

  function closeForm() {
    setEditingExercise(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    try {
      if (editingExercise) {
        await updateExercise(formData)
      } else {
        await createExercise(formData)
      }
      closeForm()
    } finally {
      setIsPending(false)
    }
  }

  async function handleCopy() {
    if (!copyFromId) return
    if (!confirm('This will replace all exercises in this session. Continue?')) return
    setIsPending(true)
    try {
      await copySessionExercises(copyFromId, sessionId, blockId)
    } finally {
      setIsPending(false)
    }
  }

  // Group exercises by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    exercises: exercises.filter((ex) => ex.category === cat),
  })).filter((g) => g.exercises.length > 0)

  const nextOrderIndex = exercises.length > 0 ? Math.max(...exercises.map((e) => e.order_index)) + 1 : 0

  return (
    <div className="space-y-6">
      {/* Exercise list */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-gray-500 text-sm">No exercises yet. Add the first one below.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, exercises: catExercises }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGE[category]}`}>
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              <ul className="space-y-2">
                {catExercises.map((exercise) => (
                  <li
                    key={exercise.id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{exercise.name}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {exercise.sets} sets × {exercise.reps}
                          {exercise.weight_kg != null && ` @ ${exercise.weight_kg}kg`}
                        </p>
                        {exercise.coach_note && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{exercise.coach_note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditForm(exercise)}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Edit
                        </button>
                        <form
                          action={deleteExercise.bind(null, exercise.id, sessionId, blockId)}
                          onSubmit={(e) => {
                            if (!confirm('Delete this exercise?')) e.preventDefault()
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add Exercise button */}
      {!showForm && (
        <button
          type="button"
          onClick={openAddForm}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          + Add Exercise
        </button>
      )}

      {/* Exercise form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 text-sm">
            {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
          </h2>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden fields */}
            <input type="hidden" name="session_id" value={sessionId} />
            <input type="hidden" name="block_id" value={blockId} />
            {editingExercise && (
              <input type="hidden" name="exercise_id" value={editingExercise.id} />
            )}
            <input
              type="hidden"
              name="order_index"
              value={editingExercise ? editingExercise.order_index : nextOrderIndex}
            />

            {/* Category */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                name="category"
                defaultValue={editingExercise?.category ?? 'main'}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="warmup">Warmup</option>
                <option value="main">Main</option>
                <option value="accessory">Accessory</option>
              </select>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Exercise name</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={editingExercise?.name ?? ''}
                placeholder="e.g. Back Squat"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Sets */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Sets</label>
                <input
                  type="number"
                  name="sets"
                  required
                  min={1}
                  max={20}
                  defaultValue={editingExercise?.sets ?? 3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              {/* Reps */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Reps</label>
                <input
                  type="text"
                  name="reps"
                  required
                  defaultValue={editingExercise?.reps ?? ''}
                  placeholder="e.g. 5, 8-10, AMRAP"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Weight */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Weight (kg) <span className="text-gray-400 font-normal">optional</span>
              </label>
              <input
                type="number"
                name="weight_kg"
                step="0.5"
                min={0}
                defaultValue={editingExercise?.weight_kg ?? ''}
                placeholder="e.g. 80"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* Coach note */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Coach note <span className="text-gray-400 font-normal">optional</span>
              </label>
              <textarea
                name="coach_note"
                rows={2}
                defaultValue={editingExercise?.coach_note ?? ''}
                placeholder="Cues, tempo, rest periods..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : editingExercise ? 'Save Changes' : 'Add Exercise'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Copy from week */}
      {otherSessions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Copy exercises from another week</p>
          <div className="flex gap-3 items-center">
            <select
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {otherSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Week {s.week_number}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopy}
              disabled={isPending || !copyFromId}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Copying…' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Warning: this will replace all exercises in the current week.
          </p>
        </div>
      )}
    </div>
  )
}
