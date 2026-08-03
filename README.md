# Ritual

A physical wellness journal for the whole gym visit — not a workout logger.

The visit is the unit: massage bed, vibration plate, stretch, lift, then hot tub or steam
room or sauna or cold pool depending on the day, then a cold shower. The lift is one
segment of that, not the point of it.

**The question it exists to answer: what haven't I hit in a while?**

## What it deliberately does not do

- **No sets, reps, weight, volume or PRs.** None of it earns screen space.
- **No supersets or triple sets in the data model.** Every attempt at structure breaks on
  contact with the gym floor. Nuance goes in a free-text note instead.
- **No plan-versus-actual reconciliation.** A session *starts* as an intention and
  *becomes* the record of what happened — one object, no diff, no "you missed 2 exercises".
- **Nothing is pre-seeded.** The movement library starts empty and is filled entirely by
  what you actually log.

## How it works

A **Session** is one gym visit. It carries a split (push / pull / legs), the visit flow as
a checklist, the movements touched, and notes at three levels — session intent, per-step,
and per-movement.

The **staleness engine** (`src/domain/staleness.ts`) ranks two things:

- **Movements** by days since last done, so a lift you have drifted away from surfaces.
- **Areas** by days since *any* movement hitting them was done. This catches what the
  per-movement view cannot: every exercise you picked lately happening to hit the same
  three muscles.

Areas cost one tap, once, when a movement is first created. Never asked again.

## Running it

```bash
npm install
npm run dev      # local dev server
npm test         # domain unit tests
npm run build    # typecheck + production build
npm run shots    # drive the built app and screenshot every screen
npm run icons    # regenerate PNG icons from public/icons/icon.svg
```

`npm run shots` needs a preview server up (`npm run preview`) and writes to `screenshots/`.
It clicks through the real UI, so a screenshot that looks right is also proof the flow works.

## Deploying

Pushes to `main` build, test, and publish to GitHub Pages. This requires **Settings →
Pages → Source: GitHub Actions** to be enabled once on the repository.

The base path is `/workout-prep/` (`vite.config.ts`). Override with `BASE_PATH=/` for
root hosting.

## Storage and sync

IndexedDB on the device is the source of truth, always. The app works fully offline —
gym signal is unreliable and it must never block on a network round trip.

Cross-device sync (`src/data/sync.ts`) reconciles against Supabase with last-write-wins on
`updatedAt`. It is **inert unless `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
at build time**, and has not yet been exercised against a live project. Turning it on:

1. Create a Supabase project and run `supabase/migrations/0001_init.sql`.
   Row-level security is scoped to `auth.uid()`, so the anon key grants nothing on its own.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository variables.
3. Sign in on each device with a magic link.

Until then, Settings → Export / Import moves data between devices as a JSON file.

## Architecture notes

- `src/data/repository.ts` is the only seam between the app and where data lives. Every
  screen works on in-memory arrays; swapping the backend touches one file.
- The whole database is held in memory. A decade of daily visits is a few thousand small
  records, so staleness recomputes synchronously and no screen ever shows a spinner.
- Navigation is in-memory, not URL-based — native apps have no addressable screens, and it
  sidesteps GitHub Pages deep-link 404s.
- `src/styles/tokens.css` holds the iOS type scale and semantic colours. The odd-looking
  numbers there are platform constants (44pt targets, 49pt tab bar, the 0.29 separator
  alpha), not arbitrary.
- Icons in `src/components/ios/Icon.tsx` are originals drawn in the SF Symbols visual
  language. Apple licenses the real SF Symbols for Apple-platform UI only; they cannot be
  redistributed as web assets.
- There are no haptics. iOS Safari does not implement the Vibration API, so press feedback
  is visual.
