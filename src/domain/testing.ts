import type { AreaId, Movement, Session, SplitType } from '../data/types'

/** Fixture builders, so tests read as scenarios rather than object literals. */

export function movement(
  id: string,
  name: string,
  areas: AreaId[] = [],
  splits: SplitType[] = [],
): Movement {
  return {
    id,
    name,
    areas,
    splits,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

export function session(
  date: string,
  done: string[],
  options: { planned?: string[]; splitType?: SplitType; status?: Session['status'] } = {},
): Session {
  return {
    id: `ses_${date}_${done.join('-') || 'empty'}`,
    date,
    status: options.status ?? 'logged',
    splitType: options.splitType ?? null,
    flow: [],
    movements: [
      ...done.map((movementId) => ({ movementId, planned: false, done: true })),
      ...(options.planned ?? []).map((movementId) => ({ movementId, planned: true, done: false })),
    ],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  }
}
