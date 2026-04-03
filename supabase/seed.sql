-- ============================================================
-- Chalc — development seed
-- ============================================================
-- Run this in the Supabase SQL editor AFTER 001_initial_schema.sql
-- Creates a test gym with realistic data so every screen works.
--
-- Test accounts (password: Chalc2024!)
--   owner@ctpt.test   — owner dashboard
--   sarah@ctpt.test   — coach dashboard
--   mike@ctpt.test    — coach dashboard
--   alice@ctpt.test   — client home (has completed sessions + upcoming)
--   bob@ctpt.test     — client home (booked but no history)
--   charlie@ctpt.test — client home (empty state)
-- ============================================================

-- ── Fixed UUIDs (keeps seed idempotent) ──────────────────────

do $$ begin
  -- Clean up any prior seed run
  delete from auth.identities  where user_id in (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'cccccccc-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000003'
  );
  delete from auth.users where id in (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000003',
    'cccccccc-0000-0000-0000-000000000001',
    'cccccccc-0000-0000-0000-000000000002',
    'cccccccc-0000-0000-0000-000000000003'
  );
  delete from public.gyms where id = 'aaaaaaaa-0000-0000-0000-000000000001';
end $$;

-- ── Auth users ────────────────────────────────────────────────
-- Supabase's pgcrypto extension hashes the password here.
-- All accounts use password: Chalc2024!

insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'owner@ctpt.test',
   crypt('Chalc2024!', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   false, 'authenticated', 'authenticated'),

  ('bbbbbbbb-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'sarah@ctpt.test',
   crypt('Chalc2024!', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   false, 'authenticated', 'authenticated'),

  ('bbbbbbbb-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'mike@ctpt.test',
   crypt('Chalc2024!', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   false, 'authenticated', 'authenticated'),

  ('cccccccc-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'alice@ctpt.test',
   crypt('Chalc2024!', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   false, 'authenticated', 'authenticated'),

  ('cccccccc-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'bob@ctpt.test',
   crypt('Chalc2024!', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   false, 'authenticated', 'authenticated'),

  ('cccccccc-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'charlie@ctpt.test',
   crypt('Chalc2024!', gen_salt('bf', 10)),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   false, 'authenticated', 'authenticated');

-- Required so email/password sign-in resolves the identity
insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001',
   jsonb_build_object('sub','bbbbbbbb-0000-0000-0000-000000000001','email','owner@ctpt.test'),
   'email', 'bbbbbbbb-0000-0000-0000-000000000001', now(), now(), now()),

  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   jsonb_build_object('sub','bbbbbbbb-0000-0000-0000-000000000002','email','sarah@ctpt.test'),
   'email', 'bbbbbbbb-0000-0000-0000-000000000002', now(), now(), now()),

  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000003',
   jsonb_build_object('sub','bbbbbbbb-0000-0000-0000-000000000003','email','mike@ctpt.test'),
   'email', 'bbbbbbbb-0000-0000-0000-000000000003', now(), now(), now()),

  (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000001',
   jsonb_build_object('sub','cccccccc-0000-0000-0000-000000000001','email','alice@ctpt.test'),
   'email', 'cccccccc-0000-0000-0000-000000000001', now(), now(), now()),

  (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000002',
   jsonb_build_object('sub','cccccccc-0000-0000-0000-000000000002','email','bob@ctpt.test'),
   'email', 'cccccccc-0000-0000-0000-000000000002', now(), now(), now()),

  (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000003',
   jsonb_build_object('sub','cccccccc-0000-0000-0000-000000000003','email','charlie@ctpt.test'),
   'email', 'cccccccc-0000-0000-0000-000000000003', now(), now(), now());

-- ── Gym ───────────────────────────────────────────────────────

insert into public.gyms (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'CTPT Canterbury', 'ctpt');

-- ── Public users (mirrors auth.users) ────────────────────────

insert into public.users (id, gym_id, full_name, email, role) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Dan Owens', 'owner@ctpt.test', 'owner'),

  ('bbbbbbbb-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Sarah Brooks', 'sarah@ctpt.test', 'coach'),

  ('bbbbbbbb-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Mike Chen', 'mike@ctpt.test', 'coach'),

  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Alice Martin', 'alice@ctpt.test', 'client'),

  ('cccccccc-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Bob Patel', 'bob@ctpt.test', 'client'),

  ('cccccccc-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Charlie Webb', 'charlie@ctpt.test', 'client');

-- ============================================================
-- Programme: Block A — 4 weeks, Mon/Wed/Fri
-- ============================================================

insert into public.blocks (id, gym_id, name, week_count, created_by) values
  ('dddddddd-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Block A', 4,
   'bbbbbbbb-0000-0000-0000-000000000001');

-- Block days
insert into public.block_days (id, block_id, day_of_week, movement_focus, notes) values
  ('eeeeeeee-0000-0000-0000-000000000001',  -- Monday Upper
   'dddddddd-0000-0000-0000-000000000001', 0, 'upper',
   'Focus on controlling the eccentric. Rest 90s between main sets.'),

  ('eeeeeeee-0000-0000-0000-000000000002',  -- Wednesday Lower
   'dddddddd-0000-0000-0000-000000000001', 2, 'lower',
   'Drive through the heel on squats. Brace hard.'),

  ('eeeeeeee-0000-0000-0000-000000000003',  -- Friday Full Body
   'dddddddd-0000-0000-0000-000000000001', 4, 'full_body',
   'Conditioning focus. Keep rest to 60s.');

-- Block sessions (4 weeks × 3 days = 12 rows)
insert into public.block_sessions (id, block_id, block_day_id, week_number)
select
  gen_random_uuid(),
  'dddddddd-0000-0000-0000-000000000001',
  day_id,
  wk
from
  (values
    ('eeeeeeee-0000-0000-0000-000000000001'),
    ('eeeeeeee-0000-0000-0000-000000000002'),
    ('eeeeeeee-0000-0000-0000-000000000003')
  ) as d(day_id),
  generate_series(1, 4) as wk;

-- ── Exercises ─────────────────────────────────────────────────
-- Week 1 Monday Upper Body

with mon_w1 as (
  select bs.id as session_id
  from block_sessions bs
  where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000001'
    and bs.week_number = 1
)
insert into public.exercises
  (id, block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index)
select session_id, category, name, sets, reps, weight_kg, coach_note, order_index
from mon_w1, (values
  (gen_random_uuid(), 'warmup',    'Band Pull-Apart',         3, '15',    null,    null,                              0),
  (gen_random_uuid(), 'warmup',    'Cuban Press',             3, '12',    5.0,     'Light — focus on rotation',       1),
  (gen_random_uuid(), 'main',      'Barbell Bench Press',     5, '5',     70.0,    'Pause 1s at chest each rep',      2),
  (gen_random_uuid(), 'main',      'Barbell Bent-Over Row',   5, '5',     60.0,    'Pull to lower chest, no momentum',3),
  (gen_random_uuid(), 'accessory', 'Dumbbell Overhead Press', 3, '10-12', 20.0,    null,                              4),
  (gen_random_uuid(), 'accessory', 'Cable Face Pull',         3, '15',    null,    'High pulley, elbows up',          5),
  (gen_random_uuid(), 'accessory', 'Dumbbell Curl',           3, '12',    14.0,    null,                              6)
) as e(id, category, name, sets, reps, weight_kg, coach_note, order_index);

-- Week 1 Wednesday Lower Body
with wed_w1 as (
  select bs.id as session_id
  from block_sessions bs
  where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000002'
    and bs.week_number = 1
)
insert into public.exercises
  (id, block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index)
select session_id, category, name, sets, reps, weight_kg, coach_note, order_index
from wed_w1, (values
  (gen_random_uuid(), 'warmup',    'Goblet Squat',            3, '10',    16.0,    'Deep as possible, knees out',     0),
  (gen_random_uuid(), 'warmup',    'Hip Hinge',               2, '10',    null,    'Bodyweight — feel the stretch',   1),
  (gen_random_uuid(), 'main',      'Barbell Back Squat',      5, '5',     90.0,    'Below parallel. Spot available.', 2),
  (gen_random_uuid(), 'main',      'Romanian Deadlift',       4, '8',     80.0,    'Soft knee, hinge deep',           3),
  (gen_random_uuid(), 'accessory', 'Leg Press',               3, '12',    120.0,   null,                              4),
  (gen_random_uuid(), 'accessory', 'Leg Curl',                3, '12',    null,    null,                              5),
  (gen_random_uuid(), 'accessory', 'Calf Raise',              4, '15',    null,    'Pause at top',                    6)
) as e(id, category, name, sets, reps, weight_kg, coach_note, order_index);

-- Week 1 Friday Full Body
with fri_w1 as (
  select bs.id as session_id
  from block_sessions bs
  where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000003'
    and bs.week_number = 1
)
insert into public.exercises
  (id, block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index)
select session_id, category, name, sets, reps, weight_kg, coach_note, order_index
from fri_w1, (values
  (gen_random_uuid(), 'warmup',    'Jump Rope',               3, '45s',   null,    null,                              0),
  (gen_random_uuid(), 'main',      'Barbell Deadlift',        4, '5',     100.0,   'Set the back before every pull',  1),
  (gen_random_uuid(), 'main',      'Push-Up',                 4, 'AMRAP', null,    'Full lock-out at top',            2),
  (gen_random_uuid(), 'accessory', 'Kettlebell Swing',        4, '15',    24.0,    'Hip drive, not a squat',          3),
  (gen_random_uuid(), 'accessory', 'Dumbbell Lunge',          3, '10',    16.0,    'Alternating',                     4)
) as e(id, category, name, sets, reps, weight_kg, coach_note, order_index);

-- Weeks 2-4: copy week 1 exercises with progressive weight increases

-- Upper: +2.5kg/week on Bench & Row
do $$
declare
  v_week int;
  v_session_id uuid;
  v_src_session_id uuid;
begin
  for v_week in 2..4 loop
    select bs.id into v_session_id
    from block_sessions bs
    where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000001'
      and bs.week_number = v_week;

    select bs.id into v_src_session_id
    from block_sessions bs
    where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000001'
      and bs.week_number = 1;

    insert into public.exercises
      (block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index)
    select
      v_session_id,
      category,
      name,
      sets,
      reps,
      case
        when name in ('Barbell Bench Press', 'Barbell Bent-Over Row')
          then weight_kg + 2.5 * (v_week - 1)
        else weight_kg
      end,
      coach_note,
      order_index
    from public.exercises
    where block_session_id = v_src_session_id;
  end loop;
end $$;

-- Lower: +5kg/week on Squat, +2.5kg on RDL
do $$
declare
  v_week int;
  v_session_id uuid;
  v_src_session_id uuid;
begin
  for v_week in 2..4 loop
    select bs.id into v_session_id
    from block_sessions bs
    where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000002'
      and bs.week_number = v_week;

    select bs.id into v_src_session_id
    from block_sessions bs
    where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000002'
      and bs.week_number = 1;

    insert into public.exercises
      (block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index)
    select
      v_session_id,
      category,
      name,
      sets,
      reps,
      case
        when name = 'Barbell Back Squat' then weight_kg + 5.0 * (v_week - 1)
        when name = 'Romanian Deadlift'  then weight_kg + 2.5 * (v_week - 1)
        else weight_kg
      end,
      coach_note,
      order_index
    from public.exercises
    where block_session_id = v_src_session_id;
  end loop;
end $$;

-- Full body: +5kg/week on Deadlift
do $$
declare
  v_week int;
  v_session_id uuid;
  v_src_session_id uuid;
begin
  for v_week in 2..4 loop
    select bs.id into v_session_id
    from block_sessions bs
    where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000003'
      and bs.week_number = v_week;

    select bs.id into v_src_session_id
    from block_sessions bs
    where bs.block_day_id = 'eeeeeeee-0000-0000-0000-000000000003'
      and bs.week_number = 1;

    insert into public.exercises
      (block_session_id, category, name, sets, reps, weight_kg, coach_note, order_index)
    select
      v_session_id,
      category,
      name,
      sets,
      reps,
      case
        when name = 'Barbell Deadlift' then weight_kg + 5.0 * (v_week - 1)
        else weight_kg
      end,
      coach_note,
      order_index
    from public.exercises
    where block_session_id = v_src_session_id;
  end loop;
end $$;

-- ============================================================
-- Session slots
-- Upcoming: next Mon/Wed/Fri at 09:00 (week 2 of the block)
-- Past: last Mon/Wed at 09:00 (week 1 of the block)
-- ============================================================

-- Helper: next occurrence of a day-of-week (0=Mon..6=Sun) at 09:00
-- date_trunc('week', now()) gives Monday 00:00 of the current week

do $$
declare
  -- Upcoming slot IDs
  v_next_mon_id  uuid := 'ffffffff-0000-0000-0000-000000000001';
  v_next_wed_id  uuid := 'ffffffff-0000-0000-0000-000000000002';
  v_next_fri_id  uuid := 'ffffffff-0000-0000-0000-000000000003';

  -- Past slot IDs
  v_last_mon_id  uuid := 'ffffffff-0000-0000-0000-000000000004';
  v_last_wed_id  uuid := 'ffffffff-0000-0000-0000-000000000005';

  -- Timestamps
  v_next_mon     timestamptz;
  v_next_wed     timestamptz;
  v_next_fri     timestamptz;
  v_last_mon     timestamptz;
  v_last_wed     timestamptz;

  -- Block session IDs
  v_bs_mon_w2    uuid;
  v_bs_wed_w2    uuid;
  v_bs_fri_w2    uuid;
  v_bs_mon_w1    uuid;
  v_bs_wed_w1    uuid;

begin
  -- Next Mon: if today is Mon after 09:00, use next week
  v_next_mon := date_trunc('week', now() + interval '7 days') + interval '9 hours';
  v_next_wed := v_next_mon + interval '2 days';
  v_next_fri := v_next_mon + interval '4 days';
  v_last_mon := date_trunc('week', now()) - interval '7 days' + interval '9 hours';
  v_last_wed := v_last_mon + interval '2 days';

  -- Look up block session IDs
  select id into v_bs_mon_w2 from block_sessions
    where block_day_id = 'eeeeeeee-0000-0000-0000-000000000001' and week_number = 2;
  select id into v_bs_wed_w2 from block_sessions
    where block_day_id = 'eeeeeeee-0000-0000-0000-000000000002' and week_number = 2;
  select id into v_bs_fri_w2 from block_sessions
    where block_day_id = 'eeeeeeee-0000-0000-0000-000000000003' and week_number = 2;
  select id into v_bs_mon_w1 from block_sessions
    where block_day_id = 'eeeeeeee-0000-0000-0000-000000000001' and week_number = 1;
  select id into v_bs_wed_w1 from block_sessions
    where block_day_id = 'eeeeeeee-0000-0000-0000-000000000002' and week_number = 1;

  -- Clean prior slots
  delete from session_slots where id in (
    v_next_mon_id, v_next_wed_id, v_next_fri_id, v_last_mon_id, v_last_wed_id
  );

  -- Upcoming SGPT slots (week 2)
  insert into session_slots (id, gym_id, block_session_id, session_type, starts_at, duration_minutes, capacity)
  values
    (v_next_mon_id, 'aaaaaaaa-0000-0000-0000-000000000001', v_bs_mon_w2, 'sgpt', v_next_mon, 60, 12),
    (v_next_wed_id, 'aaaaaaaa-0000-0000-0000-000000000001', v_bs_wed_w2, 'sgpt', v_next_wed, 60, 12),
    (v_next_fri_id, 'aaaaaaaa-0000-0000-0000-000000000001', v_bs_fri_w2, 'sgpt', v_next_fri, 60, 12);

  -- Past SGPT slots (week 1)
  insert into session_slots (id, gym_id, block_session_id, session_type, starts_at, duration_minutes, capacity)
  values
    (v_last_mon_id, 'aaaaaaaa-0000-0000-0000-000000000001', v_bs_mon_w1, 'sgpt', v_last_mon, 60, 12),
    (v_last_wed_id, 'aaaaaaaa-0000-0000-0000-000000000001', v_bs_wed_w1, 'sgpt', v_last_wed, 60, 12);

  -- Assign Sarah to all slots
  insert into session_slot_coaches (session_slot_id, coach_id) values
    (v_next_mon_id, 'bbbbbbbb-0000-0000-0000-000000000002'),
    (v_next_wed_id, 'bbbbbbbb-0000-0000-0000-000000000002'),
    (v_next_fri_id, 'bbbbbbbb-0000-0000-0000-000000000002'),
    (v_last_mon_id, 'bbbbbbbb-0000-0000-0000-000000000002'),
    (v_last_wed_id, 'bbbbbbbb-0000-0000-0000-000000000002');

  -- ── Bookings ───────────────────────────────────────────────

  -- Alice and Bob booked into next Monday
  insert into workout_logs (session_slot_id, client_id, status, started_at, completed_at)
  values
    (v_next_mon_id, 'cccccccc-0000-0000-0000-000000000001', 'booked', null, null),
    (v_next_mon_id, 'cccccccc-0000-0000-0000-000000000002', 'booked', null, null);

  -- Charlie booked into next Wednesday
  insert into workout_logs (session_slot_id, client_id, status, started_at, completed_at)
  values
    (v_next_wed_id, 'cccccccc-0000-0000-0000-000000000003', 'booked', null, null);

  -- ── Past completed sessions for Alice ─────────────────────
  -- Gives the home screen "Last Session" card something to show

  -- Last Monday (Upper) — completed by Alice
  with new_log as (
    insert into workout_logs
      (id, session_slot_id, client_id, status, started_at, completed_at)
    values
      ('11111111-0000-0000-0000-000000000001',
       v_last_mon_id, 'cccccccc-0000-0000-0000-000000000001',
       'completed',
       v_last_mon,
       v_last_mon + interval '55 minutes')
    returning id
  ),
  -- Grab the exercises for that session
  exercises_ordered as (
    select e.id as exercise_id, e.sets, e.weight_kg, e.reps
    from exercises e
    join block_sessions bs on bs.id = e.block_session_id
    where bs.id = v_bs_mon_w1
      and e.category in ('main', 'accessory')
    order by e.order_index
  )
  insert into set_logs
    (workout_log_id, exercise_id, set_number, weight_kg, reps_completed, is_pb)
  select
    '11111111-0000-0000-0000-000000000001',
    eo.exercise_id,
    s.set_number,
    eo.weight_kg,
    -- parse first number from reps string
    case when eo.reps ~ '^\d+' then (regexp_match(eo.reps, '^\d+'))[1]::int else 5 end,
    false
  from exercises_ordered eo
  cross join generate_series(1, eo.sets) as s(set_number);

  -- Last Wednesday (Lower) — completed by Alice
  with new_log as (
    insert into workout_logs
      (id, session_slot_id, client_id, status, started_at, completed_at)
    values
      ('11111111-0000-0000-0000-000000000002',
       v_last_wed_id, 'cccccccc-0000-0000-0000-000000000001',
       'completed',
       v_last_wed,
       v_last_wed + interval '58 minutes')
    returning id
  ),
  exercises_ordered as (
    select e.id as exercise_id, e.sets, e.weight_kg, e.reps
    from exercises e
    join block_sessions bs on bs.id = e.block_session_id
    where bs.id = v_bs_wed_w1
      and e.category in ('main', 'accessory')
    order by e.order_index
  )
  insert into set_logs
    (workout_log_id, exercise_id, set_number, weight_kg, reps_completed, is_pb)
  select
    '11111111-0000-0000-0000-000000000002',
    eo.exercise_id,
    s.set_number,
    eo.weight_kg,
    case when eo.reps ~ '^\d+' then (regexp_match(eo.reps, '^\d+'))[1]::int else 5 end,
    false
  from exercises_ordered eo
  cross join generate_series(1, eo.sets) as s(set_number);

  -- Force a PB on Alice's last Squat set (so the PB badge appears on home screen)
  update set_logs
  set weight_kg = 95.0, is_pb = true
  where workout_log_id = '11111111-0000-0000-0000-000000000002'
    and exercise_id = (
      select e.id from exercises e
      join block_sessions bs on bs.id = e.block_session_id
      where bs.id = v_bs_wed_w1
        and e.name = 'Barbell Back Squat'
      limit 1
    )
    and set_number = 5;

end $$;

-- ============================================================
-- Done. Summary:
--   Gym:     CTPT Canterbury
--   Accounts (all password: Chalc2024!):
--     owner@ctpt.test   → /owner
--     sarah@ctpt.test   → /coach  (schedule, blocks builder)
--     mike@ctpt.test    → /coach
--     alice@ctpt.test   → /client (has history + upcoming booking)
--     bob@ctpt.test     → /client (upcoming booking, no history)
--     charlie@ctpt.test → /client (upcoming booking, no history)
--   Block:   "Block A" — 4 weeks, Mon Upper / Wed Lower / Fri Full Body
--   Slots:   Next Mon/Wed/Fri (week 2) + last Mon/Wed (week 1, completed)
-- ============================================================
