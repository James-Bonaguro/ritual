import type { FlowKind, FlowStep } from '../data/types'
import type { IconName } from '../components/ios/Icon'

export type FlowMeta = {
  label: string
  icon: IconName
  tint: string
  /** Rough phase of the visit, used only for grouping in the picker. */
  phase: 'prep' | 'train' | 'recover'
}

export const FLOW_META: Record<FlowKind, FlowMeta> = {
  massage_bed: { label: 'Massage bed', icon: 'massage-bed', tint: 'var(--accent-body)', phase: 'prep' },
  vibration_plate: {
    label: 'Vibration plate',
    icon: 'vibration-plate',
    tint: 'var(--accent-body)',
    phase: 'prep',
  },
  stretch: { label: 'Stretch', icon: 'stretch', tint: 'var(--accent-mobility)', phase: 'prep' },
  lift: { label: 'Lift', icon: 'lift', tint: 'var(--blue)', phase: 'train' },
  cardio: { label: 'Cardio', icon: 'cardio', tint: 'var(--pink)', phase: 'train' },
  hot_tub: { label: 'Hot tub', icon: 'hot-tub', tint: 'var(--accent-heat)', phase: 'recover' },
  steam_room: { label: 'Steam room', icon: 'steam-room', tint: 'var(--accent-heat)', phase: 'recover' },
  sauna: { label: 'Sauna', icon: 'sauna', tint: 'var(--accent-heat)', phase: 'recover' },
  cold_pool: { label: 'Cold pool', icon: 'cold-pool', tint: 'var(--accent-cold)', phase: 'recover' },
  cold_shower: { label: 'Cold shower', icon: 'cold-shower', tint: 'var(--accent-cold)', phase: 'recover' },
  custom: { label: 'Something else', icon: 'custom', tint: 'var(--gray)', phase: 'recover' },
}

/*
 * The default shape of a visit, in the order it actually happens: loosen up,
 * train, then heat or cold, then the cold shower.
 *
 * The four heat/cold options are all present because which one gets used
 * varies by day — they are offered together and you tick whichever you did,
 * rather than the app trying to guess.
 */
export const DEFAULT_VISIT_TEMPLATE: { kind: FlowKind; label: string }[] = [
  { kind: 'massage_bed', label: 'Massage bed' },
  { kind: 'vibration_plate', label: 'Vibration plate' },
  { kind: 'stretch', label: 'Stretch' },
  { kind: 'lift', label: 'Lift' },
  { kind: 'hot_tub', label: 'Hot tub' },
  { kind: 'steam_room', label: 'Steam room' },
  { kind: 'sauna', label: 'Sauna' },
  { kind: 'cold_pool', label: 'Cold pool' },
  { kind: 'cold_shower', label: 'Cold shower' },
]

export const ALL_FLOW_KINDS: FlowKind[] = [
  'massage_bed',
  'vibration_plate',
  'stretch',
  'lift',
  'cardio',
  'hot_tub',
  'steam_room',
  'sauna',
  'cold_pool',
  'cold_shower',
  'custom',
]

export function buildFlow(template: { kind: FlowKind; label: string }[]): FlowStep[] {
  return template.map((step, i) => ({
    id: `${step.kind}-${i}`,
    kind: step.kind,
    label: step.label,
    done: false,
  }))
}

export function flowMeta(kind: FlowKind): FlowMeta {
  return FLOW_META[kind] ?? FLOW_META.custom
}
