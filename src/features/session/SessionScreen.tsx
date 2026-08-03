import { useMemo, useState, type CSSProperties } from 'react'
import type { Movement, Session, SplitType } from '../../data/types'
import { useStore } from '../../data/store'
import { formatLongDay, formatRelativeDay } from '../../domain/dates'
import { flowMeta } from '../../domain/flow'
import { markLogged, sessionTitle, SPLITS, splitColor, touch } from '../../domain/sessions'
import { Screen, BarButton } from '../../components/ios/Screen'
import { ListRow, ListSection } from '../../components/ios/List'
import { Button, Checkbox } from '../../components/ios/Controls'
import { Icon } from '../../components/ios/Icon'
import { AddMovementSheet } from './AddMovementSheet'
import styles from './SessionScreen.module.css'

/*
 * One screen for planning and for logging.
 *
 * The night before it is a place to jot intentions; at the gym it is a
 * checklist. Nothing switches modes, because the moment there are two modes
 * there is a reconciliation step, and that is the friction that has made every
 * previous attempt at this fall apart.
 */

export function SessionScreen({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { sessions, movementsById, saveSession, deleteSession } = useStore()
  const [adding, setAdding] = useState(false)
  const [openNote, setOpenNote] = useState<string | null>(null)

  const session = sessions.find((s) => s.id === sessionId)

  const selectedIds = useMemo(
    () => new Set(session?.movements.map((m) => m.movementId) ?? []),
    [session],
  )

  if (!session) {
    return (
      <Screen title="Session" largeTitle={false} leading={<BackButton onClick={onBack} />}>
        <ListSection>
          <ListRow title="This session no longer exists." />
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

  const setStepMinutes = (stepId: string, minutes: number | undefined) =>
    update({ flow: session.flow.map((step) => (step.id === stepId ? { ...step, minutes } : step)) })

  const toggleMovementDone = (movementId: string) =>
    update({
      movements: session.movements.map((m) =>
        m.movementId === movementId ? { ...m, done: !m.done } : m,
      ),
    })

  const setMovementNote = (movementId: string, note: string) =>
    update({
      movements: session.movements.map((m) =>
        m.movementId === movementId ? { ...m, note: note || undefined } : m,
      ),
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
          // Anything added while the session is still an intention counts as
          // planned; anything added once it is underway was improvised.
          planned: session.status === 'planned',
          // Adding a movement mid-session means you just did it — no reason to
          // make you tick it a second time.
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
  const doneCount = session.movements.filter((m) => m.done).length

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

        <ListSection header="Thinking" footer="Whatever you'd have put in Notes. Nobody grades this.">
          <div className={styles.intentArea}>
            <textarea
              className={styles.intentInput}
              value={session.intent ?? ''}
              rows={3}
              placeholder="Focus on upper chest. Left shoulder still cranky, keep pressing light."
              aria-label="Session intent"
              onChange={(e) => update({ intent: e.target.value || undefined })}
            />
          </div>
        </ListSection>

        <ListSection
          header="The visit"
          footer="Tap what you actually did. Skipping things is normal."
        >
          {session.flow.map((step) => {
            const meta = flowMeta(step.kind)
            return (
              <div
                key={step.id}
                className={styles.step}
                style={{ '--step-tint': meta.tint } as CSSProperties}
              >
                <Checkbox
                  checked={step.done}
                  onChange={() => toggleStep(step.id)}
                  tint={meta.tint}
                  label={step.label}
                />
                <span className={`${styles.stepGlyph} ${step.done ? '' : styles.stepGlyphIdle}`}>
                  <Icon name={meta.icon} size={17} strokeWidth={2} />
                </span>
                <span className={styles.stepBody}>
                  <span className={`${styles.stepLabel} ${step.done ? '' : styles.stepLabelIdle}`}>
                    {step.label}
                  </span>
                </span>
                {step.done ? (
                  <label className={styles.minutes}>
                    <input
                      className={styles.minutesInput}
                      value={step.minutes ?? ''}
                      inputMode="numeric"
                      placeholder="—"
                      aria-label={`${step.label} minutes`}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value, 10)
                        setStepMinutes(step.id, Number.isNaN(parsed) ? undefined : parsed)
                      }}
                    />
                    min
                  </label>
                ) : null}
              </div>
            )
          })}
        </ListSection>

        <ListSection
          header={doneCount > 0 ? `Movements · ${doneCount} done` : 'Movements'}
          footer={
            session.movements.length > 0
              ? 'Supersets, triples, one side to failure — put it in the note. No structure to fight.'
              : undefined
          }
        >
          {session.movements.map((log) => {
            const movement = movementsById.get(log.movementId)
            if (!movement) return null
            const noteOpen = openNote === log.movementId || Boolean(log.note)
            return (
              <div key={log.movementId} className={styles.movement}>
                <div className={styles.movementMain}>
                  <Checkbox
                    checked={log.done}
                    onChange={() => toggleMovementDone(log.movementId)}
                    tint={splitColor(session.splitType)}
                    label={movement.name}
                  />
                  <button
                    type="button"
                    className={`${styles.movementLabel} ${log.done ? '' : styles.movementLabelIdle}`}
                    onClick={() => toggleMovementDone(log.movementId)}
                  >
                    {movement.name}
                  </button>
                  {log.planned && !log.done ? <span className={styles.plannedTag}>Planned</span> : null}
                  <button
                    type="button"
                    aria-label={`Note for ${movement.name}`}
                    className={`${styles.noteButton} ${log.note ? styles.noteButtonActive : ''}`}
                    onClick={() => setOpenNote(openNote === log.movementId ? null : log.movementId)}
                  >
                    <Icon name="pencil" size={17} strokeWidth={1.9} />
                  </button>
                </div>
                {noteOpen ? (
                  <div className={styles.noteField}>
                    <textarea
                      className={styles.noteInput}
                      value={log.note ?? ''}
                      rows={2}
                      placeholder="Superset with flyes, left side to failure…"
                      aria-label={`Note for ${movement.name}`}
                      onChange={(e) => setMovementNote(log.movementId, e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}

          <ListRow
            title="Add movements"
            leading={<Icon name="plus-circle" size={26} strokeWidth={1.9} style={{ color: 'var(--blue)' }} />}
            onClick={() => setAdding(true)}
            style={{ color: 'var(--blue)' }}
          />
        </ListSection>

        <ListSection header="Notes">
          <div className={styles.intentArea}>
            <textarea
              className={styles.intentInput}
              value={session.notes ?? ''}
              rows={3}
              placeholder="How it went, how you felt, anything worth remembering."
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

      <AddMovementSheet
        open={adding}
        onClose={() => setAdding(false)}
        split={session.splitType}
        selectedIds={selectedIds}
        onToggle={toggleMovement}
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
