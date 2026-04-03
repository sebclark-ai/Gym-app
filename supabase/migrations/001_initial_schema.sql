-- ============================================================
-- Chalc — initial schema
-- Run against your Supabase project via the SQL editor or CLI:
--   supabase db push
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
create type user_role       as enum ('owner', 'coach', 'client');
create type movement_focus  as enum ('upper', 'lower', 'full_body', 'cardio', 'rest');
create type exercise_category as enum ('warmup', 'main', 'accessory');
create type session_type    as enum ('sgpt', 'team_training');
create type workout_status  as enum ('booked', 'in_progress', 'completed', 'cancelled');

-- ── Gyms ─────────────────────────────────────────────────────
create table gyms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- ── Users ────────────────────────────────────────────────────
-- id mirrors auth.users.id so we can join without a lookup
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  gym_id     uuid not null references gyms(id) on delete cascade,
  full_name  text not null,
  email      text not null,
  role       user_role not null default 'client',
  avatar_url text,
  created_at timestamptz not null default now()
);

create index users_gym_id_idx  on users(gym_id);
create index users_role_idx    on users(role);

-- ── Blocks ───────────────────────────────────────────────────
create table blocks (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  name        text not null,
  week_count  int  not null default 6 check (week_count > 0),
  created_by  uuid not null references users(id),
  created_at  timestamptz not null default now()
);

create index blocks_gym_id_idx on blocks(gym_id);

-- ── Block Days ───────────────────────────────────────────────
-- Represents a recurring day within a block (e.g. "Monday — Upper Body")
create table block_days (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references blocks(id) on delete cascade,
  day_of_week     int  not null check (day_of_week between 0 and 5), -- 0=Mon 5=Sat
  movement_focus  movement_focus not null,
  notes           text,
  unique (block_id, day_of_week)
);

create index block_days_block_id_idx on block_days(block_id);

-- ── Block Sessions ───────────────────────────────────────────
-- One row per (week, day) — the canonical workout prescription
create table block_sessions (
  id            uuid primary key default gen_random_uuid(),
  block_id      uuid not null references blocks(id) on delete cascade,
  block_day_id  uuid not null references block_days(id) on delete cascade,
  week_number   int  not null check (week_number > 0),
  unique (block_id, block_day_id, week_number)
);

create index block_sessions_block_id_idx    on block_sessions(block_id);
create index block_sessions_block_day_idx   on block_sessions(block_day_id);

-- ── Exercises ────────────────────────────────────────────────
create table exercises (
  id                uuid primary key default gen_random_uuid(),
  block_session_id  uuid not null references block_sessions(id) on delete cascade,
  category          exercise_category not null,
  name              text not null,
  sets              int  not null check (sets > 0),
  reps              text not null,         -- "5", "8-10", "AMRAP", etc.
  weight_kg         numeric(6,2),          -- null = bodyweight / TBD
  coach_note        text,
  order_index       int  not null default 0
);

create index exercises_block_session_id_idx on exercises(block_session_id);
create index exercises_category_idx         on exercises(category);

-- ── Session Slots ────────────────────────────────────────────
-- A real-world schedulled class at a specific datetime
create table session_slots (
  id                uuid primary key default gen_random_uuid(),
  gym_id            uuid not null references gyms(id) on delete cascade,
  block_session_id  uuid references block_sessions(id) on delete set null,
  session_type      session_type not null,
  starts_at         timestamptz not null,
  duration_minutes  int  not null default 60 check (duration_minutes > 0),
  capacity          int  not null check (capacity > 0),
  created_at        timestamptz not null default now()
);

create index session_slots_gym_id_idx         on session_slots(gym_id);
create index session_slots_starts_at_idx      on session_slots(starts_at);
create index session_slots_block_session_idx  on session_slots(block_session_id);

-- ── Session Slot Coaches (many-to-many) ──────────────────────
create table session_slot_coaches (
  session_slot_id  uuid not null references session_slots(id) on delete cascade,
  coach_id         uuid not null references users(id) on delete cascade,
  primary key (session_slot_id, coach_id)
);

-- ── Workout Logs ─────────────────────────────────────────────
-- One per client per session slot
create table workout_logs (
  id               uuid primary key default gen_random_uuid(),
  session_slot_id  uuid not null references session_slots(id) on delete cascade,
  client_id        uuid not null references users(id) on delete cascade,
  status           workout_status not null default 'booked',
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (session_slot_id, client_id)
);

create index workout_logs_session_slot_id_idx on workout_logs(session_slot_id);
create index workout_logs_client_id_idx       on workout_logs(client_id);

-- ── Set Logs ─────────────────────────────────────────────────
create table set_logs (
  id               uuid primary key default gen_random_uuid(),
  workout_log_id   uuid not null references workout_logs(id) on delete cascade,
  exercise_id      uuid not null references exercises(id) on delete cascade,
  set_number       int  not null check (set_number > 0),
  weight_kg        numeric(6,2),
  reps_completed   int,
  is_pb            boolean not null default false,
  logged_at        timestamptz not null default now(),
  unique (workout_log_id, exercise_id, set_number)
);

create index set_logs_workout_log_id_idx on set_logs(workout_log_id);
create index set_logs_exercise_id_idx    on set_logs(exercise_id);
create index set_logs_client_exercise_idx
  on set_logs(exercise_id, logged_at desc);

-- ============================================================
-- Helper function: spaces remaining for a slot (calculated)
-- ============================================================
create or replace function get_spaces_remaining(slot_id uuid)
returns int
language sql
stable
as $$
  select s.capacity - count(wl.id)::int
  from   session_slots s
  left join workout_logs wl
    on  wl.session_slot_id = s.id
    and wl.status != 'cancelled'
  where  s.id = slot_id
  group  by s.capacity;
$$;

-- ============================================================
-- Trigger: auto-detect PB on set_log insert/update
-- A set is a PB if weight_kg * reps_completed is the best the
-- client has ever logged for that exercise (simple volume proxy).
-- ============================================================
create or replace function check_pb()
returns trigger
language plpgsql
as $$
declare
  v_client_id uuid;
  v_best      numeric;
begin
  -- Resolve client from workout_log
  select client_id into v_client_id
  from   workout_logs
  where  id = new.workout_log_id;

  -- Best previous volume for this client on this exercise (excluding current row)
  select coalesce(max(coalesce(weight_kg, 0) * coalesce(reps_completed, 0)), 0)
  into   v_best
  from   set_logs sl
  join   workout_logs wl on wl.id = sl.workout_log_id
  where  sl.exercise_id = new.exercise_id
    and  wl.client_id   = v_client_id
    and  sl.id         != new.id;

  new.is_pb := (coalesce(new.weight_kg, 0) * coalesce(new.reps_completed, 0)) > v_best;

  return new;
end;
$$;

create trigger trg_check_pb
before insert or update on set_logs
for each row execute function check_pb();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table gyms                  enable row level security;
alter table users                 enable row level security;
alter table blocks                enable row level security;
alter table block_days            enable row level security;
alter table block_sessions        enable row level security;
alter table exercises             enable row level security;
alter table session_slots         enable row level security;
alter table session_slot_coaches  enable row level security;
alter table workout_logs          enable row level security;
alter table set_logs              enable row level security;

-- ── RLS helper: current user's gym_id ────────────────────────
create or replace function my_gym_id()
returns uuid
language sql
stable
as $$
  select gym_id from users where id = auth.uid();
$$;

-- ── RLS helper: current user's role ──────────────────────────
create or replace function my_role()
returns user_role
language sql
stable
as $$
  select role from users where id = auth.uid();
$$;

-- ── gyms: all members of the gym can read ────────────────────
create policy "gym members can view their gym"
  on gyms for select
  using (id = my_gym_id());

-- ── users ────────────────────────────────────────────────────
create policy "users can view members of their gym"
  on users for select
  using (gym_id = my_gym_id());

create policy "users can update their own profile"
  on users for update
  using (id = auth.uid());

-- ── blocks ───────────────────────────────────────────────────
create policy "gym members can view blocks"
  on blocks for select
  using (gym_id = my_gym_id());

create policy "coaches and owners can manage blocks"
  on blocks for all
  using (gym_id = my_gym_id() and my_role() in ('owner', 'coach'));

-- ── block_days ───────────────────────────────────────────────
create policy "gym members can view block days"
  on block_days for select
  using (
    block_id in (select id from blocks where gym_id = my_gym_id())
  );

create policy "coaches and owners can manage block days"
  on block_days for all
  using (
    block_id in (select id from blocks where gym_id = my_gym_id())
    and my_role() in ('owner', 'coach')
  );

-- ── block_sessions ───────────────────────────────────────────
create policy "gym members can view block sessions"
  on block_sessions for select
  using (
    block_id in (select id from blocks where gym_id = my_gym_id())
  );

create policy "coaches and owners can manage block sessions"
  on block_sessions for all
  using (
    block_id in (select id from blocks where gym_id = my_gym_id())
    and my_role() in ('owner', 'coach')
  );

-- ── exercises ────────────────────────────────────────────────
create policy "gym members can view exercises"
  on exercises for select
  using (
    block_session_id in (
      select bs.id from block_sessions bs
      join blocks b on b.id = bs.block_id
      where b.gym_id = my_gym_id()
    )
  );

create policy "coaches and owners can manage exercises"
  on exercises for all
  using (
    block_session_id in (
      select bs.id from block_sessions bs
      join blocks b on b.id = bs.block_id
      where b.gym_id = my_gym_id()
    )
    and my_role() in ('owner', 'coach')
  );

-- ── session_slots ────────────────────────────────────────────
create policy "gym members can view session slots"
  on session_slots for select
  using (gym_id = my_gym_id());

create policy "coaches and owners can manage session slots"
  on session_slots for all
  using (gym_id = my_gym_id() and my_role() in ('owner', 'coach'));

-- ── session_slot_coaches ─────────────────────────────────────
create policy "gym members can view slot coaches"
  on session_slot_coaches for select
  using (
    session_slot_id in (
      select id from session_slots where gym_id = my_gym_id()
    )
  );

create policy "owners can manage slot coaches"
  on session_slot_coaches for all
  using (
    session_slot_id in (
      select id from session_slots where gym_id = my_gym_id()
    )
    and my_role() in ('owner', 'coach')
  );

-- ── workout_logs ─────────────────────────────────────────────
create policy "clients can view their own workout logs"
  on workout_logs for select
  using (client_id = auth.uid());

create policy "coaches and owners can view all gym workout logs"
  on workout_logs for select
  using (
    my_role() in ('owner', 'coach')
    and session_slot_id in (
      select id from session_slots where gym_id = my_gym_id()
    )
  );

create policy "clients can create their own workout logs"
  on workout_logs for insert
  with check (client_id = auth.uid());

create policy "clients can update their own workout logs"
  on workout_logs for update
  using (client_id = auth.uid());

-- ── set_logs ─────────────────────────────────────────────────
create policy "clients can manage their own set logs"
  on set_logs for all
  using (
    workout_log_id in (
      select id from workout_logs where client_id = auth.uid()
    )
  );

create policy "coaches and owners can view set logs in their gym"
  on set_logs for select
  using (
    my_role() in ('owner', 'coach')
    and workout_log_id in (
      select wl.id from workout_logs wl
      join session_slots ss on ss.id = wl.session_slot_id
      where ss.gym_id = my_gym_id()
    )
  );
