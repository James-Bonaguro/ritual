import { useMemo, useState } from 'react'
import type { AreaId, Movement, SplitType } from '../../data/types'
import { AREA_GROUPS, areaLabel } from '../../domain/areas'
import { formatDaysSince } from '../../domain/dates'
import {
  areaStaleness,
  areasForSplitStaleness,
  forSplit,
  movementStaleness,
} from '../../domain/staleness'
import { useStore } from '../../data/store'
import { Sheet } from '../../components/ios/Sheet'
import { Button, Checkbox, SearchField, TextField } from '../../components/ios/Controls'
import { ListSection } from '../../components/ios/List'
import { Icon } from '../../components/ios/Icon'
import { StaleBadge } from '../shared/Badges'
import styles from './AddMovementSheet.module.css'

/*
 * The planning tool, and the reason the app exists.
 *
 * It opens on what you have *not* been hitting rather than on a search box or
 * an A-Z list, because "which one haven't I done?" is the actual question being
 * asked at this moment. Search is there, but it is not the default posture.
 *
 * The same sheet is used mid-session to add improvised work, so there is only
 * one way to put a movement into a session.
 */

type Props = {
  open: boolean
  onClose: () => void
  split: SplitType | null
  selectedIds: Set<string>
  onToggle: (movement: Movement) => void
}

export function AddMovementSheet({ open, onClose, split, selectedIds, onToggle }: Props) {
  const { movements, sessions, ensureMovement, saveMovement } = useStore()
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState<AreaId | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [draftAreas, setDraftAreas] = useState<AreaId[]>([])

  const ranked = useMemo(() => {
    const all = movementStaleness(movements, sessions)
    return split ? forSplit(all, split) : all
  }, [movements, sessions, split])

  const staleAreas = useMemo(() => {
    const all = areaStaleness(movements, sessions)
    const scoped = split ? areasForSplitStaleness(all, split) : all
    // Areas with no movements at all are a different problem — "you have
    // nothing that trains this" — and would otherwise fill the whole rail on
    // day one. Surfaced only once something covers them.
    return scoped.filter((a) => a.movementCount > 0).slice(0, 8)
  }, [movements, sessions, split])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ranked.filter((item) => {
      if (areaFilter && !item.movement.areas.includes(areaFilter)) return false
      if (q && !item.movement.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [ranked, query, areaFilter])

  const exactMatch = useMemo(
    () => movements.some((m) => m.name.toLowerCase() === query.trim().toLowerCase()),
    [movements, query],
  )

  const close = () => {
    setQuery('')
    setAreaFilter(null)
    setCreating(null)
    setDraftAreas([])
    onClose()
  }

  const beginCreate = (name: string) => {
    setCreating(name.trim())
    // Pre-tick nothing: guessing the areas wrong is worse than one extra tap,
    // because this is the only time it ever gets asked.
    setDraftAreas([])
  }

  const confirmCreate = async () => {
    if (!creating) return
    const movement = await ensureMovement(creating, draftAreas)
    // A movement created while planning a push day belongs to push days.
    if (split && !movement.splits.includes(split)) {
      await saveMovement({
        ...movement,
        splits: [...movement.splits, split],
        areas: movement.areas.length ? movement.areas : draftAreas,
        updatedAt: new Date().toISOString(),
      })
    }
    onToggle(movement)
    setCreating(null)
    setDraftAreas([])
    setQuery('')
  }

  if (creating !== null) {
    return (
      <Sheet
        open={open}
        onClose={close}
        title="New movement"
        leadingAction={{ label: 'Back', onClick: () => setCreating(null) }}
        trailingAction={{ label: 'Add', onClick: () => void confirmCreate() }}
      >
        <ListSection>
          <TextField value={creating} onChange={setCreating} placeholder="Movement name" ariaLabel="Movement name" />
        </ListSection>

        <p className={styles.createHint}>
          Which areas does this hit? Asked once, never again — it&rsquo;s what lets the app spot a
          muscle you&rsquo;ve quietly stopped training.
        </p>

        {AREA_GROUPS.map((group) => (
          <ListSection key={group.label} header={group.label} tight>
            <div className={styles.areaGrid}>
              {group.areas.map((areaId) => {
                const on = draftAreas.includes(areaId)
                return (
                  <button
                    key={areaId}
                    type="button"
                    aria-pressed={on}
                    className={`${styles.areaToggle} ${on ? styles.areaToggleOn : ''}`}
                    onClick={() =>
                      setDraftAreas((current) =>
                        on ? current.filter((a) => a !== areaId) : [...current, areaId],
                      )
                    }
                  >
                    {areaLabel(areaId)}
                  </button>
                )
              })}
            </div>
          </ListSection>
        ))}

        <div className={styles.footer}>
          <Button block onClick={() => void confirmCreate()} disabled={!creating.trim()}>
            Add to session
          </Button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Add movements"
      trailingAction={{ label: 'Done', onClick: close }}
    >
      <SearchField value={query} onChange={setQuery} placeholder="Search or type something new" />

      {staleAreas.length > 0 && !query ? (
        <>
          <div className={styles.railHeader}>Areas going cold</div>
          <div className={styles.rail}>
            {staleAreas.map((item) => {
              const active = areaFilter === item.area.id
              return (
                <button
                  key={item.area.id}
                  type="button"
                  aria-pressed={active}
                  className={`${styles.areaCard} ${active ? styles.areaCardActive : ''}`}
                  onClick={() => setAreaFilter(active ? null : item.area.id)}
                >
                  <StaleBadge daysSince={item.daysSince} level={item.level} />
                  <span className={styles.areaName}>{item.area.label}</span>
                  <span className={styles.areaMeta}>
                    {item.movementCount} {item.movementCount === 1 ? 'movement' : 'movements'}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      <ListSection
        header={
          areaFilter
            ? `${areaLabel(areaFilter)} · stalest first`
            : query
              ? 'Matches'
              : 'Haven’t hit in a while'
        }
        footer={
          filtered.length === 0 && !query
            ? 'Nothing here yet. Type a movement name above and it becomes part of your library.'
            : undefined
        }
      >
        {filtered.map((item) => {
          const selected = selectedIds.has(item.movement.id)
          return (
            <button
              key={item.movement.id}
              type="button"
              className={styles.movementRow}
              onClick={() => onToggle(item.movement)}
            >
              <Checkbox checked={selected} onChange={() => onToggle(item.movement)} label={item.movement.name} />
              <span className={styles.movementBody}>
                <span className={styles.movementName}>{item.movement.name}</span>
                <span className={styles.movementMeta}>
                  {item.lastPerformed
                    ? `Last done ${formatDaysSince(item.daysSince).toLowerCase()}`
                    : 'Never logged'}
                  {item.movement.areas.length
                    ? ` · ${item.movement.areas.slice(0, 2).map(areaLabel).join(', ')}`
                    : ''}
                </span>
              </span>
              <StaleBadge daysSince={item.daysSince} level={item.level} showDot={false} />
            </button>
          )
        })}

        {query.trim() && !exactMatch ? (
          <button
            type="button"
            className={`${styles.movementRow} ${styles.createRow}`}
            onClick={() => beginCreate(query)}
          >
            <Icon name="plus-circle" size={26} strokeWidth={1.9} />
            <span className={styles.movementBody}>
              <span className={styles.movementName} style={{ color: 'var(--blue)' }}>
                Create &ldquo;{query.trim()}&rdquo;
              </span>
              <span className={styles.movementMeta}>Adds it to your library</span>
            </span>
          </button>
        ) : null}
      </ListSection>
    </Sheet>
  )
}
