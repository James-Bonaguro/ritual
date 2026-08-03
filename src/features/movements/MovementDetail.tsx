import { useMemo, useState } from 'react'
import type { AreaId } from '../../data/types'
import { useStore } from '../../data/store'
import { AREA_GROUPS, areaLabel } from '../../domain/areas'
import { daysBetween, formatDaysSince, formatRelativeDay, today as todayISO } from '../../domain/dates'
import { movementStaleness } from '../../domain/staleness'
import { sessionTitle } from '../../domain/sessions'
import { Screen } from '../../components/ios/Screen'
import { BackButton } from '../session/SessionScreen'
import { ListSection } from '../../components/ios/List'
import { Button } from '../../components/ios/Controls'
import { StaleBadge } from '../shared/Badges'
import styles from './Movements.module.css'

/*
 * Everything known about one movement.
 *
 * The note history is the point of this screen. Over a year it becomes the
 * only place that remembers a shoulder was cranky the last three times you
 * pressed — which is exactly what a plain notes app loses.
 */

const SPARK_WEEKS = 12

export function MovementDetail({
  movementId,
  onBack,
  onOpenSession,
}: {
  movementId: string
  onBack: () => void
  onOpenSession: (id: string) => void
}) {
  const { movements, sessions, movementsById, saveMovement, deleteMovement } = useStore()
  const [editingAreas, setEditingAreas] = useState(false)

  const movement = movementsById.get(movementId)

  const stats = useMemo(
    () => movementStaleness(movements, sessions).find((m) => m.movement.id === movementId),
    [movements, sessions, movementId],
  )

  /** Sessions in which this movement was actually done, newest first. */
  const appearances = useMemo(
    () =>
      sessions.filter((s) => s.movements.some((m) => m.movementId === movementId && m.done)),
    [sessions, movementId],
  )

  const notes = useMemo(
    () =>
      appearances
        .map((session) => ({
          session,
          note: session.movements.find((m) => m.movementId === movementId)?.note,
        }))
        .filter((entry): entry is { session: (typeof appearances)[number]; note: string } =>
          Boolean(entry.note),
        ),
    [appearances, movementId],
  )

  /** One bar per week for the last twelve, filled if it was trained that week. */
  const spark = useMemo(() => {
    const iso = todayISO()
    const weeks = new Array(SPARK_WEEKS).fill(0)
    for (const session of appearances) {
      const days = daysBetween(session.date, iso)
      if (days < 0 || days >= SPARK_WEEKS * 7) continue
      const bucket = SPARK_WEEKS - 1 - Math.floor(days / 7)
      weeks[bucket] += 1
    }
    return weeks
  }, [appearances])

  if (!movement) {
    return (
      <Screen title="Movement" largeTitle={false} leading={<BackButton onClick={onBack} />}>
        <ListSection>
          <div className={styles.noteEntry}>
            <div className={styles.noteWhen}>This movement no longer exists.</div>
          </div>
        </ListSection>
      </Screen>
    )
  }

  const toggleArea = (areaId: AreaId) => {
    const areas = movement.areas.includes(areaId)
      ? movement.areas.filter((a) => a !== areaId)
      : [...movement.areas, areaId]
    void saveMovement({ ...movement, areas, updatedAt: new Date().toISOString() })
  }

  const remove = () => {
    void deleteMovement(movement.id)
    onBack()
  }

  const peak = Math.max(...spark, 1)

  return (
    <Screen
      title={movement.name}
      subtitle={movement.areas.length ? movement.areas.map(areaLabel).join(' · ') : 'No areas set'}
      leading={<BackButton onClick={onBack} />}
    >
      <div className={styles.hero}>
        {stats ? <StaleBadge daysSince={stats.daysSince} level={stats.level} /> : null}
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatDaysSince(stats?.daysSince ?? null)}</span>
            <span className={styles.statLabel}>Last done</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{appearances.length}</span>
            <span className={styles.statLabel}>Times total</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats?.recentCount ?? 0}</span>
            <span className={styles.statLabel}>In 30 days</span>
          </div>
        </div>
      </div>

      <ListSection header={`Last ${SPARK_WEEKS} weeks`} tight>
        <div className={styles.spark}>
          {spark.map((count, i) => (
            <span
              key={i}
              className={`${styles.sparkBar} ${count > 0 ? styles.sparkBarOn : ''}`}
              style={{ height: `${count === 0 ? 6 : (count / peak) * 100}%` }}
            />
          ))}
        </div>
        <div className={styles.sparkAxis}>
          <span>12 weeks ago</span>
          <span>This week</span>
        </div>
      </ListSection>

      <ListSection
        header="Areas"
        footer={
          editingAreas
            ? 'These drive the by-area staleness rollup.'
            : undefined
        }
      >
        {editingAreas ? (
          <>
            {AREA_GROUPS.map((group) => (
              <div key={group.label}>
                <div className={styles.noteWhen} style={{ padding: '10px 16px 0' }}>
                  {group.label}
                </div>
                <div className={styles.areaEditGrid}>
                  {group.areas.map((areaId) => {
                    const on = movement.areas.includes(areaId)
                    return (
                      <button
                        key={areaId}
                        type="button"
                        aria-pressed={on}
                        className={`${styles.areaToggle} ${on ? styles.areaToggleOn : ''}`}
                        onClick={() => toggleArea(areaId)}
                      >
                        {areaLabel(areaId)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className={styles.noteEntry}>
              <Button variant="plain" onClick={() => setEditingAreas(false)}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.noteEntry}>
            <div className={styles.noteBody}>
              {movement.areas.length ? movement.areas.map(areaLabel).join(', ') : 'None set yet'}
            </div>
            <Button variant="plain" small onClick={() => setEditingAreas(true)} style={{ paddingLeft: 0 }}>
              Edit areas
            </Button>
          </div>
        )}
      </ListSection>

      {notes.length > 0 ? (
        <ListSection header="Notes over time">
          {notes.map((entry) => (
            <div key={entry.session.id} className={styles.noteEntry} data-selectable>
              <div className={styles.noteWhen}>
                {formatRelativeDay(entry.session.date)} · {sessionTitle(entry.session)}
              </div>
              <div className={styles.noteBody}>{entry.note}</div>
            </div>
          ))}
        </ListSection>
      ) : null}

      <ListSection header="History" footer={appearances.length === 0 ? 'Never logged yet.' : undefined}>
        {appearances.slice(0, 20).map((session) => (
          <button
            key={session.id}
            type="button"
            className={styles.row}
            onClick={() => onOpenSession(session.id)}
          >
            <span className={styles.body}>
              <span className={styles.name}>{sessionTitle(session)}</span>
              <span className={styles.meta}>{formatRelativeDay(session.date)}</span>
            </span>
          </button>
        ))}
      </ListSection>

      <div className={styles.actions}>
        <Button block variant="plain" destructive onClick={remove}>
          Delete movement
        </Button>
      </div>
    </Screen>
  )
}
