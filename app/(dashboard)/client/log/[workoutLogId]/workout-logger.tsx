'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { saveSetLog, startSession, completeSession } from '../_actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Exercise = {
  id: string
  name: string
  category: string
  sets: number
  reps: string
  weight_kg: number | null
  coach_note: string | null
  order_index: number
}

type SetState = {
  weight: string
  reps: string
  saved: boolean
  logId: string | null
  isPb: boolean
  saving: boolean
}

type Props = {
  workoutLogId: string
  focusLabel: string
  weekNumber: number
  exercises: Exercise[]
  prefill: Record<string, { weight: number | null; reps: number | null }>
  existingLogs: {
    id: string
    exercise_id: string
    set_number: number
    weight_kg: number | null
    reps_completed: number | null
    is_pb: boolean
  }[]
  initialStatus: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Group sorted exercises into nav nodes: W for warmups, A B C… for main/accessory */
function buildNodes(exercises: Exercise[]) {
  const warmups = exercises.filter((e) => e.category === 'warmup')
  const others = exercises.filter((e) => e.category !== 'warmup')
  const nodes: { label: string; exercises: Exercise[] }[] = []
  if (warmups.length) nodes.push({ label: 'W', exercises: warmups })
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  others.forEach((ex, i) => nodes.push({ label: letters[i % 26]!, exercises: [ex] }))
  return nodes
}

/** Parse a reps prescription ("8-10", "5", "AMRAP") → default string for input */
function parseRepsDefault(reps: string): string {
  const m = reps.match(/\d+/)
  return m ? m[0] : ''
}

/** Unique key for a set state entry */
function setKey(exerciseId: string, setNum: number) {
  return `${exerciseId}:${setNum}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutLogger({
  workoutLogId,
  focusLabel,
  weekNumber,
  exercises,
  prefill,
  existingLogs,
  initialStatus,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const hasStarted = useRef(initialStatus === 'in_progress')

  const nodes = buildNodes(exercises)
  const [nodeIdx, setNodeIdx] = useState(0)

  // ── Initial set state ──────────────────────────────────────────────────────
  const buildInitialState = useCallback((): Record<string, SetState> => {
    const state: Record<string, SetState> = {}

    // Index existing logs for fast lookup
    const existingByKey = new Map(
      existingLogs.map((l) => [setKey(l.exercise_id, l.set_number), l]),
    )

    for (const ex of exercises) {
      const pf = prefill[ex.id]
      for (let s = 1; s <= ex.sets; s++) {
        const key = setKey(ex.id, s)
        const existing = existingByKey.get(key)
        state[key] = {
          weight: existing
            ? (existing.weight_kg?.toString() ?? '')
            : (pf?.weight?.toString() ?? ex.weight_kg?.toString() ?? ''),
          reps: existing
            ? (existing.reps_completed?.toString() ?? '')
            : (pf?.reps?.toString() ?? parseRepsDefault(ex.reps)),
          saved: !!existing,
          logId: existing?.id ?? null,
          isPb: existing?.is_pb ?? false,
          saving: false,
        }
      }
    }
    return state
  }, [exercises, prefill, existingLogs])

  const [sets, setSets] = useState<Record<string, SetState>>(buildInitialState)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function updateSet(exerciseId: string, setNum: number, patch: Partial<SetState>) {
    setSets((prev) => ({
      ...prev,
      [setKey(exerciseId, setNum)]: { ...prev[setKey(exerciseId, setNum)]!, ...patch },
    }))
  }

  async function handleSave(exerciseId: string, setNum: number) {
    const s = sets[setKey(exerciseId, setNum)]!
    if (s.saving || s.saved) return

    // Mark session in-progress on first save
    if (!hasStarted.current) {
      hasStarted.current = true
      startTransition(() => { startSession(workoutLogId) })
    }

    updateSet(exerciseId, setNum, { saving: true })

    try {
      const result = await saveSetLog(
        workoutLogId,
        exerciseId,
        setNum,
        s.weight ? parseFloat(s.weight) : null,
        s.reps ? parseInt(s.reps, 10) : null,
      )
      updateSet(exerciseId, setNum, {
        saved: true,
        saving: false,
        logId: result.id,
        isPb: result.is_pb,
      })
    } catch {
      updateSet(exerciseId, setNum, { saving: false })
    }
  }

  function handleUnsave(exerciseId: string, setNum: number) {
    // Allow editing a saved set by toggling it back to unsaved
    updateSet(exerciseId, setNum, { saved: false, logId: null, isPb: false })
  }

  function handleClear(exerciseId: string, setNum: number) {
    updateSet(exerciseId, setNum, { weight: '', reps: '', saved: false, logId: null, isPb: false })
  }

  async function handleEnd() {
    if (!confirm('End this workout? This cannot be undone.')) return
    startTransition(() => { completeSession(workoutLogId) })
  }

  // ── Node completion status ─────────────────────────────────────────────────

  function nodeComplete(node: (typeof nodes)[0]) {
    return node.exercises.every((ex) =>
      Array.from({ length: ex.sets }, (_, i) => sets[setKey(ex.id, i + 1)]?.saved).every(Boolean),
    )
  }

  const currentNode = nodes[nodeIdx]!

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-svh flex-col bg-white overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-5 pt-8 pb-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Week {weekNumber}</p>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-2xl font-bold">{focusLabel}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnd}
              className="rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              End
            </button>
          </div>
        </div>
        <div className="mt-3 h-px bg-gray-200" />
      </header>

      {/* ── Exercise nav circles ─────────────────────────────────────────── */}
      <div className="shrink-0 flex gap-3 overflow-x-auto px-5 py-3 scrollbar-hide">
        {nodes.map((node, i) => {
          const done = nodeComplete(node)
          const current = i === nodeIdx
          return (
            <button
              key={node.label}
              onClick={() => setNodeIdx(i)}
              className={[
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                done && !current
                  ? 'bg-green-200 text-green-800'
                  : current
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-400',
              ].join(' ')}
            >
              {node.label}
            </button>
          )
        })}
      </div>

      {/* ── Scrollable content area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6">
        {currentNode.exercises.map((ex) => (
          <ExerciseSection
            key={ex.id}
            exercise={ex}
            sets={Array.from({ length: ex.sets }, (_, i) => ({
              num: i + 1,
              state: sets[setKey(ex.id, i + 1)]!,
            }))}
            onWeightChange={(num, val) =>
              updateSet(ex.id, num, { weight: val, saved: false })
            }
            onRepsChange={(num, val) =>
              updateSet(ex.id, num, { reps: val, saved: false })
            }
            onClear={(num) => handleClear(ex.id, num)}
            onSave={(num) => handleSave(ex.id, num)}
            onUnsave={(num) => handleUnsave(ex.id, num)}
          />
        ))}
      </div>

      {/* ── Bottom action bar ────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-t border-gray-100 bg-white">
        <BarButton
          label="Previous"
          disabled={nodeIdx === 0}
          onClick={() => setNodeIdx((i) => Math.max(0, i - 1))}
        />
        <BarButton
          label="Next"
          disabled={nodeIdx === nodes.length - 1}
          onClick={() => setNodeIdx((i) => Math.min(nodes.length - 1, i + 1))}
          highlight
        />
      </div>
    </div>
  )
}

// ─── ExerciseSection ─────────────────────────────────────────────────────────

function ExerciseSection({
  exercise,
  sets,
  onWeightChange,
  onRepsChange,
  onClear,
  onSave,
  onUnsave,
}: {
  exercise: Exercise
  sets: { num: number; state: SetState }[]
  onWeightChange: (setNum: number, val: string) => void
  onRepsChange: (setNum: number, val: string) => void
  onClear: (setNum: number) => void
  onSave: (setNum: number) => void
  onUnsave: (setNum: number) => void
}) {
  // Split name into equipment hint + movement (e.g. "Barbell Bench Press" → hint="Barbell", name="Bench Press")
  const parts = exercise.name.split(' ')
  const equipmentHints = ['Barbell', 'Dumbbell', 'Cable', 'Kettlebell', 'Machine', 'Bodyweight', 'Band']
  const hint = parts.length > 1 && equipmentHints.some((h) => exercise.name.startsWith(h))
    ? parts[0]
    : null
  const displayName = hint ? parts.slice(1).join(' ') : exercise.name

  return (
    <div className="space-y-4">
      {/* Exercise header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          {hint && <p className="text-sm text-gray-400">{hint}</p>}
          <p className="text-2xl font-bold leading-tight">{displayName}</p>
          <p className="mt-0.5 text-sm text-gray-400">
            {sets.length} sets · {exercise.reps} reps
            {exercise.weight_kg ? ` · ${exercise.weight_kg}kg prescribed` : ''}
          </p>
        </div>
      </div>

      {/* Coach note */}
      {exercise.coach_note && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-0.5">Coaches Notes:</p>
          <p className="text-sm text-gray-700">{exercise.coach_note}</p>
        </div>
      )}

      {/* Set rows */}
      <div className="space-y-3">
        {sets.map(({ num, state }) => (
          <SetRow
            key={num}
            setNum={num}
            state={state}
            onWeightChange={(v) => onWeightChange(num, v)}
            onRepsChange={(v) => onRepsChange(num, v)}
            onClear={() => onClear(num)}
            onSave={() => onSave(num)}
            onUnsave={() => onUnsave(num)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── SetRow ──────────────────────────────────────────────────────────────────

function SetRow({
  setNum,
  state,
  onWeightChange,
  onRepsChange,
  onClear,
  onSave,
  onUnsave,
}: {
  setNum: number
  state: SetState
  onWeightChange: (v: string) => void
  onRepsChange: (v: string) => void
  onClear: () => void
  onSave: () => void
  onUnsave: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Set number */}
      <span className="w-5 shrink-0 text-sm text-gray-400 text-right">{setNum}</span>

      {/* Weight pill */}
      <div
        className={[
          'flex flex-1 items-center rounded-full px-3 py-2 gap-1',
          state.saved ? 'bg-gray-100' : 'bg-gray-100',
        ].join(' ')}
      >
        <input
          type="number"
          inputMode="decimal"
          value={state.weight}
          onChange={(e) => onWeightChange(e.target.value)}
          placeholder="—"
          disabled={state.saving}
          className="w-full min-w-0 bg-transparent text-center text-sm font-semibold outline-none placeholder:text-gray-300"
        />
        <span className="shrink-0 text-xs text-gray-400">kg</span>
      </div>

      {/* Clear button */}
      <button
        onClick={onClear}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 text-xs"
        aria-label="Clear set"
      >
        ×
      </button>

      {/* Reps pill */}
      <div className="flex flex-1 items-center rounded-full bg-gray-100 px-3 py-2 gap-1">
        <input
          type="number"
          inputMode="numeric"
          value={state.reps}
          onChange={(e) => onRepsChange(e.target.value)}
          placeholder="—"
          disabled={state.saving}
          className="w-full min-w-0 bg-transparent text-center text-sm font-semibold outline-none placeholder:text-gray-300"
        />
        <span className="shrink-0 text-xs text-gray-400">reps</span>
      </div>

      {/* Tick / PB */}
      <button
        onClick={state.saved ? onUnsave : onSave}
        disabled={state.saving}
        className={[
          'shrink-0 text-xl font-bold transition-colors',
          state.saving
            ? 'text-gray-200'
            : state.saved
            ? state.isPb
              ? 'text-yellow-500'
              : 'text-gray-900'
            : 'text-gray-200 hover:text-gray-400',
        ].join(' ')}
        aria-label={state.saved ? 'Undo set' : 'Complete set'}
        title={state.isPb ? '🏆 Personal best!' : undefined}
      >
        {state.isPb ? '★' : '✓'}
      </button>
    </div>
  )
}

// ─── BarButton ───────────────────────────────────────────────────────────────

function BarButton({
  label,
  onClick,
  disabled,
  highlight,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex-1 py-4 text-sm font-semibold transition-colors',
        disabled
          ? 'text-gray-200'
          : highlight
          ? 'text-brand-600 hover:bg-brand-50'
          : 'text-gray-500 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
