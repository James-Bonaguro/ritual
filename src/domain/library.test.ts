import { describe, expect, it } from 'vitest'
import { movementsToSeed, SEED_LIBRARY } from './library'
import { movement } from './testing'

describe('SEED_LIBRARY', () => {
  it('covers all three split days', () => {
    for (const split of ['push', 'pull', 'legs'] as const) {
      expect(SEED_LIBRARY.some((m) => m.splits.includes(split))).toBe(true)
    }
  })

  it('has no duplicate names', () => {
    const names = SEED_LIBRARY.map((m) => m.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('assigns at least one area to every movement, so the picker is never needed', () => {
    const untagged = SEED_LIBRARY.filter((m) => m.areas.length === 0)
    expect(untagged).toEqual([])
  })

  it('includes the movements that were painful to type by hand', () => {
    const names = SEED_LIBRARY.map((m) => m.name)
    expect(names).toContain('Farmer Carries')
    expect(names).toContain('Cable Fly')
    expect(names).toContain('Incline Dumbbell Press')
  })
})

describe('movementsToSeed', () => {
  it('returns everything when the library is empty', () => {
    expect(movementsToSeed([])).toHaveLength(SEED_LIBRARY.length)
  })

  it('numbers movements by their position in the file, not the missing subset', () => {
    // Ordering is what decides the list on day one, when nothing is logged and
    // staleness can't break the tie. It must survive partial seeding.
    const existing = [movement('m1', 'Flat Barbell Bench Press')]
    const result = movementsToSeed(existing)

    const incline = result.find((m) => m.name === 'Incline Dumbbell Press')
    expect(incline?.order).toBe(SEED_LIBRARY.findIndex((m) => m.name === 'Incline Dumbbell Press'))
  })

  it('puts compound work ahead of core in the seed order', () => {
    const order = (name: string) => SEED_LIBRARY.findIndex((m) => m.name === name)
    expect(order('Flat Barbell Bench Press')).toBeLessThan(order('Cable Crunch'))
    expect(order('Back Squat')).toBeLessThan(order('Plank'))
  })

  it('is idempotent — a second pass adds nothing', () => {
    const seeded = SEED_LIBRARY.map((s, i) => movement(`m${i}`, s.name))
    expect(movementsToSeed(seeded)).toEqual([])
  })

  it('skips names the user already has, regardless of casing or padding', () => {
    const existing = [movement('m1', '  cable FLY  ')]
    const names = movementsToSeed(existing).map((m) => m.name)

    expect(names).not.toContain('Cable Fly')
    // Everything else still comes through.
    expect(names).toHaveLength(SEED_LIBRARY.length - 1)
  })

  it('leaves movements the user invented untouched', () => {
    const existing = [movement('m1', 'Sled Push')]
    const result = movementsToSeed(existing)

    expect(result.map((m) => m.name)).not.toContain('Sled Push')
    expect(result).toHaveLength(SEED_LIBRARY.length)
  })
})
