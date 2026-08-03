import type { CSSProperties } from 'react'
import type { AreaId, SplitType } from '../../data/types'
import { areaLabel } from '../../domain/areas'
import { formatDaysSince } from '../../domain/dates'
import { splitColor, splitLabel } from '../../domain/sessions'
import { staleColor, type StaleLevel } from '../../domain/staleness'
import styles from './Badges.module.css'

export function StaleBadge({
  daysSince,
  level,
  showDot = true,
}: {
  daysSince: number | null
  level: StaleLevel
  showDot?: boolean
}) {
  return (
    <span
      className={styles.staleBadge}
      style={{ '--stale-color': staleColor(level) } as CSSProperties}
    >
      {showDot ? <span className={styles.dot} /> : null}
      {formatDaysSince(daysSince)}
    </span>
  )
}

export function SplitBadge({ split, solid }: { split: SplitType | null; solid?: boolean }) {
  return (
    <span
      className={`${styles.splitBadge} ${solid ? styles.splitBadgeSolid : ''}`}
      style={{ '--split-color': splitColor(split) } as CSSProperties}
    >
      {splitLabel(split)}
    </span>
  )
}

export function AreaList({ areas, max = 4 }: { areas: AreaId[]; max?: number }) {
  if (areas.length === 0) return <span className={styles.areaChip}>No areas set</span>
  const shown = areas.slice(0, max).map(areaLabel).join(' · ')
  const rest = areas.length - max
  return <span className={styles.areaChip}>{rest > 0 ? `${shown} +${rest}` : shown}</span>
}
