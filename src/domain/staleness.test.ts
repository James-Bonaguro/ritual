import { describe, expect, it } from 'vitest'
import { areaStaleness, forSplit, movementStaleness, staleLevel } from './staleness'
import { movement, session } from './testing'

const TODAY = '2026-08-03'

describe('staleLevel', () => {
  it('treats a never-performed movement as its own category', () => {
    expect(staleLevel(null)).toBe('never')
  })

  it('holds anything inside a week as fresh, since a split comes round twice a week', () => {
    expect(staleLevel(0)).toBe('fresh')
    expect(staleLevel(6)).toBe('fresh')
  })

  it('flags a movement as due at a week and stale at a fortnight', () => {
    expect(staleLevel(7)).toBe('due')
    expect(staleLevel(13)).toBe('due')
    expect(staleLevel(14)).toBe('stale')
    expect(staleLevel(90)).toBe('stale')
  })
})

describe('movementStaleness', () => {
  it('reports days since the most recent time a movement was done', () => {
    const movements = [movement('m1', 'Incline press')]
    const sessions = [session('2026-07-20', ['m1']), session('2026-07-30', ['m1'])]

    const [result] = movementStaleness(movements, sessions, TODAY)

    expect(result.lastPerformed).toBe('2026-07-30')
    expect(result.daysSince).toBe(4)
    expect(result.level).toBe('fresh')
  })

  it('ranks never-done movements above merely stale ones', () => {
    const movements = [
      movement('m1', 'Done recently'),
      movement('m2', 'Never done'),
      movement('m3', 'Done ages ago'),
    ]
    const sessions = [session('2026-08-01', ['m1']), session('2026-05-01', ['m3'])]

    const ranked = movementStaleness(movements, sessions, TODAY)

    expect(ranked.map((r) => r.movement.id)).toEqual(['m2', 'm3', 'm1'])
    expect(ranked[0].daysSince).toBeNull()
  })

  it('ignores movements that were planned but never ticked off', () => {
    const movements = [movement('m1', 'Skipped it')]
    const sessions = [session('2026-08-01', [], { planned: ['m1'] })]

    const [result] = movementStaleness(movements, sessions, TODAY)

    expect(result.lastPerformed).toBeNull()
    expect(result.level).toBe('never')
  })

  it('counts a movement ticked in a session that is still open', () => {
    // Mid-session the status is still 'planned', but a ticked movement has
    // genuinely happened and must not read as never-done.
    const movements = [movement('m1', 'Just did this')]
    const sessions = [session(TODAY, ['m1'], { status: 'planned' })]

    const [result] = movementStaleness(movements, sessions, TODAY)

    expect(result.daysSince).toBe(0)
  })

  it('does not let a future-dated plan count as history', () => {
    const movements = [movement('m1', 'Tomorrow’s work')]
    const sessions = [session('2026-08-10', ['m1'])]

    const [result] = movementStaleness(movements, sessions, TODAY)

    expect(result.lastPerformed).toBeNull()
  })

  it('counts appearances inside the trailing 30 days only', () => {
    const movements = [movement('m1', 'Squat')]
    const sessions = [
      session('2026-08-01', ['m1']),
      session('2026-07-20', ['m1']),
      session('2026-06-01', ['m1']), // outside the window
    ]

    const [result] = movementStaleness(movements, sessions, TODAY)

    expect(result.recentCount).toBe(2)
  })

  it('leaves archived movements out entirely', () => {
    const archived = { ...movement('m1', 'Retired'), archived: true }
    expect(movementStaleness([archived], [], TODAY)).toHaveLength(0)
  })
})

describe('areaStaleness', () => {
  it('is only as fresh as the most recent movement hitting that area', () => {
    const movements = [
      movement('m1', 'Bench', ['chest', 'triceps']),
      movement('m2', 'Dips', ['chest']),
    ]
    const sessions = [session('2026-06-01', ['m1']), session('2026-08-01', ['m2'])]

    const chest = areaStaleness(movements, sessions, TODAY).find((a) => a.area.id === 'chest')
    const triceps = areaStaleness(movements, sessions, TODAY).find((a) => a.area.id === 'triceps')

    // Chest was hit two days ago by dips, even though bench is months stale.
    expect(chest?.daysSince).toBe(2)
    // Triceps only rides on bench, so it is still cold.
    expect(triceps?.daysSince).toBe(63)
  })

  it('catches an area gone cold while its neighbours stay fresh', () => {
    // The case the per-movement view cannot see: plenty of pressing, but every
    // choice happens to skip the rear delts.
    const movements = [
      movement('m1', 'Bench', ['chest']),
      movement('m2', 'Overhead press', ['front_delts']),
      movement('m3', 'Face pull', ['rear_delts']),
    ]
    const sessions = [
      session('2026-08-02', ['m1', 'm2']),
      session('2026-07-28', ['m1', 'm2']),
      session('2026-06-15', ['m3']),
    ]

    const ranked = areaStaleness(movements, sessions, TODAY).filter((a) => a.movementCount > 0)

    expect(ranked[0].area.id).toBe('rear_delts')
    expect(ranked[0].level).toBe('stale')
  })

  it('sorts areas nothing in the library covers below everything trainable', () => {
    // "Never done" and "nothing can train this" are different problems, and
    // the second must not monopolise the top of the list forever.
    const movements = [movement('m1', 'Bench', ['chest'])]
    const sessions = [session('2026-05-01', ['m1'])]

    const ranked = areaStaleness(movements, sessions, TODAY)

    expect(ranked[0].area.id).toBe('chest')
    expect(ranked.at(-1)?.movementCount).toBe(0)
    expect(ranked.findIndex((a) => a.movementCount === 0)).toBe(1)
  })

  it('counts how many movements cover an area, including uncovered ones', () => {
    const movements = [movement('m1', 'Bench', ['chest'])]
    const ranked = areaStaleness(movements, [], TODAY)

    expect(ranked.find((a) => a.area.id === 'chest')?.movementCount).toBe(1)
    expect(ranked.find((a) => a.area.id === 'calves')?.movementCount).toBe(0)
  })
})

describe('forSplit', () => {
  it('keeps movements with no split recorded, so nothing silently disappears', () => {
    const items = movementStaleness(
      [movement('m1', 'Push thing', [], ['push']), movement('m2', 'Unassigned', [], [])],
      [],
      TODAY,
    )

    expect(forSplit(items, 'push').map((i) => i.movement.id).sort()).toEqual(['m1', 'm2'])
    expect(forSplit(items, 'legs').map((i) => i.movement.id)).toEqual(['m2'])
  })
})
