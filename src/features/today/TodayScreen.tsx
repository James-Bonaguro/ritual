import { useMemo, type CSSProperties } from 'react'
import type { Session } from '../../data/types'
import { useStore } from '../../data/store'
import { formatLongDay, formatRelativeDay, today as todayISO, tomorrow } from '../../domain/dates'
import { movementStaleness } from '../../domain/staleness'
import { createSession, sessionTitle, splitColor, summarise } from '../../domain/sessions'
import { Screen, BarButton } from '../../components/ios/Screen'
import { Button } from '../../components/ios/Controls'
import { ListRow, ListSection } from '../../components/ios/List'
import { Icon } from '../../components/ios/Icon'
import { SplitBadge, StaleBadge } from '../shared/Badges'
import styles from './TodayScreen.module.css'

/*
 * Home. Leads with the session in hand — today's, or the next one planned —
 * then with what has gone cold, because those are the only two questions worth
 * answering when the app opens.
 */

export function TodayScreen({
  onOpenSession,
  onOpenMovement,
  onOpenSettings,
  onSeeAllMovements,
}: {
  onOpenSession: (id: string) => void
  onOpenMovement: (id: string) => void
  onOpenSettings: () => void
  onSeeAllMovements: () => void
}) {
  const { sessions, movements, movementsById, settings, saveSession } = useStore()
  const iso = todayISO()

  const current = useMemo(() => {
    const forToday = sessions.find((s) => s.date === iso)
    if (forToday) return forToday
    // Nothing today: surface the nearest thing already planned ahead, so a plan
    // written on Sunday night is the first thing seen on Monday morning.
    return sessions
      .filter((s) => s.date > iso && s.status === 'planned')
      .sort((a, b) => a.date.localeCompare(b.date))[0]
  }, [sessions, iso])

  const stale = useMemo(
    () => movementStaleness(movements, sessions).filter((m) => m.level !== 'fresh').slice(0, 8),
    [movements, sessions],
  )

  const recent = useMemo(
    () => sessions.filter((s) => s.status === 'logged').slice(0, 3),
    [sessions],
  )

  const begin = async (date: string) => {
    const session = createSession({ date, template: settings.visitTemplate })
    await saveSession(session)
    onOpenSession(session.id)
  }

  return (
    <Screen
      title="Today"
      subtitle={formatLongDay(iso)}
      trailing={
        <BarButton onClick={onOpenSettings} label="Settings">
          <Icon name="gear" size={21} strokeWidth={1.9} />
        </BarButton>
      }
    >
      {current ? (
        <SessionCard
          session={current}
          onClick={() => onOpenSession(current.id)}
          summary={summarise(current, movementsById)}
        />
      ) : (
        <div className={styles.start}>
          <div className={styles.startTitle}>Nothing logged today</div>
          <p className={styles.startMessage}>Start now, or set up tomorrow.</p>
          <div className={styles.startActions}>
            <Button block onClick={() => void begin(iso)}>
              Start a session
            </Button>
            <Button block variant="gray" onClick={() => void begin(tomorrow())}>
              Plan tomorrow
            </Button>
          </div>
        </div>
      )}

      {stale.length > 0 ? (
        <>
          <div className={styles.railHead}>
            <span className={styles.railTitle}>Going cold</span>
            <button type="button" className={styles.railAction} onClick={onSeeAllMovements}>
              See all
            </button>
          </div>
          <div className={styles.rail}>
            {stale.map((item) => (
              <button
                key={item.movement.id}
                type="button"
                className={styles.staleCard}
                onClick={() => onOpenMovement(item.movement.id)}
              >
                <StaleBadge daysSince={item.daysSince} level={item.level} />
                <span className={styles.staleName}>{item.movement.name}</span>
                <span className={styles.staleMeta}>
                  {item.recentCount === 0
                    ? 'Not in 30 days'
                    : `${item.recentCount}× in 30 days`}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {recent.length > 0 ? (
        <ListSection header="Recently">
          {recent.map((session) => (
            <ListRow
              key={session.id}
              title={sessionTitle(session)}
              subtitle={summarise(session, movementsById)}
              value={formatRelativeDay(session.date)}
              onClick={() => onOpenSession(session.id)}
              chevron
            />
          ))}
        </ListSection>
      ) : null}
    </Screen>
  )
}

function SessionCard({
  session,
  summary,
  onClick,
}: {
  session: Session
  summary: string
  onClick: () => void
}) {
  const stepsDone = session.flow.filter((s) => s.done).length
  const movesDone = session.movements.filter((m) => m.done).length
  const total = session.flow.length
  const pct = total === 0 ? 0 : Math.round((stepsDone / total) * 100)

  return (
    <button
      type="button"
      className={`${styles.card} ${styles.cardTappable}`}
      style={{ '--split-color': splitColor(session.splitType) } as CSSProperties}
      onClick={onClick}
    >
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{sessionTitle(session)}</span>
        {session.splitType ? <SplitBadge split={session.splitType} /> : null}
      </div>
      <div className={styles.cardWhen}>
        {formatRelativeDay(session.date)}
        {session.status === 'planned' ? ' · planned' : ''}
      </div>

      {session.intent ? <p className={styles.cardIntent}>{session.intent}</p> : null}

      <div className={styles.chips}>
        {session.movements.length === 0 ? (
          <span className={`${styles.chip} ${styles.chipMuted}`}>No movements yet</span>
        ) : (
          <span className={styles.chip}>{summary}</span>
        )}
      </div>

      <div className={styles.progress}>
        <span className={styles.progressTrack}>
          <span className={styles.progressFill} style={{ width: `${pct}%` }} />
        </span>
        <span className={styles.progressLabel}>
          {stepsDone}/{total} · {movesDone} {movesDone === 1 ? 'movement' : 'movements'}
        </span>
      </div>
    </button>
  )
}
