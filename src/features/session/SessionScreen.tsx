import { useMemo, useState, type CSSProperties } from 'react'
import type { Movement, Session, SplitType } from '../../data/types'
import { useStore } from '../../data/store'
import { formatDaysSince, formatLongDay, formatRelativeDay } from '../../domain/dates'
import { flowMeta } from '../../domain/flow'
import { markLogged, sessionTitle, SPLITS, splitColor, splitLabel, touch } from '../../domain/sessions'
import { forSplit, movementStaleness } from '../../domain/staleness'
import { Screen, BarButton } from '../../components/ios/Screen'
import { ListSection } from '../../components/ios/List'
import { Button, CheckMark } from '../../components/ios/Controls'
import { Icon } from '../../components/ios/Icon'
import { NewMovementSheet } from './NewMovementSheet'
import styles from './SessionScreen.module.css'

/*
 * One screen for planning and for logging.
 *
 * Choosing a split reveals that split's library inline, stalest first — no
 * modal, no search box, no typing. The previous design led with a search field
 * over an empty library, which meant every movement had to be typed before it
 * could be tapped. That is the opposite of a library, and it is why the app
 * went unused.
 *
 * Rows keep a stable order as you tick them. Sorting selected items to the top
 * would move the next row out from under your thumb mid-tap.
 */

export function SessionScreen({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { sessions, movements, saveSession, deleteSession } = useStore()
  const [addingNew, setAddingNew] = useState(false)

  const session = sessions.find((s) => s.id === sessionId)

  /** The chosen split's library, stalest first, with current selection state. */
  const library = useMemo(() => {
    if (!session?.splitType) return []
    const ranked = movementStaleness(movements, sessions)
    const scoped = forSplit(ranked, session.splitType)
    const selected = new Set(session.movements.map((m) => m.movementId))
    return scoped.map((item) => ({ ...item, selected: selected.has(item.movement.id) }))
  }, [movements, sessions, session])

  if (!session) {
    return (
      <Screen title="Session" largeTitle={false} leading={<BackButton onClick={onBack} />}>
        <ListSection>
          <div className={styles.pickPrompt}>This session no longer exists.</div>
        </ListSection>
      </Screen>
    )
  }

  const update = (patch: Partial<Session>) => void saveSession(touch({ ...session, ...patch }))

  const setSplit = (split: SplitType) =>
    update({ splitType: session.splitType === split ? null : split })

  const toggleStep = (stepId: string) =>
    update({
      flow: session.flow.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)),
    })

  const toggleMovement = (movement: Movement) => {
    const existing = session.movements.find((m) => m.movementId === movement.id)
    if (existing) {
      update({ movements: session.movements.filter((m) => m.movementId !== movement.id) })
      return
    }
    update({
      movements: [
        ...session.movements,
        {
          movementId: movement.id,
          // Added while the session is still an intention counts as planned;
          // added once it's underway was improvised.
          planned: session.status === 'planned',
          // Ticking it mid-session means you just did it — no second tap.
          done: session.status !== 'planned',
        },
      ],
    })
  }

  const finish = () => {
    void saveSession(markLogged(session))
    onBack()
  }

  const remove = () => {
    void deleteSession(session.id)
    onBack()
  }

  const isPlanned = session.status === 'planned'
  const selectedCount = session.movements.length

  return (
    <>
      <Screen
        title={sessionTitle(session)}
        subtitle={`${formatRelativeDay(session.date)} · ${formatLongDay(session.date)}`}
        leading={<BackButton onClick={onBack} />}
        trailing={
          isPlanned ? undefined : (
            <BarButton onClick={remove} label="Delete session">
              <Icon name="trash" size={20} strokeWidth={1.9} />
            </BarButton>
          )
        }
      >
        <div className={styles.splitRow}>
          {SPLITS.map((split) => {
            const active = session.splitType === split.value
            return (
              <button
                key={split.value}
                type="button"
                aria-pressed={active}
                className={`${styles.splitCard} ${active ? styles.splitCardActive : ''}`}
                style={{ '--split-color': split.color } as CSSProperties}
                onClick={() => setSplit(split.value)}
              >
                <span className={styles.splitDot} />
                <span className={styles.splitName}>{split.label}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>
            {session.splitType ? `${splitLabel(session.splitType)} movements` : 'Movements'}
          </span>
          {selectedCount > 0 ? (
            <span className={styles.sectionCount}>{selectedCount} picked</span>
          ) : null}
        </div>

        <ListSection>
          {!session.splitType ? (
            <div className={styles.pickPrompt}>Pick a day above to see its movements.</div>
          ) : (
            <>
              {library.map((item) => (
                <button
                  key={item.movement.id}
                  type="button"
                  aria-pressed={item.selected}
                  className={styles.pickRow}
                  onClick={() => toggleMovement(item.movement)}
                >
                  <CheckMark checked={item.selected} tint={splitColor(session.splitType)} />
                  <span className={styles.pickBody}>
                    <span
                      className={`${styles.pickName} ${item.selected ? styles.pickNameSelected : ''}`}
                    >
                      {item.movement.name}
                    </span>
                    <span className={styles.pickMeta}>
                      {item.lastPerformed
                        ? `Last done ${formatDaysSince(item.daysSince).toLowerCase()}`
                        : 'Never logged'}
                    </span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                className={`${styles.pickRow} ${styles.newRow}`}
                onClick={() => setAddingNew(true)}
              >
                <Icon
                  name="plus-circle"
                  size={26}
                  strokeWidth={1.9}
                  style={{ color: 'var(--label-tertiary)' }}
                />
                <span className={styles.newRowLabel}>New movement</span>
              </button>
            </>
          )}
        </ListSection>

        <ListSection header="The visit">
          {session.flow.map((step) => {
            const meta = flowMeta(step.kind)
            return (
              <button
                key={step.id}
                type="button"
                aria-pressed={step.done}
                className={styles.step}
                style={{ '--step-tint': meta.tint } as CSSProperties}
                onClick={() => toggleStep(step.id)}
              >
                <CheckMark checked={step.done} tint={meta.tint} />
                <span className={`${styles.stepGlyph} ${step.done ? '' : styles.stepGlyphIdle}`}>
                  <Icon name={meta.icon} size={17} strokeWidth={2} />
                </span>
                <span className={`${styles.stepLabel} ${step.done ? '' : styles.stepLabelIdle}`}>
                  {step.label}
                </span>
              </button>
            )
          })}
        </ListSection>

        <ListSection header="Notes">
          <div className={styles.noteArea}>
            <textarea
              className={styles.noteInput}
              value={session.notes ?? ''}
              rows={3}
              placeholder="Supersets, how it felt, anything worth remembering."
              aria-label="Session notes"
              onChange={(e) => update({ notes: e.target.value || undefined })}
            />
          </div>
        </ListSection>

        <div className={styles.actions}>
          {isPlanned ? (
            <Button block onClick={finish}>
              Log this session
            </Button>
          ) : null}
          <Button block variant="plain" destructive onClick={remove}>
            Delete session
          </Button>
        </div>
      </Screen>

      <NewMovementSheet
        open={addingNew}
        onClose={() => setAddingNew(false)}
        split={session.splitType}
        onCreated={toggleMovement}
      />
    </>
  )
}

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <BarButton side="leading" onClick={onClick} label={label}>
      <Icon name="chevron-left" size={22} strokeWidth={2.6} />
    </BarButton>
  )
}
