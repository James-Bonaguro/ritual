/*
 * Note what is absent: there is no set, rep, weight, volume or PR anywhere in
 * this model, and that is deliberate. Every nuance that a rigid schema would
 * try to capture — supersets, triples, one side taken to failure — lives in a
 * free-text note instead, because structure is the thing that has repeatedly
 * failed to survive contact with an actual gym floor.
 */

export type SplitType = 'push' | 'pull' | 'legs' | 'other'

export type SessionStatus = 'planned' | 'logged'

export type FlowKind =
  | 'massage_bed'
  | 'vibration_plate'
  | 'stretch'
  | 'lift'
  | 'hot_tub'
  | 'steam_room'
  | 'sauna'
  | 'cold_pool'
  | 'cold_shower'
  | 'cardio'
  | 'custom'

export type AreaId =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'lats'
  | 'upper_back'
  | 'lower_back'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'obliques'
  | 'hips'
  | 'neck'

/** One segment of a gym visit. The lift is just one of these. */
export type FlowStep = {
  id: string
  kind: FlowKind
  label: string
  done: boolean
  minutes?: number
  note?: string
}

/**
 * A movement attached to a session. `planned` records that it was written down
 * beforehand; `done` records that it actually happened. Nothing anywhere
 * compares the two — a planned movement left undone is not a failure state and
 * is never surfaced as one.
 */
export type MovementLog = {
  movementId: string
  planned: boolean
  done: boolean
  note?: string
}

/**
 * A session begins as an intention and becomes the record of what happened.
 * There is no separate plan entity, so there is nothing to reconcile.
 */
export type Session = {
  id: string
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  status: SessionStatus
  splitType: SplitType | null
  /** Thoughts jotted while planning: "focus on upper chest, shoulder still cranky". */
  intent?: string
  flow: FlowStep[]
  movements: MovementLog[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type Movement = {
  id: string
  name: string
  /** Which split days this shows up under. Learned from where you log it. */
  splits: SplitType[]
  /** Chosen once, at creation. Never asked again. */
  areas: AreaId[]
  /**
   * Tiebreak position when staleness can't decide — which is every movement on
   * day one, since nothing has been logged yet. Without it the list falls back
   * to alphabetical and a push day opens on "Ab Wheel" instead of bench press.
   */
  order?: number
  createdAt: string
  updatedAt: string
  archived?: boolean
}

export type Appearance = 'system' | 'light' | 'dark'

export type Settings = {
  id: 'settings'
  appearance: Appearance
  /** The editable shape of a normal gym visit, prefilled into new sessions. */
  visitTemplate: { kind: FlowKind; label: string }[]
  /**
   * Highest seed batch already applied. Lets the starter library be topped up
   * in a later release without re-adding movements the user has deleted.
   */
  seedVersion?: number
  updatedAt: string
}

/** Shape of the export/import backup file. */
export type Backup = {
  version: 1
  exportedAt: string
  movements: Movement[]
  sessions: Session[]
  settings: Settings | null
}
