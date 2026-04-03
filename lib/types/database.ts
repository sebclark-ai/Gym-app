export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'coach' | 'client'
export type MovementFocus = 'upper' | 'lower' | 'full_body' | 'cardio' | 'rest'
export type ExerciseCategory = 'warmup' | 'main' | 'accessory'
export type SessionType = 'sgpt' | 'team_training'
export type WorkoutStatus = 'booked' | 'in_progress' | 'completed' | 'cancelled'

// ─── Row types ────────────────────────────────────────────────────────────────
// Must be `type` (not `interface`) so they satisfy Record<string, unknown>
// in Supabase's GenericTable constraint.

export type GymRow = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type UserRow = {
  id: string
  gym_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export type BlockRow = {
  id: string
  gym_id: string
  name: string
  week_count: number
  created_by: string
  created_at: string
}

export type BlockDayRow = {
  id: string
  block_id: string
  day_of_week: number
  movement_focus: MovementFocus
  notes: string | null
}

export type BlockSessionRow = {
  id: string
  block_id: string
  block_day_id: string
  week_number: number
}

export type ExerciseRow = {
  id: string
  block_session_id: string
  category: ExerciseCategory
  name: string
  sets: number
  reps: string
  weight_kg: number | null
  coach_note: string | null
  order_index: number
}

export type SessionSlotRow = {
  id: string
  gym_id: string
  block_session_id: string | null
  session_type: SessionType
  starts_at: string
  duration_minutes: number
  capacity: number
  created_at: string
}

export type SessionSlotCoachRow = {
  session_slot_id: string
  coach_id: string
}

export type WorkoutLogRow = {
  id: string
  session_slot_id: string
  client_id: string
  status: WorkoutStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type SetLogRow = {
  id: string
  workout_log_id: string
  exercise_id: string
  set_number: number
  weight_kg: number | null
  reps_completed: number | null
  is_pb: boolean
  logged_at: string
}

// ─── Insert types ─────────────────────────────────────────────────────────────

export type GymInsert = Omit<GymRow, 'id' | 'created_at'>
export type UserInsert = Omit<UserRow, 'created_at'>
export type BlockInsert = Omit<BlockRow, 'id' | 'created_at'>
export type BlockDayInsert = Omit<BlockDayRow, 'id'>
export type BlockSessionInsert = Omit<BlockSessionRow, 'id'>
export type ExerciseInsert = Omit<ExerciseRow, 'id'>
export type SessionSlotInsert = Omit<SessionSlotRow, 'id' | 'created_at'>
export type WorkoutLogInsert = Omit<WorkoutLogRow, 'id' | 'created_at'>
export type SetLogInsert = Omit<SetLogRow, 'id' | 'logged_at'>

// ─── Supabase Database shape ──────────────────────────────────────────────────
// Each table requires a Relationships array to satisfy @supabase/supabase-js's
// GenericTable constraint; otherwise TypeScript infers data as `never`.

export interface Database {
  public: {
    Tables: {
      gyms: {
        Row: GymRow
        Insert: GymInsert
        Update: Partial<GymInsert>
        Relationships: []
      }
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: Partial<UserInsert>
        Relationships: [
          {
            foreignKeyName: 'users_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          }
        ]
      }
      blocks: {
        Row: BlockRow
        Insert: BlockInsert
        Update: Partial<BlockInsert>
        Relationships: [
          {
            foreignKeyName: 'blocks_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      block_days: {
        Row: BlockDayRow
        Insert: BlockDayInsert
        Update: Partial<BlockDayInsert>
        Relationships: [
          {
            foreignKeyName: 'block_days_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'blocks'
            referencedColumns: ['id']
          }
        ]
      }
      block_sessions: {
        Row: BlockSessionRow
        Insert: BlockSessionInsert
        Update: Partial<BlockSessionInsert>
        Relationships: [
          {
            foreignKeyName: 'block_sessions_block_id_fkey'
            columns: ['block_id']
            isOneToOne: false
            referencedRelation: 'blocks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'block_sessions_block_day_id_fkey'
            columns: ['block_day_id']
            isOneToOne: false
            referencedRelation: 'block_days'
            referencedColumns: ['id']
          }
        ]
      }
      exercises: {
        Row: ExerciseRow
        Insert: ExerciseInsert
        Update: Partial<ExerciseInsert>
        Relationships: [
          {
            foreignKeyName: 'exercises_block_session_id_fkey'
            columns: ['block_session_id']
            isOneToOne: false
            referencedRelation: 'block_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      session_slots: {
        Row: SessionSlotRow
        Insert: SessionSlotInsert
        Update: Partial<SessionSlotInsert>
        Relationships: [
          {
            foreignKeyName: 'session_slots_gym_id_fkey'
            columns: ['gym_id']
            isOneToOne: false
            referencedRelation: 'gyms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_slots_block_session_id_fkey'
            columns: ['block_session_id']
            isOneToOne: false
            referencedRelation: 'block_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      session_slot_coaches: {
        Row: SessionSlotCoachRow
        Insert: SessionSlotCoachRow
        Update: Partial<SessionSlotCoachRow>
        Relationships: [
          {
            foreignKeyName: 'session_slot_coaches_session_slot_id_fkey'
            columns: ['session_slot_id']
            isOneToOne: false
            referencedRelation: 'session_slots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_slot_coaches_coach_id_fkey'
            columns: ['coach_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      workout_logs: {
        Row: WorkoutLogRow
        Insert: WorkoutLogInsert
        Update: Partial<WorkoutLogInsert>
        Relationships: [
          {
            foreignKeyName: 'workout_logs_session_slot_id_fkey'
            columns: ['session_slot_id']
            isOneToOne: false
            referencedRelation: 'session_slots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workout_logs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      set_logs: {
        Row: SetLogRow
        Insert: SetLogInsert
        Update: Partial<SetLogInsert>
        Relationships: [
          {
            foreignKeyName: 'set_logs_workout_log_id_fkey'
            columns: ['workout_log_id']
            isOneToOne: false
            referencedRelation: 'workout_logs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'set_logs_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_spaces_remaining: {
        Args: { slot_id: string }
        Returns: number
      }
      my_gym_id: {
        Args: Record<string, never>
        Returns: string
      }
      my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      movement_focus: MovementFocus
      exercise_category: ExerciseCategory
      session_type: SessionType
      workout_status: WorkoutStatus
    }
  }
}
