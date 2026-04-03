# Chalc — Local Setup Guide

## Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- Vercel account (optional, for deployment)

---

## 1. Clone & install

```bash
git clone <repo-url>
cd Gym-app
npm install
```

---

## 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a strong database password and note it down.
3. Wait for the project to provision (~1 min).

---

## 3. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Find both values in your Supabase dashboard under **Project Settings → API**.

---

## 4. Run the database migration

In the Supabase dashboard, open the **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, enums, RLS policies, triggers, and helper functions.

> **Tip:** Copy the entire file and paste it as a single SQL query. It is idempotent — safe to run again if something goes wrong.

---

## 5. Seed test data

Still in the SQL Editor, run the contents of:

```
supabase/seed.sql
```

This creates a full test dataset:

| Email | Password | Role |
|---|---|---|
| owner@ctpt.test | Chalc2024! | Owner |
| sarah@ctpt.test | Chalc2024! | Coach |
| mike@ctpt.test | Chalc2024! | Coach |
| alice@ctpt.test | Chalc2024! | Client (has history + upcoming booking) |
| bob@ctpt.test | Chalc2024! | Client (upcoming booking, no history) |
| charlie@ctpt.test | Chalc2024! | Client (upcoming booking, no history) |

The seed also creates:
- **Block A** — 4-week programme, Mon Upper / Wed Lower / Fri Full Body with progressive overload
- **Session slots** — upcoming next Mon/Wed/Fri + completed last Mon/Wed
- **Completed workout logs** for Alice with a forced PB on Barbell Back Squat

---

## 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll be redirected to `/login`. Sign in with any of the seed accounts above.

---

## What each role can see

| Role | After login | Key screens |
|---|---|---|
| **Owner** | `/owner` | Member list, block counts, same nav as coach |
| **Coach** | `/coach/schedule` | Schedule (create/edit slots, manage bookings), Blocks builder |
| **Client** | `/client` | Home (next session, weekly progress, last session), workout logger |

### Testing the workout logger

1. Sign in as `alice@ctpt.test`
2. Go to **Home** — you'll see the upcoming Monday slot
3. Tap **Start Workout** to open the logger
4. Log sets, tap ✓ to save each set, tap ★ again to unsave for editing
5. Tap **End** to complete the session

---

## Deployment (Vercel)

```bash
vercel
```

Add the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables in the Vercel project settings.

Make sure your Supabase project has the following **Auth settings**:
- **Site URL**: your Vercel deployment URL
- **Redirect URLs**: `https://<your-domain>/auth/callback`

---

## Project structure

```
app/
  (dashboard)/
    (client-shell)/client/   ← Client home + sessions (with bottom nav)
    client/log/[id]/          ← Workout logger (full-screen, no nav)
    coach/                    ← Coach schedule + blocks builder
    owner/                    ← Owner dashboard + members
  login/                      ← Auth page
components/
  bottom-nav.tsx
lib/
  supabase/                   ← Server + browser clients
  types/database.ts           ← Full typed DB schema
supabase/
  migrations/001_initial_schema.sql
  seed.sql
```
