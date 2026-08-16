import type { AreaId, SplitType } from '../data/types'

/*
 * The starting movement library.
 *
 * The app originally shipped with an empty library that filled from whatever
 * got logged. In practice that meant typing the name of every movement before
 * it could be tapped, which is the opposite of a library and the single
 * biggest reason the app went unused.
 *
 * Areas are pre-assigned here so the muscle picker is never seen in normal
 * use, while the by-area staleness rollup keeps working. Only a movement the
 * user invents themselves is ever asked about, and even then it's optional.
 *
 * This is a starting point, not a canon. Anything unused sinks to the bottom
 * of the staleness list on its own, and anything can be deleted.
 */

export type SeedMovement = {
  name: string
  splits: SplitType[]
  areas: AreaId[]
  /** Position in this file. Assigned on seeding; see movementsToSeed. */
  order?: number
}

export const SEED_LIBRARY: SeedMovement[] = [
  // ---- Push ---------------------------------------------------------------
  { name: 'Flat Barbell Bench Press', splits: ['push'], areas: ['chest', 'triceps', 'front_delts'] },
  { name: 'Incline Dumbbell Press', splits: ['push'], areas: ['chest', 'front_delts'] },
  { name: 'Flat Dumbbell Press', splits: ['push'], areas: ['chest', 'triceps'] },
  { name: 'Machine Chest Press', splits: ['push'], areas: ['chest', 'triceps'] },
  { name: 'Cable Fly', splits: ['push'], areas: ['chest'] },
  { name: 'Pec Deck', splits: ['push'], areas: ['chest'] },
  { name: 'Dips', splits: ['push'], areas: ['chest', 'triceps'] },
  { name: 'Overhead Press', splits: ['push'], areas: ['front_delts', 'triceps'] },
  { name: 'Seated Dumbbell Shoulder Press', splits: ['push'], areas: ['front_delts', 'triceps'] },
  { name: 'Lateral Raise', splits: ['push'], areas: ['side_delts'] },
  { name: 'Cable Lateral Raise', splits: ['push'], areas: ['side_delts'] },
  { name: 'Front Raise', splits: ['push'], areas: ['front_delts'] },
  { name: 'Tricep Pushdown', splits: ['push'], areas: ['triceps'] },
  { name: 'Overhead Tricep Extension', splits: ['push'], areas: ['triceps'] },
  { name: 'Skull Crushers', splits: ['push'], areas: ['triceps'] },
  { name: 'Close Grip Bench Press', splits: ['push'], areas: ['triceps', 'chest'] },

  // ---- Pull ---------------------------------------------------------------
  { name: 'Pull Up', splits: ['pull'], areas: ['lats', 'biceps'] },
  { name: 'Lat Pulldown', splits: ['pull'], areas: ['lats', 'biceps'] },
  { name: 'Straight Arm Pulldown', splits: ['pull'], areas: ['lats'] },
  { name: 'Seated Cable Row', splits: ['pull'], areas: ['upper_back', 'lats'] },
  { name: 'Chest Supported Row', splits: ['pull'], areas: ['upper_back', 'rear_delts'] },
  { name: 'Barbell Row', splits: ['pull'], areas: ['upper_back', 'lats'] },
  { name: 'Single Arm Dumbbell Row', splits: ['pull'], areas: ['lats', 'upper_back'] },
  { name: 'Face Pull', splits: ['pull'], areas: ['rear_delts', 'upper_back'] },
  { name: 'Rear Delt Fly', splits: ['pull'], areas: ['rear_delts'] },
  { name: 'Shrugs', splits: ['pull'], areas: ['upper_back'] },
  { name: 'Barbell Curl', splits: ['pull'], areas: ['biceps'] },
  { name: 'Dumbbell Curl', splits: ['pull'], areas: ['biceps'] },
  { name: 'Hammer Curl', splits: ['pull'], areas: ['biceps', 'forearms'] },
  { name: 'Preacher Curl', splits: ['pull'], areas: ['biceps'] },
  { name: 'Cable Curl', splits: ['pull'], areas: ['biceps'] },
  { name: 'Farmer Carries', splits: ['pull', 'legs'], areas: ['forearms', 'upper_back', 'core'] },

  // ---- Legs ---------------------------------------------------------------
  { name: 'Back Squat', splits: ['legs'], areas: ['quads', 'glutes'] },
  { name: 'Leg Press', splits: ['legs'], areas: ['quads', 'glutes'] },
  { name: 'Hack Squat', splits: ['legs'], areas: ['quads'] },
  { name: 'Bulgarian Split Squat', splits: ['legs'], areas: ['quads', 'glutes'] },
  { name: 'Walking Lunges', splits: ['legs'], areas: ['quads', 'glutes'] },
  { name: 'Romanian Deadlift', splits: ['legs'], areas: ['hamstrings', 'glutes', 'lower_back'] },
  { name: 'Leg Curl', splits: ['legs'], areas: ['hamstrings'] },
  { name: 'Leg Extension', splits: ['legs'], areas: ['quads'] },
  { name: 'Hip Thrust', splits: ['legs'], areas: ['glutes'] },
  { name: 'Standing Calf Raise', splits: ['legs'], areas: ['calves'] },
  { name: 'Seated Calf Raise', splits: ['legs'], areas: ['calves'] },
  { name: 'Hip Adduction', splits: ['legs'], areas: ['hips'] },
  { name: 'Hip Abduction', splits: ['legs'], areas: ['hips', 'glutes'] },

  // ---- Core (available on every split day) --------------------------------
  { name: 'Cable Crunch', splits: ['push', 'pull', 'legs'], areas: ['core'] },
  { name: 'Hanging Leg Raise', splits: ['push', 'pull', 'legs'], areas: ['core'] },
  { name: 'Plank', splits: ['push', 'pull', 'legs'], areas: ['core'] },
  { name: 'Pallof Press', splits: ['push', 'pull', 'legs'], areas: ['obliques', 'core'] },
  { name: 'Russian Twist', splits: ['push', 'pull', 'legs'], areas: ['obliques', 'core'] },
  { name: 'Ab Wheel', splits: ['push', 'pull', 'legs'], areas: ['core'] },
]

/**
 * Bumped when the seed list changes materially. Stored on Settings so the
 * library can be topped up later without re-adding what the user deleted.
 */
export const SEED_VERSION = 1

/**
 * Which seed movements are missing from an existing library.
 *
 * Matched on name, case-insensitively, so someone who already logged "cable
 * fly" by hand doesn't end up with a duplicate "Cable Fly" beside it. Pure and
 * idempotent: running it against a seeded library returns nothing.
 */
export function movementsToSeed(
  existing: { name: string }[],
  seed: SeedMovement[] = SEED_LIBRARY,
): SeedMovement[] {
  const taken = new Set(existing.map((m) => m.name.trim().toLowerCase()))
  return (
    seed
      // Index before filtering, so order reflects position in this file rather
      // than position in whatever subset happens to be missing. That ordering
      // is what makes a push day open on bench press instead of Ab Wheel.
      .map((s, order) => ({ ...s, order }))
      .filter((s) => !taken.has(s.name.trim().toLowerCase()))
  )
}
