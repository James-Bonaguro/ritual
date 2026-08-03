import { useMemo, useState, type CSSProperties } from 'react'
import { useStore } from '../../data/store'
import { formatDaysSince } from '../../domain/dates'
import { areaStaleness, movementStaleness, staleColor } from '../../domain/staleness'
import { Screen } from '../../components/ios/Screen'
import { EmptyState, SearchField, Segmented } from '../../components/ios/Controls'
import { ListSection } from '../../components/ios/List'
import { StaleBadge } from '../shared/Badges'
import styles from './Movements.module.css'

/*
 * The library. Empty on day one and filled entirely by what actually gets
 * logged — nothing is seeded, so every row here is something the user has
 * genuinely done at least once.
 *
 * Sorted by staleness rather than alphabetically, because the list is a tool
 * for deciding what to train, not a filing cabinet.
 */

const GAUGE_CAP_DAYS = 60

export function MovementsScreen({ onOpenMovement }: { onOpenMovement: (id: string) => void }) {
  const { movements, sessions } = useStore()
  const [mode, setMode] = useState<'movement' | 'area'>('movement')
  const [query, setQuery] = useState('')

  const rankedMovements = useMemo(() => movementStaleness(movements, sessions), [movements, sessions])
  const rankedAreas = useMemo(() => areaStaleness(movements, sessions), [movements, sessions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rankedMovements
    return rankedMovements.filter((m) => m.movement.name.toLowerCase().includes(q))
  }, [rankedMovements, query])

  if (movements.length === 0) {
    return (
      <Screen title="Movements">
        <EmptyState
          glyph="lift"
          title="Nothing here yet"
          message="This fills itself in. Log a session and every movement you did shows up here, ranked by how long it's been."
        />
      </Screen>
    )
  }

  return (
    <Screen title="Movements" subtitle={`${movements.length} in your library`}>
      <Segmented
        options={[
          { value: 'movement', label: 'By movement' },
          { value: 'area', label: 'By area' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'movement' ? (
        <>
          <SearchField value={query} onChange={setQuery} placeholder="Search movements" />
          <ListSection
            header="Stalest first"
            footer="Tap one for its full history and every note you've written about it."
          >
            {filtered.map((item) => (
              <button
                key={item.movement.id}
                type="button"
                className={styles.row}
                onClick={() => onOpenMovement(item.movement.id)}
              >
                <span className={styles.body}>
                  <span className={styles.name}>{item.movement.name}</span>
                  <span className={styles.meta}>
                    {item.recentCount === 0
                      ? 'Not in the last 30 days'
                      : `${item.recentCount}× in the last 30 days`}
                  </span>
                </span>
                <Gauge daysSince={item.daysSince} level={item.level} />
                <StaleBadge daysSince={item.daysSince} level={item.level} showDot={false} />
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className={styles.noteEntry}>
                <div className={styles.noteWhen}>No matches for “{query}”.</div>
              </div>
            ) : null}
          </ListSection>
        </>
      ) : (
        <ListSection
          header="Stalest first"
          footer="An area is only as fresh as the last movement you did that hits it. Areas with no movements yet are listed last."
        >
          {rankedAreas.map((item) => (
            <div key={item.area.id} className={styles.row}>
              <span className={styles.body}>
                <span className={styles.name}>{item.area.label}</span>
                <span className={styles.meta}>
                  {item.movementCount === 0
                    ? 'Nothing in your library hits this'
                    : `${item.movementCount} ${item.movementCount === 1 ? 'movement' : 'movements'}`}
                </span>
              </span>
              <Gauge daysSince={item.daysSince} level={item.level} />
              <StaleBadge daysSince={item.daysSince} level={item.level} showDot={false} />
            </div>
          ))}
        </ListSection>
      )}
    </Screen>
  )
}

function Gauge({
  daysSince,
  level,
}: {
  daysSince: number | null
  level: Parameters<typeof staleColor>[0]
}) {
  const fraction = daysSince === null ? 1 : Math.min(daysSince / GAUGE_CAP_DAYS, 1)
  return (
    <span
      className={styles.gauge}
      role="img"
      aria-label={`Last done ${formatDaysSince(daysSince)}`}
      style={{ '--gauge-color': staleColor(level) } as CSSProperties}
    >
      <span className={styles.gaugeFill} style={{ width: `${Math.max(fraction * 100, 6)}%` }} />
    </span>
  )
}
