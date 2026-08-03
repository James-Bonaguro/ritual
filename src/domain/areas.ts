import type { AreaId, SplitType } from '../data/types'

export type Area = {
  id: AreaId
  label: string
  /** Which split days this area is normally trained on. Drives filtering. */
  splits: SplitType[]
}

/*
 * A fixed taxonomy rather than free-form tags. Free-form would drift — "rear
 * delts" and "rear delt" would become two things and the rollup would quietly
 * stop working, which defeats the whole point of tracking areas.
 */
export const AREAS: Area[] = [
  { id: 'chest', label: 'Chest', splits: ['push'] },
  { id: 'front_delts', label: 'Front delts', splits: ['push'] },
  { id: 'side_delts', label: 'Side delts', splits: ['push'] },
  { id: 'triceps', label: 'Triceps', splits: ['push'] },

  { id: 'lats', label: 'Lats', splits: ['pull'] },
  { id: 'upper_back', label: 'Upper back', splits: ['pull'] },
  { id: 'rear_delts', label: 'Rear delts', splits: ['pull'] },
  { id: 'biceps', label: 'Biceps', splits: ['pull'] },
  { id: 'forearms', label: 'Forearms', splits: ['pull'] },

  { id: 'quads', label: 'Quads', splits: ['legs'] },
  { id: 'hamstrings', label: 'Hamstrings', splits: ['legs'] },
  { id: 'glutes', label: 'Glutes', splits: ['legs'] },
  { id: 'calves', label: 'Calves', splits: ['legs'] },
  { id: 'hips', label: 'Hips & adductors', splits: ['legs'] },

  // Core is trained on every split day, so it belongs to all of them.
  { id: 'core', label: 'Core', splits: ['push', 'pull', 'legs', 'other'] },
  { id: 'obliques', label: 'Obliques', splits: ['push', 'pull', 'legs', 'other'] },
  { id: 'lower_back', label: 'Lower back', splits: ['pull', 'legs', 'other'] },

  { id: 'neck', label: 'Neck', splits: ['other'] },
]

const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]))

export function getArea(id: AreaId): Area | undefined {
  return AREA_BY_ID.get(id)
}

export function areaLabel(id: AreaId): string {
  return AREA_BY_ID.get(id)?.label ?? id
}

export function areasForSplit(split: SplitType): Area[] {
  return AREAS.filter((a) => a.splits.includes(split))
}

/** Groups the taxonomy for the picker, so it isn't one 18-item wall. */
export const AREA_GROUPS: { label: string; areas: AreaId[] }[] = [
  { label: 'Push', areas: ['chest', 'front_delts', 'side_delts', 'triceps'] },
  { label: 'Pull', areas: ['lats', 'upper_back', 'rear_delts', 'biceps', 'forearms'] },
  { label: 'Legs', areas: ['quads', 'hamstrings', 'glutes', 'calves', 'hips'] },
  { label: 'Core & other', areas: ['core', 'obliques', 'lower_back', 'neck'] },
]
