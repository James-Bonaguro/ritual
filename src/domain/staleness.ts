import type { AreaId, Movement, Session, SplitType } from '../data/types'
import { AREAS, type Area } from './areas'
import { daysBetween, today as todayISO } from './dates'

/*
 * The reason this app exists: telling you what you have not touched in a while.
 *
 * Everything here keys off `done`, never off session status. A movement ticked
 * off mid-session has happened, even though that session is still open; a
 * movement sitting in a future plan has not.
 */

export type StaleLevel = 'fresh' | 'due' | 'stale' | 'never'

export type MovementStaleness = {
  movement: Movement
  lastPerformed: string | null
  daysSince: number | null
  level: StaleLevel
  /** How many times in the trailing 30 days, for the frequency read-out. */
  recentCount: number
}

export type AreaStaleness = {
  area: Area
  lastWorked: string | null
  daysSince: number | null
  level: StaleLevel
  /** Movements in the library that hit this area. Zero is itself a signal. */
  movementCount: number
}

const RECENT_WINDOW_DAYS = 30

/*
 * Thresholds are tuned for a push/pull/legs rotation: each split comes round
 * roughly twice a week, so anything past a fortnight has genuinely slipped
 * rather than just being between turns.
 */
export function staleLevel(daysSince: number | null): StaleLevel {
  if (daysSince === null) return 'never'
  if (daysSince >= 14) return 'stale'
  if (daysSince >= 7) return 'due'
  return 'fresh'
}

/** Latest date each movement was actually done, plus a trailing-30-day count. */
function performanceIndex(sessions: Session[], reference: string) {
  const lastByMovement = new Map<string, string>()
  const countByMovement = new Map<string, number>()

  for (const session of sessions) {
    // Guard against a plan dated in the future being counted as history.
    if (daysBetween(session.date, reference) < 0) continue

    for (const log of session.movements) {
      if (!log.done) continue

      const previous = lastByMovement.get(log.movementId)
      if (!previous || session.date > previous) lastByMovement.set(log.movementId, session.date)

      if (daysBetween(session.date, reference) <= RECENT_WINDOW_DAYS) {
        countByMovement.set(log.movementId, (countByMovement.get(log.movementId) ?? 0) + 1)
      }
    }
  }

  return { lastByMovement, countByMovement }
}

/** Stalest first: never-done, then longest-since. */
function byStalest<T extends { daysSince: number | null }>(a: T, b: T): number {
  if (a.daysSince === null && b.daysSince === null) return 0
  if (a.daysSince === null) return -1
  if (b.daysSince === null) return 1
  return b.daysSince - a.daysSince
}

export function movementStaleness(
  movements: Movement[],
  sessions: Session[],
  reference: string = todayISO(),
): MovementStaleness[] {
  const { lastByMovement, countByMovement } = performanceIndex(sessions, reference)

  return movements
    .filter((m) => !m.archived)
    .map((movement) => {
      const lastPerformed = lastByMovement.get(movement.id) ?? null
      const daysSince = lastPerformed === null ? null : daysBetween(lastPerformed, reference)
      return {
        movement,
        lastPerformed,
        daysSince,
        level: staleLevel(daysSince),
        recentCount: countByMovement.get(movement.id) ?? 0,
      }
    })
    .sort(
      (a, b) =>
        byStalest(a, b) ||
        // Day one has no history at all, so this is what decides the order the
        // library reads in: the curated seed sequence, compounds first and core
        // last. Movements the user invented have no order and sort after.
        (a.movement.order ?? Number.MAX_SAFE_INTEGER) -
          (b.movement.order ?? Number.MAX_SAFE_INTEGER) ||
        a.movement.name.localeCompare(b.movement.name),
    )
}

/**
 * Rolls movement history up to body areas. This is what catches the case the
 * per-movement view cannot: every exercise you have picked lately happening to
 * hit the same three muscles.
 */
export function areaStaleness(
  movements: Movement[],
  sessions: Session[],
  reference: string = todayISO(),
): AreaStaleness[] {
  const { lastByMovement } = performanceIndex(sessions, reference)

  const lastByArea = new Map<AreaId, string>()
  const countByArea = new Map<AreaId, number>()

  for (const movement of movements) {
    if (movement.archived) continue
    const last = lastByMovement.get(movement.id)

    for (const areaId of movement.areas) {
      countByArea.set(areaId, (countByArea.get(areaId) ?? 0) + 1)
      if (!last) continue
      const previous = lastByArea.get(areaId)
      if (!previous || last > previous) lastByArea.set(areaId, last)
    }
  }

  return AREAS.map((area) => {
    const lastWorked = lastByArea.get(area.id) ?? null
    const daysSince = lastWorked === null ? null : daysBetween(lastWorked, reference)
    return {
      area,
      lastWorked,
      daysSince,
      level: staleLevel(daysSince),
      movementCount: countByArea.get(area.id) ?? 0,
    }
  }).sort((a, b) => {
    // An area nothing in the library covers is a different problem from one
    // that has gone cold, and it would otherwise monopolise the top of the
    // list forever. Sorted last, below everything actually trainable.
    if ((a.movementCount === 0) !== (b.movementCount === 0)) {
      return a.movementCount === 0 ? 1 : -1
    }
    return byStalest(a, b)
  })
}

export function forSplit<T extends { movement: Movement }>(items: T[], split: SplitType): T[] {
  // A movement with no split recorded yet is shown everywhere rather than
  // hidden, so a newly created one can't silently vanish from every list.
  return items.filter((i) => i.movement.splits.length === 0 || i.movement.splits.includes(split))
}

export function areasForSplitStaleness(items: AreaStaleness[], split: SplitType): AreaStaleness[] {
  return items.filter((i) => i.area.splits.includes(split))
}

/** CSS colour for a staleness level, used by badges and the ramp. */
export function staleColor(level: StaleLevel): string {
  switch (level) {
    case 'never':
      return 'var(--purple)'
    case 'stale':
      return 'var(--orange)'
    case 'due':
      return 'var(--yellow)'
    case 'fresh':
      return 'var(--green)'
  }
}
