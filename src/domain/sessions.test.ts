import { describe, expect, it } from 'vitest'
import { buildFlow, DEFAULT_VISIT_TEMPLATE } from './flow'
import { createSession, hasProgress, markLogged, sessionTitle, summarise } from './sessions'
import { movement, session } from './testing'

describe('buildFlow', () => {
  it('prefills the visit in the order it actually happens', () => {
    const flow = buildFlow(DEFAULT_VISIT_TEMPLATE)

    expect(flow.map((s) => s.kind)).toEqual([
      'massage_bed',
      'vibration_plate',
      'lift',
      'hot_tub',
      'steam_room',
      'sauna',
      'cold_pool',
      'cold_shower',
    ])
  })

  it('has no separate stretch step — the vibration plate is the stretch', () => {
    expect(buildFlow(DEFAULT_VISIT_TEMPLATE).map((s) => s.kind)).not.toContain('stretch')
  })

  it('starts every step unticked', () => {
    expect(buildFlow(DEFAULT_VISIT_TEMPLATE).every((s) => !s.done)).toBe(true)
  })

  it('offers all four heat and cold options, since which one varies by day', () => {
    const kinds = buildFlow(DEFAULT_VISIT_TEMPLATE).map((s) => s.kind)
    expect(kinds).toContain('hot_tub')
    expect(kinds).toContain('steam_room')
    expect(kinds).toContain('sauna')
    expect(kinds).toContain('cold_pool')
  })

  it('gives each step a distinct id even when kinds repeat', () => {
    const flow = buildFlow([
      { kind: 'stretch', label: 'Stretch' },
      { kind: 'stretch', label: 'Stretch again' },
    ])
    expect(new Set(flow.map((s) => s.id)).size).toBe(2)
  })
})

describe('createSession', () => {
  it('opens as a planned session with the usual visit already laid out', () => {
    const created = createSession({ date: '2026-08-04' })

    expect(created.status).toBe('planned')
    expect(created.movements).toEqual([])
    expect(created.flow.length).toBe(DEFAULT_VISIT_TEMPLATE.length)
  })

  it('honours a trimmed-down personal template', () => {
    const created = createSession({
      date: '2026-08-04',
      template: [
        { kind: 'stretch', label: 'Stretch' },
        { kind: 'lift', label: 'Lift' },
      ],
    })

    expect(created.flow.map((s) => s.kind)).toEqual(['stretch', 'lift'])
  })
})

describe('markLogged', () => {
  it('drops movements that were planned but not done, rather than recording misses', () => {
    const planned = session('2026-08-03', ['m1'], { planned: ['m2', 'm3'] })

    const logged = markLogged(planned)

    expect(logged.status).toBe('logged')
    expect(logged.movements.map((m) => m.movementId)).toEqual(['m1'])
  })

  it('keeps a session with nothing done rather than erroring', () => {
    const logged = markLogged(session('2026-08-03', [], { planned: ['m1'] }))
    expect(logged.movements).toEqual([])
    expect(logged.status).toBe('logged')
  })
})

describe('hasProgress', () => {
  it('is false for an untouched plan and true once anything is ticked', () => {
    const fresh = createSession({ date: '2026-08-04' })
    expect(hasProgress(fresh)).toBe(false)

    const started = { ...fresh, flow: fresh.flow.map((s, i) => (i === 0 ? { ...s, done: true } : s)) }
    expect(hasProgress(started)).toBe(true)
  })
})

describe('sessionTitle', () => {
  it('names the day after the split', () => {
    expect(sessionTitle(session('2026-08-03', [], { splitType: 'push' }))).toBe('Push day')
    expect(sessionTitle(session('2026-08-03', [], { splitType: 'legs' }))).toBe('Legs day')
  })

  it('falls back to a neutral title when no split is chosen', () => {
    expect(sessionTitle(session('2026-08-03', []))).toBe('Session')
    expect(sessionTitle(session('2026-08-03', [], { splitType: 'other' }))).toBe('Session')
  })
})

describe('summarise', () => {
  const library = new Map([
    ['m1', movement('m1', 'Bench')],
    ['m2', movement('m2', 'Dips')],
    ['m3', movement('m3', 'Flyes')],
    ['m4', movement('m4', 'Pushdowns')],
  ])

  it('lists the movements done', () => {
    expect(summarise(session('2026-08-03', ['m1', 'm2']), library)).toBe('Bench · Dips')
  })

  it('truncates a long list with a count', () => {
    expect(summarise(session('2026-08-03', ['m1', 'm2', 'm3', 'm4']), library)).toBe(
      'Bench · Dips · Flyes +1',
    )
  })

  it('falls back to counting flow steps when only recovery happened', () => {
    const recoveryOnly = {
      ...session('2026-08-03', []),
      flow: buildFlow(DEFAULT_VISIT_TEMPLATE).map((s, i) => (i < 2 ? { ...s, done: true } : s)),
    }
    expect(summarise(recoveryOnly, library)).toBe('2 things logged')
  })
})
