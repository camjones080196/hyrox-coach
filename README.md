# Hyrox Coach

A phone-first training app for an adaptive HYROX athlete and his coach. It builds a
plan up to race day from the athlete's division, level and availability, and every
session can be edited: swap exercises, change the workout type, sets, reps, weight,
distance or time, move days, and make weeks easier or harder. Workouts are logged
set by set, and the Progress tab tracks race loads, station volume, run pace and effort.

Two people can share one plan. With sync turned on, an edit on one phone shows up on
the other straight away.

> This is a training aid, not medical advice. Check the plan with a physio or doctor.

## Use it

Several athletes can share one plan (e.g. an adaptive athlete and a training partner): everyone gets the same sessions, with weights, distances and exercise versions set for their own division and level, and their own logs and progress. Switch athlete at the top of the screen.

- **Live app:** https://camjones080196.github.io/hyrox-coach/ (after setup below)
- On iPhone: open it in Safari, tap Share, then **Add to Home Screen**.
- On Android: open it in Chrome, tap ⋮, then **Install app**.

## One-time setup

### 1. Turn on hosting (GitHub Pages)

Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Every push to `main` then tests, builds and publishes the app.

### 2. Turn on sync (Supabase, free)

1. Create a free project at https://supabase.com.
2. In the project, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. Optional but easier: **Authentication → Sign In / Providers → Email**, turn off
   **Confirm email** so new accounts work straight away.
4. **Authentication → URL Configuration**: set Site URL to
   `https://camjones080196.github.io/hyrox-coach/`.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
6. In GitHub: repo **Settings → Secrets and variables → Actions → Variables**, add
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` with those values, then re-run the
   "Deploy to GitHub Pages" workflow. (The anon key is meant to be public; the database
   only lets team members read or write their own team's data.)

Then on each phone: create an account, one person taps **Create team**, and the other
enters the 6-character join code shown in Settings.

Without these keys the app still works, but data stays on that one phone. You can also
paste the URL and key into **Settings → Sync** instead of step 6.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # plan generator tests
npm run build
```

- `src/domain`: race standards, exercise library and the plan generator.
- `src/data`: storage (local or Supabase) and the synced in-memory store.
- `src/ui`: screens.

Race standards come from the HYROX Adaptive Rulebook (2024). Check for updates
before race day, and confirm the athlete's division once he is classified.
