import type { FlowKind, Movement, Session, SplitType } from '../data/types'
import { buildFlow, DEFAULT_VISIT_TEMPLATE } from './flow'
import { today as todayISO } from './dates'

export const SPLITS: { value: SplitType; label: string; blurb: string; color: string }[] = [
  { value: 'push', label: 'Push', blurb: 'Chest, shoulders, triceps', color: 'var(--split-push)' },
  { value: 'pull', label: 'Pull', blurb: 'Back, rear delts, biceps', color: 'var(--split-pull)' },
  { value: 'legs', label: 'Legs', blurb: 'Quads, hamstrings, glutes', color: 'var(--split-legs)' },
  { value: 'other', label: 'Other', blurb: 'Recovery day, cardio, anything else', color: 'var(--split-other)' },
]

export function splitLabel(split: SplitType | null): string {
  if (!split) return 'Session'
  return SPLITS.find((s) => s.value === split)?.label ?? 'Session'
}

export function splitColor(split: SplitType | null): string {
  if (!split) return 'var(--split-other)'
  return SPLITS.find((s) => s.value === split)?.color ?? 'var(--split-other)'
}

export function sessionTitle(session: Session): string {
  if (!session.splitType) return 'Session'
  if (session.splitType === 'other') return 'Session'
  return `${splitLabel(session.splitType)} day`
}

let counter = 0

/**
 * IDs only need to be unique within one device's database, and crypto.randomUUID
 * is unavailable on insecure origins, so fall back rather than crash there.
 */
export function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

export function createSession(options: {
  date?: string
  splitType?: SplitType | null
  template?: { kind: FlowKind; label: string }[]
  status?: Session['status']
}): Session {
  const now = new Date().toISOString()
  return {
    id: newId('ses'),
    date: options.date ?? todayISO(),
    status: options.status ?? 'planned',
    splitType: options.splitType ?? null,
    flow: buildFlow(options.template ?? DEFAULT_VISIT_TEMPLATE),
    movements: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function touch(session: Session): Session {
  return { ...session, updatedAt: new Date().toISOString() }
}

export function createMovement(options: {
  name: string
  splits?: SplitType[]
  areas?: Movement['areas']
}): Movement {
  const now = new Date().toISOString()
  return {
    id: newId('mov'),
    name: options.name.trim(),
    splits: options.splits ?? [],
    areas: options.areas ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * A session counts as started once anything at all has been ticked. Used to
 * decide whether Today offers "start" or resumes what is already underway.
 */
export function hasProgress(session: Session): boolean {
  return session.flow.some((s) => s.done) || session.movements.some((m) => m.done)
}

export function doneMovementIds(session: Session): string[] {
  return session.movements.filter((m) => m.done).map((m) => m.movementId)
}

/**
 * Marks a session as the record of what happened.
 *
 * Movements that were planned but not ticked are dropped entirely rather than
 * retained as misses — there is no such thing as a missed movement here.
 */
export function markLogged(session: Session): Session {
  return touch({
    ...session,
    status: 'logged',
    movements: session.movements.filter((m) => m.done),
  })
}

export function summarise(session: Session, movements: Map<string, Movement>): string {
  const done = session.movements.filter((m) => m.done)
  const names = done
    .map((m) => movements.get(m.movementId)?.name)
    .filter((n): n is string => Boolean(n))

  if (names.length === 0) {
    const steps = session.flow.filter((s) => s.done).length
    return steps > 0 ? `${steps} ${steps === 1 ? 'thing' : 'things'} logged` : 'Nothing logged yet'
  }
  if (names.length <= 3) return names.join(' · ')
  return `${names.slice(0, 3).join(' · ')} +${names.length - 3}`
}

/** Newest first. Sessions on the same day fall back to creation order. */
export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}
