/*
 * A realistic twelve weeks of training, used to take screenshots that show the
 * app as it looks in use rather than as an empty shell.
 *
 * Deliberately uneven: a few movements are left cold for weeks and one is
 * never done at all, because a fixture where everything is fresh would hide
 * the only feature that matters.
 */

const DAY = 86_400_000

function iso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const LIBRARY = [
  // name, splits, areas, "days ago it was last skipped from" bias
  ['Incline Dumbbell Press', ['push'], ['chest', 'front_delts']],
  ['Flat Barbell Bench', ['push'], ['chest', 'triceps']],
  ['Cable Fly', ['push'], ['chest']],
  ['Overhead Press', ['push'], ['front_delts', 'triceps']],
  ['Lateral Raise', ['push'], ['side_delts']],
  ['Tricep Pushdown', ['push'], ['triceps']],
  ['Overhead Tricep Extension', ['push'], ['triceps']],

  ['Lat Pulldown', ['pull'], ['lats', 'biceps']],
  ['Seated Cable Row', ['pull'], ['upper_back', 'lats']],
  ['Chest Supported Row', ['pull'], ['upper_back', 'rear_delts']],
  ['Face Pull', ['pull'], ['rear_delts', 'upper_back']],
  ['Barbell Curl', ['pull'], ['biceps']],
  ['Hammer Curl', ['pull'], ['biceps', 'forearms']],
  ['Rear Delt Fly', ['pull'], ['rear_delts']],

  ['Leg Press', ['legs'], ['quads', 'glutes']],
  ['Romanian Deadlift', ['legs'], ['hamstrings', 'glutes', 'lower_back']],
  ['Bulgarian Split Squat', ['legs'], ['quads', 'glutes']],
  ['Leg Extension', ['legs'], ['quads']],
  ['Leg Curl', ['legs'], ['hamstrings']],
  ['Standing Calf Raise', ['legs'], ['calves']],
  ['Hip Adduction', ['legs'], ['hips']],

  ['Cable Crunch', ['push', 'pull', 'legs'], ['core']],
  ['Hanging Leg Raise', ['push', 'pull', 'legs'], ['core']],
  ['Pallof Press', ['push', 'pull', 'legs'], ['obliques', 'core']],
]

/** Movements left out of the rotation, to give the staleness view something real to say. */
const NEGLECTED = new Set(['Face Pull', 'Rear Delt Fly', 'Standing Calf Raise', 'Pallof Press'])
const NEVER = new Set(['Hip Adduction'])

const RECOVERY_BY_DAY = {
  push: ['hot_tub', 'cold_shower'],
  pull: ['steam_room', 'cold_shower'],
  legs: ['sauna', 'cold_pool', 'cold_shower'],
}

const NOTES = {
  'Incline Dumbbell Press': [
    'Left shoulder complained on the way down. Kept it to 4 slow ones a side.',
    'Felt strong today. Went a touch heavier and it moved fine.',
  ],
  'Overhead Press': ['Superset with laterals, then threw in pushdowns. Triple set, felt great.'],
  'Romanian Deadlift': ['Hamstrings still tight from Tuesday. Stayed conservative.'],
  'Lat Pulldown': ['Single arm to failure on the left, it lags behind.'],
  'Leg Press': ['Went one leg at a time to failure. Wrecked.'],
}

const SESSION_NOTES = [
  'Good one. Steam room after was exactly right.',
  'Rushed, only had 45 minutes. Still got the lift in.',
  'Body felt heavy the whole way through. Backed off and used the hot tub longer.',
  'Best I have felt in weeks.',
]

const INTENTS = [
  'Upper chest focus. Been all flat pressing lately.',
  'Rear delts — I keep skipping them. Start there before anything else.',
  'Legs, but keep it light. Knees were noisy on Sunday.',
]

export function buildFixture(reference = new Date()) {
  const now = reference.getTime()

  const movements = LIBRARY.map(([name, splits, areas], i) => ({
    id: `mov_fx_${i}`,
    name,
    splits,
    areas,
    createdAt: new Date(now - 84 * DAY).toISOString(),
    updatedAt: new Date(now - 84 * DAY).toISOString(),
  }))

  const byName = new Map(movements.map((m) => [m.name, m]))
  const rotation = ['push', 'pull', 'legs']
  const sessions = []

  // Twelve weeks back, training every other day.
  let rotationIndex = 0
  for (let daysAgo = 82; daysAgo >= 1; daysAgo -= 2) {
    const split = rotation[rotationIndex % 3]
    rotationIndex += 1

    const date = iso(new Date(now - daysAgo * DAY))

    const candidates = movements.filter(
      (m) => m.splits.includes(split) && !NEVER.has(m.name),
    )

    const picked = candidates.filter((m) => {
      if (NEGLECTED.has(m.name)) {
        // Neglected movements stop appearing entirely a few weeks back, which
        // is what puts them at the top of "going cold".
        return daysAgo > 24
      }
      // A little variety so the frequency sparkline isn't a flat wall.
      return (daysAgo + m.name.length) % 5 !== 0
    })

    const done = picked.slice(0, 6)

    sessions.push({
      id: `ses_fx_${date}`,
      date,
      status: 'logged',
      splitType: split,
      intent: daysAgo % 14 === 0 ? INTENTS[rotationIndex % INTENTS.length] : undefined,
      flow: [
        { kind: 'massage_bed', label: 'Massage bed', minutes: 10 },
        { kind: 'vibration_plate', label: 'Vibration plate', minutes: 5 },
        { kind: 'stretch', label: 'Stretch', minutes: 12 },
        { kind: 'lift', label: 'Lift', minutes: 55 },
        ...RECOVERY_BY_DAY[split].map((kind) => ({
          kind,
          label: kind.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
          minutes: kind === 'cold_shower' ? 3 : 12,
        })),
      ].map((step, i) => ({
        id: `${step.kind}-${i}`,
        kind: step.kind,
        label: step.label,
        done: true,
        minutes: step.minutes,
      })),
      movements: done.map((m) => {
        const pool = NOTES[m.name]
        return {
          movementId: m.id,
          planned: true,
          done: true,
          note: pool && daysAgo % 8 === 0 ? pool[daysAgo % pool.length] : undefined,
        }
      }),
      notes: daysAgo % 10 === 0 ? SESSION_NOTES[rotationIndex % SESSION_NOTES.length] : undefined,
      createdAt: new Date(now - daysAgo * DAY).toISOString(),
      updatedAt: new Date(now - daysAgo * DAY).toISOString(),
    })
  }

  // Tomorrow's plan, written tonight — the Mac-at-the-desk half of the app.
  const planDate = iso(new Date(now + DAY))
  sessions.push({
    id: 'ses_fx_plan',
    date: planDate,
    status: 'planned',
    splitType: 'pull',
    intent: 'Rear delts first while I am fresh — they have gone properly cold. Then rows, then arms if there is time.',
    flow: [
      { kind: 'massage_bed', label: 'Massage bed' },
      { kind: 'vibration_plate', label: 'Vibration plate' },
      { kind: 'stretch', label: 'Stretch' },
      { kind: 'lift', label: 'Lift' },
      { kind: 'hot_tub', label: 'Hot tub' },
      { kind: 'steam_room', label: 'Steam room' },
      { kind: 'sauna', label: 'Sauna' },
      { kind: 'cold_pool', label: 'Cold pool' },
      { kind: 'cold_shower', label: 'Cold shower' },
    ].map((step, i) => ({ id: `${step.kind}-${i}`, kind: step.kind, label: step.label, done: false })),
    movements: ['Rear Delt Fly', 'Face Pull', 'Chest Supported Row', 'Hammer Curl']
      .map((name) => byName.get(name))
      .filter(Boolean)
      .map((m) => ({ movementId: m.id, planned: true, done: false })),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  })

  return {
    version: 1,
    exportedAt: new Date(now).toISOString(),
    movements,
    sessions,
    settings: null,
  }
}
