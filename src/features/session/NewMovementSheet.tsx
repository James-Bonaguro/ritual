import { useState } from 'react'
import type { AreaId, Movement, SplitType } from '../../data/types'
import { AREA_GROUPS, areaLabel } from '../../domain/areas'
import { useStore } from '../../data/store'
import { Sheet } from '../../components/ios/Sheet'
import { Button, TextField } from '../../components/ios/Controls'
import { ListSection } from '../../components/ios/List'
import styles from './NewMovementSheet.module.css'

/*
 * Adding something the seeded library doesn't already cover.
 *
 * This used to be the primary way to get any movement into a session, which is
 * what made the app feel like a form. Now it's the exception: the library
 * covers the standard push/pull/legs work, and this is only for genuinely new
 * things.
 *
 * Areas are optional. Seeded movements ship tagged, so the picker exists purely
 * to keep the by-area view accurate for anything invented later — skipping it
 * costs nothing but that one movement's contribution to the rollup.
 */

export function NewMovementSheet({
  open,
  onClose,
  split,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  split: SplitType | null
  onCreated: (movement: Movement) => void
}) {
  const { ensureMovement, saveMovement } = useStore()
  const [name, setName] = useState('')
  const [areas, setAreas] = useState<AreaId[]>([])

  const close = () => {
    setName('')
    setAreas([])
    onClose()
  }

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    const movement = await ensureMovement(trimmed, areas)
    // A movement invented on a push day belongs to push days.
    if (split && !movement.splits.includes(split)) {
      await saveMovement({
        ...movement,
        splits: [...movement.splits, split],
        areas: movement.areas.length ? movement.areas : areas,
        updatedAt: new Date().toISOString(),
      })
    }
    onCreated(movement)
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="New movement"
      leadingAction={{ label: 'Cancel', onClick: close }}
      trailingAction={{ label: 'Add', onClick: () => void create(), disabled: !name.trim() }}
    >
      <ListSection>
        <TextField
          value={name}
          onChange={setName}
          placeholder="Movement name"
          ariaLabel="Movement name"
          autoFocus
          onSubmit={() => void create()}
        />
      </ListSection>

      <ListSection header="Areas" footer="Optional.">
        {AREA_GROUPS.map((group) => (
          <div key={group.label}>
            <div className={styles.groupLabel}>{group.label}</div>
            <div className={styles.areaGrid}>
              {group.areas.map((areaId) => {
                const on = areas.includes(areaId)
                return (
                  <button
                    key={areaId}
                    type="button"
                    aria-pressed={on}
                    className={`${styles.areaToggle} ${on ? styles.areaToggleOn : ''}`}
                    onClick={() =>
                      setAreas((current) =>
                        on ? current.filter((a) => a !== areaId) : [...current, areaId],
                      )
                    }
                  >
                    {areaLabel(areaId)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </ListSection>

      <div className={styles.footer}>
        <Button block onClick={() => void create()} disabled={!name.trim()}>
          Add to session
        </Button>
      </div>
    </Sheet>
  )
}
